#include "Stream.h"
#include "hlsclass.h"
#include "spliceclass.hpp"
#include "transmitmedia.hpp"
#include "DynamicBufferManager.h"
#include "log.hpp"
#include <algorithm>
#include <signal.h>
#include <thread>
#include <boost/filesystem.hpp>

namespace fs = boost::filesystem;

#define __LOCK_BUFFER__

#define DATA_DIR "data/"
#define BUFFER_SIZE 1316

// Streaming variables
PacketQueue video_packet_queue;
PacketQueue audio_packet_queue;

AVFormatContext *ofmt_ctx = NULL;
AVDictionary *opts = NULL;
AVCodecID audio_codec_id = AVCodecID::AV_CODEC_ID_NONE,
          video_codec_id = AVCodecID::AV_CODEC_ID_NONE;

int audio_stream_index = -1, video_stream_index = -1, data_stream_index = -1,
    input_audio_stream_index = -1, input_video_stream_index = -1;
bool audio_stream_finished = false, video_stream_finished = false, out_header_writed = false;
bool no_video = false, no_audio = false;
int has_externalAudio = -1;

int64_t start_time = 0;
AVRational audio_timebase, video_timebase;

pthread_mutex_t streaming_context_lock;
pthread_mutex_t audio_streaming_buffer_lock;
pthread_mutex_t video_streaming_buffer_lock;

// SRT Streaming Packet List
std::vector<MediaPacket *> srt_packet_list;
char target_path[128];
bool target_connected = false;

// Buffer Mutext Lock
pthread_mutex_t srt_buffer_lock;

struct FILE_INFO
{
    std::string filename;
    bool isAD;
};
std::vector<FILE_INFO> fileinfo_queue;

enum APP_STATUS
{
    PARSING_STARTED = 0,
    PARSING_FINISHED,
    DEMUX_FINISHED
};

APP_STATUS v_status = PARSING_STARTED, a_status = PARSING_STARTED;
std::vector<uint8_t> init_a_mp4, init_v_mp4;
string init_a_file, init_v_file;
pthread_t v_pid = -1, a_pid = -1, s_pid = -1, demux_a_pid = -1, demux_v_pid = -1;

struct StreamContext
{
    int64_t start_dts = 0;
    int64_t prev_pts = 0;
    int64_t prev_dts = 0;
    int64_t last_pts = 0;
    int64_t last_dts = 0;
    int64_t first_last_dts = 0; // last dts of the previous content
    int64_t dts_offset = 0;
    int64_t duration = 0;
};

StreamContext video_ctx, audio_ctx;

CHLSInfo *g_pHLSInfo = NULL;
DynamicBufferManager *g_bufferManager = nullptr;
string downloadDir;

void insertSCTE35Packet(const char *hexString, AVPacket &pkt);
void *SRTBroadCastingThread(void *arg);
bool segmentation(AVMediaType AV_Type, const string& m3u8Url, M3U8Info& m3u8Info);
/* -----------------------------------------------------------------------------------
 */

void freeStream()
{
    if (!ofmt_ctx)
        return;
    /*	for (int i = 0; i< ofmt_ctx->nb_streams; i++){
            AVCodecContext *codec_ctx = ofmt_ctx->streams[i]->codec;
            avcodec_free_context(&codec_ctx);
        }
    */
    avformat_close_input(&ofmt_ctx);
    avformat_free_context(ofmt_ctx);
    ofmt_ctx = NULL;

    packet_queue_free(&video_packet_queue);
    packet_queue_free(&audio_packet_queue);
}

int writePacket(void *opaque, const uint8_t *buf, int buf_size)
{
    if (target_connected == false)
        return buf_size;
        
    MediaPacket *pkt = new MediaPacket(buf_size);
    if (!pkt) {
        LOG_ERROR("Failed to allocate MediaPacket for size: ", buf_size);
        return -1;
    }
    
    memcpy(pkt->payload.data(), buf, buf_size);

    pthread_mutex_lock(&srt_buffer_lock);
    srt_packet_list.push_back(pkt);
    size_t queue_size = srt_packet_list.size();
    pthread_mutex_unlock(&srt_buffer_lock);

    if (queue_size % 100 == 0) { // Log every 100 packets to avoid spam
        LOG_DEBUG("SRT packet queue size: ", queue_size, ", packet size: ", buf_size);
    }

    return buf_size;
}

bool initStream()
{
    LOG_INFO("Initializing stream context with buffer size: ", BUFFER_SIZE);
    
    uint8_t *avio_ctx_buffer = (uint8_t *)av_malloc(BUFFER_SIZE);
    if (!avio_ctx_buffer)
    {
        LOG_ERROR("Failed to allocate AVIO context buffer");
        return false;
    }

    AVIOContext *avio_ctx = avio_alloc_context(avio_ctx_buffer, BUFFER_SIZE, 1,
                                               NULL, NULL, writePacket, NULL);
    if (!avio_ctx)
    {
        LOG_ERROR("Failed to allocate AVIO context");
        av_free(avio_ctx_buffer);
        return false;
    }
    ofmt_ctx = avformat_alloc_context();

    if (!ofmt_ctx)
    {
        LOG_ERROR("Failed to allocate output format context");
        avio_context_free(&avio_ctx);
        return false;
    }
    ofmt_ctx->pb = avio_ctx;

    const AVOutputFormat *output_format = av_guess_format("mpegts", NULL, NULL);
    if (!output_format)
    {
        LOG_ERROR("Could not find MPEG-TS output format");
        avio_context_free(&avio_ctx);
        avformat_free_context(ofmt_ctx);
        return false;
    }
    ofmt_ctx->oformat = output_format;

    // create out streams for audio, video and data
    AVStream *out_video_stream = avformat_new_stream(ofmt_ctx, NULL);
    video_stream_index = out_video_stream->index;
    LOG_INFO("Created video stream with index: ", video_stream_index);

    AVStream *out_audio_stream = avformat_new_stream(ofmt_ctx, NULL);
    audio_stream_index = out_audio_stream->index;
    LOG_INFO("Created audio stream with index: ", audio_stream_index);

    AVStream *out_data_stream = avformat_new_stream(ofmt_ctx, NULL);
    out_data_stream->codecpar->codec_id = AV_CODEC_ID_SCTE_35;
    out_data_stream->codecpar->codec_tag = 0;
    data_stream_index = out_data_stream->index;
    LOG_INFO("Created SCTE-35 data stream with index: ", data_stream_index);

    LOG_INFO("Stream context initialization completed successfully");
    return true;
}

void *SRTBroadCastingThread(void *arg);

void UpdateLastDTS(AVPacket &pkt)
{
    if (audio_ctx.prev_dts == 0 || video_ctx.prev_dts == 0)
        return;

    bool isUpdateNeeded = false;
    if (pkt.stream_index == video_stream_index)
    {
        if (video_ctx.first_last_dts != video_ctx.last_dts)
        {
            isUpdateNeeded = true;
        }
    }
    else if (pkt.stream_index == audio_stream_index)
    {
        if (audio_ctx.first_last_dts != audio_ctx.last_dts)
        {
            isUpdateNeeded = true;
        }
    }

    if (isUpdateNeeded)
    {
        int64_t a_duration = av_rescale_q(audio_ctx.last_dts - audio_ctx.start_dts, audio_timebase, {1, AV_TIME_BASE});
        int64_t v_duration = av_rescale_q(video_ctx.last_dts - video_ctx.start_dts, video_timebase, {1, AV_TIME_BASE});

        if (a_duration < v_duration)
        {
            audio_ctx.last_dts = audio_ctx.start_dts + av_rescale(v_duration, audio_timebase.den, audio_timebase.num * AV_TIME_BASE);
        }
        else
        {
            video_ctx.last_dts = video_ctx.start_dts + av_rescale(a_duration, video_timebase.den, video_timebase.num * AV_TIME_BASE);
        }
    }

    if (isUpdateNeeded)
    {
        video_ctx.first_last_dts = video_ctx.last_dts;
        audio_ctx.first_last_dts = audio_ctx.last_dts;
    }

    return;
}

bool UpdatePacket(AVPacket &pkt, StreamContext &ctx)
{
    // validate packet
    if (pkt.pts < 0 || pkt.dts < 0 || pkt.pts < pkt.dts)
    {
        av_packet_unref(&pkt);
        return false;
    }

    if (pkt.pts == AV_NOPTS_VALUE || pkt.dts == AV_NOPTS_VALUE)
    {
        if (ctx.prev_dts == 0 || ctx.duration == 0)
        {
            av_packet_unref(&pkt);
            return false;
        }

        pkt.pts = ctx.prev_pts + ctx.duration;
        pkt.dts = ctx.prev_dts + ctx.duration;
    }

    // check a new content
    bool isNewContent = false;
    if (ctx.duration > 0 && ctx.prev_dts > 0) {
        if (pkt.dts <= ctx.prev_dts)
            isNewContent = true;
    }

    if (isNewContent)
    {
        // update last packet dts when a first packet is coming
        UpdateLastDTS(pkt);

        // calc offset between a last dts in previous content and a first dts in a new content
        if (ctx.last_dts > 0 && ctx.duration > 0)
        {
            ctx.dts_offset = (ctx.last_dts - pkt.dts) + ctx.duration;
        }
    }

    // store previous pts and dts
    ctx.prev_pts = pkt.pts;
    ctx.prev_dts = pkt.dts;

    // calc new ptd and dts
    pkt.pts = pkt.pts + ctx.dts_offset;
    pkt.dts = pkt.dts + ctx.dts_offset;

    // store last dts
    ctx.last_pts = pkt.pts;
    ctx.last_dts = pkt.dts;

    if (pkt.duration != 0)
        ctx.duration = pkt.duration;

    return true;
}

bool queuePackets(AVFormatContext* infmt_ctx, AVMediaType AV_Type, const char* adData = NULL)
{
    // find first channel for audio & video
    bool audio_param_copied = false, video_param_copied = false;

    for (unsigned int i = 0; i < infmt_ctx->nb_streams; i ++) {
        AVStream* in_stream = infmt_ctx->streams[i];
        if (!in_stream || !in_stream->codecpar) {
            continue;
        }
        
        if (in_stream->codecpar->codec_type == AVMEDIA_TYPE_VIDEO) 
        {
            if (!video_param_copied) {
                if (video_codec_id == AVCodecID::AV_CODEC_ID_NONE) {
                    pthread_mutex_lock(&streaming_context_lock);
                    if (avcodec_parameters_copy(ofmt_ctx->streams[video_stream_index]->codecpar, in_stream->codecpar) < 0) {
                        pthread_mutex_unlock(&streaming_context_lock);
                        LOG_ERROR("Failed to copy Video codec parameters!");

                        avformat_close_input(&infmt_ctx);
                        return false;
                    }
                    pthread_mutex_unlock(&streaming_context_lock);

                    video_codec_id = in_stream->codecpar->codec_id;
                    input_video_stream_index = in_stream->index;
                    video_timebase = in_stream->time_base;
                    LOG_INFO("Video stream parameters copied - index: ", input_video_stream_index, ", codec: ", avcodec_get_name(video_codec_id));

                    video_param_copied = true;
                } else {
                    if (in_stream->codecpar->codec_id == video_codec_id) {
                        input_video_stream_index = in_stream->index;
                        video_timebase = in_stream->time_base;

                        video_param_copied = true;
                    }
                }
            }
        }
        else if (in_stream->codecpar->codec_type == AVMEDIA_TYPE_AUDIO) 
        {
            if (in_stream->codecpar->ch_layout.nb_channels <= 0)
            {
                LOG_WARN("Audio stream has 0 channels. Ignoring.");
                continue;
            }

            if (!audio_param_copied) {
                if (audio_codec_id == AVCodecID::AV_CODEC_ID_NONE) {
                    pthread_mutex_lock(&streaming_context_lock);
                    if (avcodec_parameters_copy(ofmt_ctx->streams[audio_stream_index]->codecpar, in_stream->codecpar) < 0) {
                        pthread_mutex_unlock(&streaming_context_lock);
                        LOG_ERROR("Failed to copy Audio codec parameters!");

                        avformat_close_input(&infmt_ctx);
                        return false;
                    }
                    pthread_mutex_unlock(&streaming_context_lock);

                    audio_codec_id = in_stream->codecpar->codec_id;
                    input_audio_stream_index = in_stream->index;
                    audio_timebase = in_stream->time_base;
                    LOG_INFO("Audio stream parameters copied - index: ", input_audio_stream_index, ", codec: ", avcodec_get_name(audio_codec_id));

                    audio_param_copied = true;
                } else {
                    if (in_stream->codecpar->codec_id == audio_codec_id) {
                        input_audio_stream_index = in_stream->index;
                        audio_timebase = in_stream->time_base;

                        audio_param_copied = true;
                    }
                }         
            }
        }
    }

    if (AV_Type == AVMEDIA_TYPE_AUDIO && has_externalAudio && !audio_param_copied) {
        LOG_ERROR("Not copied audio params!");
        avformat_close_input(&infmt_ctx);
        return false;
    }

    if (has_externalAudio == 0) {
        if (AV_Type == AVMEDIA_TYPE_VIDEO) {
            no_video = (input_video_stream_index < 0);
            no_audio = (input_audio_stream_index < 0);
        }
    } else if (has_externalAudio == 1) {
        if (AV_Type == AVMEDIA_TYPE_VIDEO) {
            no_video = (input_video_stream_index < 0);
        } else if (AV_Type == AVMEDIA_TYPE_AUDIO) {
            no_audio = (input_audio_stream_index < 0);
        }
    }

    int video_pkt_count = 0, audio_pkt_count = 0;
    AVPacket pkt;

    bool isFirstPacket = true;
    for (;;)
    {
        if (av_read_frame(infmt_ctx, &pkt) < 0)
            break;

        if (has_externalAudio == 1) {
            if (AV_Type == AVMEDIA_TYPE_AUDIO)
            {
                if (pkt.stream_index == input_audio_stream_index)
                {
                    pkt.stream_index = audio_stream_index;

                    if (!UpdatePacket(pkt, audio_ctx)) {
                        usleep(1000);
                        continue;
                    }

                    pthread_mutex_lock(&audio_streaming_buffer_lock);
                    packet_queue_push(&audio_packet_queue, &pkt);
                    pthread_mutex_unlock(&audio_streaming_buffer_lock);

                    audio_pkt_count ++;
                }
                else {
                    av_packet_unref(&pkt);
                }
            }
            else if (AV_Type == AVMEDIA_TYPE_VIDEO)
            {
                if (pkt.stream_index == input_video_stream_index)
                {
                    pkt.stream_index = video_stream_index;

                    if (!UpdatePacket(pkt, video_ctx)) {
                        usleep(1000);
                        continue;
                    }

                    if (isFirstPacket && adData)
                    {
                        pkt.opaque = new char[strlen(adData) + 1];  // +1 for the null terminator
                        std::memset(pkt.opaque, 0, strlen(adData) + 1);
                        std::memcpy(pkt.opaque, adData, strlen(adData));
                        isFirstPacket = false;
                    }

                    pthread_mutex_lock(&video_streaming_buffer_lock);
                    packet_queue_push(&video_packet_queue, &pkt);
                    pthread_mutex_unlock(&video_streaming_buffer_lock);

                    video_pkt_count ++;
                }
                else {
                    av_packet_unref(&pkt);
                }
            }
            else {
                av_packet_unref(&pkt);
            }
        } else {
            if (pkt.stream_index == input_audio_stream_index)
            {
                pkt.stream_index = audio_stream_index;

                // printf("- original audio: pts = %lu, dts = %lu, duration = %lu, audio_packet_queue = %d, dts_offset = %" PRId64 "\n", pkt.pts, pkt.dts, pkt.duration, audio_packet_queue.size, audio_ctx.dts_offset);
                if (!UpdatePacket(pkt, audio_ctx)) {
                    usleep(1000);
                    continue;
                }

                pthread_mutex_lock(&audio_streaming_buffer_lock);
                packet_queue_push(&audio_packet_queue, &pkt);
                pthread_mutex_unlock(&audio_streaming_buffer_lock);

                audio_pkt_count ++;
            }
            else if (pkt.stream_index == input_video_stream_index)
            {
                pkt.stream_index = video_stream_index;

                // printf("+ original video: pts = %lu, dts = %lu, duration = %lu, video_packet_queue = %d, dts_offset = %" PRId64 "\n", pkt.pts, pkt.dts, pkt.duration, video_packet_queue.size, video_ctx.dts_offset);
                if (!UpdatePacket(pkt, video_ctx)) {
                    usleep(1000);
                    continue;
                }

                if (isFirstPacket && adData)
                {
                    pkt.opaque = new char[strlen(adData) + 1];  // +1 for the null terminator
                    std::memset(pkt.opaque, 0, strlen(adData) + 1);
                    std::memcpy(pkt.opaque, adData, strlen(adData));
                    isFirstPacket = false;
                }

                pthread_mutex_lock(&video_streaming_buffer_lock);
                packet_queue_push(&video_packet_queue, &pkt);
                pthread_mutex_unlock(&video_streaming_buffer_lock);

                video_pkt_count ++;
            }
            else {
                av_packet_unref(&pkt);
            }
        }
        
        usleep(1000);
    }

    if (video_pkt_count > 0) {
        g_bufferManager->storePktCount(AVMEDIA_TYPE_VIDEO, video_pkt_count);
    }

    if (audio_pkt_count > 0) {
        g_bufferManager->storePktCount(AVMEDIA_TYPE_AUDIO, audio_pkt_count);
    }

    return true;
}

bool DemuxData(const char* filename, AVMediaType AV_Type, const char* adData = NULL)
{
    AVFormatContext* infmt_ctx = nullptr;
    
    // Open input file
    if (avformat_open_input(&infmt_ctx, filename, nullptr, nullptr) < 0) {
        LOG_ERROR("Cannot open file: ", filename);
        return false;
    }

    // Read stream info
    if (avformat_find_stream_info(infmt_ctx, nullptr) < 0) {
        LOG_ERROR("Cannot find stream info: ", filename);
        avformat_close_input(&infmt_ctx);
        return false;
    }
    
    LOG_INFO("Found ", infmt_ctx->nb_streams, " streams in file: ", filename);

    bool res = queuePackets(infmt_ctx, AV_Type, adData);
    avformat_close_input(&infmt_ctx);
    return res;
}

bool DemuxData(RawBuffer buffer, AVMediaType AV_Type, const char* adData = NULL)
{
    AVFormatContext* infmt_ctx = nullptr;
    AVIOContext *avio_ctx = NULL;

    uint8_t *avio_ctx_buffer = NULL;
    size_t avio_ctx_buffer_size = 4096;

    infmt_ctx = avformat_alloc_context();
    avio_ctx_buffer = (uint8_t *)av_malloc(avio_ctx_buffer_size);

    avio_ctx = avio_alloc_context(avio_ctx_buffer, avio_ctx_buffer_size, 0, &buffer, &Read_Packet, NULL, NULL);
    infmt_ctx->pb = avio_ctx;
    
    // Open input file
    if (avformat_open_input(&infmt_ctx, nullptr, nullptr, nullptr) < 0) {
        LOG_ERROR("Cannot open input in Demux");
        return false;
    }

    // Read stream info
    if (avformat_find_stream_info(infmt_ctx, nullptr) < 0) {
        LOG_ERROR("Could not find stream information in Demux");
        avformat_close_input(&infmt_ctx);
        return false;
    }

    bool res = queuePackets(infmt_ctx, AV_Type, adData);
    avformat_close_input(&infmt_ctx);

    if (avio_ctx)
        av_freep(&avio_ctx->buffer);

    avio_context_free(&avio_ctx);
    
    return res;
}

bool loadFileAndDemux(const std::string &filename, AVMediaType AV_Type, const char* adData = NULL)
{
    bool res = false;

    // Open the file as binary
    std::ifstream file(filename, std::ios::binary);

    // Error checking
    if (!file.is_open())
    {
        LOG_ERROR("Failed to open a file for Demux: ", !filename.empty() ? filename.c_str() : "N/A");
        return false;
    }

    std::string extension = getFileExtension(filename);
    if (extension == "mp4") {        
        res = DemuxData(filename.data(), AV_Type, adData);
    } else {
        // Determine file size
        file.seekg(0, std::ios::end);
        std::streampos fileSize = file.tellg();
        file.seekg(0, std::ios::beg);

        // Create a buffer to hold the file content
        std::vector<uint8_t> buffer(fileSize);

        // Read the file into the buffer
        file.read(reinterpret_cast<char*>(buffer.data()), fileSize);
        file.close();

        // Initialize RawBuffer
        RawBuffer rawBuffer;
        rawBuffer.data = buffer.data();
        rawBuffer.size = static_cast<int>(fileSize);
        rawBuffer.position = 0;

        // Call DemuxData with the buffer's data
        //printf("step1 %d \n", rawBuffer.size);
        res = DemuxData(rawBuffer, AV_Type, adData);
    }

    return res;
}

void SyncTime(AVPacket &pkt, StreamContext &ctx, AVRational timebase)
{
    if (ctx.start_dts == 0)
    {
        // set a start time of first content
        if (pkt.stream_index == video_stream_index)
        {
            start_time = av_gettime();
        }

        // set start dts
        ctx.start_dts = pkt.dts;
    }

    // sync between video/audio and current time
    int64_t current_time = av_gettime();
    int64_t elapsed_time = current_time - start_time;
    int64_t packet_time =
        av_rescale_q((pkt.dts - ctx.start_dts), timebase, {1, AV_TIME_BASE});

    if (packet_time > elapsed_time)
    {
        usleep(packet_time - elapsed_time);
    }
    else
    {
        usleep(1000);
    }
}

void *VStreamingThread(void *arg)
{
    LOG_INFO("[VStreamingThread] Video streaming thread started");
    
    while (input_audio_stream_index < 0 || input_video_stream_index < 0)
    {
        if (no_video)
        {
            video_stream_finished = true;
            LOG_INFO("[VStreamingThread] No video stream available, stopping thread");
            return NULL;
        }

        if (no_audio ||
            (input_video_stream_index >= 0 && a_status == DEMUX_FINISHED))
        {
            LOG_INFO("[VStreamingThread] No audio stream available, breaking");
            break;
        }

        if (v_status == DEMUX_FINISHED)
        {
            video_stream_finished = true;
            LOG_INFO("[VStreamingThread] Video demux finished, stopping thread");
            return NULL;
        }

        usleep(10000);
    }

    pthread_mutex_lock(&streaming_context_lock);
    if (!out_header_writed)
    {
        if (avformat_write_header(ofmt_ctx, &opts) < 0)
        {
            pthread_mutex_unlock(&streaming_context_lock);

            video_stream_finished = true;
            LOG_ERROR("[VStreamingThread] Failed to write header");
            return NULL;
        }

        out_header_writed = true;
        LOG_INFO("[VStreamingThread] Output header written successfully");
    }
    pthread_mutex_unlock(&streaming_context_lock);

    LOG_INFO("[VStreamingThread] Video streaming thread started successfully");

    for (;;)
    {
        AVPacket pkt;

        pthread_mutex_lock(&video_streaming_buffer_lock);
        if (video_packet_queue.size <= 0)
        {
            pthread_mutex_unlock(&video_streaming_buffer_lock);

            if (v_status == DEMUX_FINISHED)
            {
                LOG_INFO("[VStreamingThread] Video Demux is finished.");
                break;
            }

            usleep(1000);
            continue;
        }
        packet_queue_pop(&video_packet_queue, &pkt);
        pthread_mutex_unlock(&video_streaming_buffer_lock);

        SyncTime(pkt, video_ctx, video_timebase);
        // printf("+ video: pts = %" PRId64 ", dts = %" PRId64 ", duration = %"
        // PRId64 ", dts_offset = %" PRId64 ", video_packet_queue = %d\n", pkt.pts,
        // pkt.dts, pkt.duration, video_ctx.dts_offset, video_packet_queue.size);

        if (pkt.opaque)
        {
            insertSCTE35Packet((const char*)pkt.opaque, pkt);

            delete [] static_cast<char*>(pkt.opaque);
            pkt.opaque = NULL;
        }

        pthread_mutex_lock(&streaming_context_lock);
        if (av_interleaved_write_frame(ofmt_ctx, &pkt) < 0)
        {
            pthread_mutex_unlock(&streaming_context_lock);
            LOG_ERROR("[VStreamingThread] Writing Frame Error!");

            break;
        }
        pthread_mutex_unlock(&streaming_context_lock);

        av_packet_unref(&pkt);
    }

    video_stream_finished = true;
    LOG_INFO("[VStreamingThread] Video streaming thread stopped");
    return NULL;
}

void *AStreamingThread(void *arg)
{
    LOG_INFO("[AStreamingThread] Audio streaming thread started");
    
    while (input_audio_stream_index < 0 || input_video_stream_index < 0)
    {
        if (no_audio)
        {
            audio_stream_finished = true;
            LOG_INFO("[AStreamingThread] No audio stream available, stopping thread");
            return NULL;
        }

        if (no_video ||
            (input_audio_stream_index >= 0 && v_status == DEMUX_FINISHED))
        {
            LOG_INFO("[AStreamingThread] No video stream available, breaking");
            break;
        }

        if ((has_externalAudio == 0 && v_status == DEMUX_FINISHED) ||
            (has_externalAudio == 1 && a_status == DEMUX_FINISHED))
        {
            audio_stream_finished = true;
            LOG_INFO("[AStreamingThread] Audio demux finished, stopping thread");
            return NULL;
        }

        usleep(10000);
    }

    pthread_mutex_lock(&streaming_context_lock);
    if (!out_header_writed)
    {
        if (avformat_write_header(ofmt_ctx, &opts) < 0)
        {
            pthread_mutex_unlock(&streaming_context_lock);

            audio_stream_finished = true;
            LOG_ERROR("[AStreamingThread] Failed to write header");
            return NULL;
        }

        out_header_writed = true;
    }
    pthread_mutex_unlock(&streaming_context_lock);

    LOG_INFO("[AStreamingThread] Audio streaming thread started successfully");

    for (;;)
    {
        AVPacket pkt;

        pthread_mutex_lock(&audio_streaming_buffer_lock);
        if (audio_packet_queue.size <= 0)
        {
            pthread_mutex_unlock(&audio_streaming_buffer_lock);

            if ((has_externalAudio == 0 && v_status == DEMUX_FINISHED) ||
                (has_externalAudio == 1 && a_status == DEMUX_FINISHED))
            {
                LOG_INFO("[AStreamingThread] Audio Demux is finished.");
                break;
            }

            usleep(1000);
            continue;
        }
        packet_queue_pop(&audio_packet_queue, &pkt);
        pthread_mutex_unlock(&audio_streaming_buffer_lock);

        SyncTime(pkt, audio_ctx, audio_timebase);
        // printf("- audio: pts = %" PRId64 ", dts = %" PRId64 ", duration = %"
        // PRId64 ", dts_offset = %" PRId64 ", audio_packet_queue = %d\n", pkt.pts,
        // pkt.dts, pkt.duration, audio_ctx.dts_offset, audio_packet_queue.size);

        pthread_mutex_lock(&streaming_context_lock);
        if (av_interleaved_write_frame(ofmt_ctx, &pkt) < 0)
        {
            pthread_mutex_unlock(&streaming_context_lock);
            LOG_ERROR("[AStreamingThread] Writing Frame Error!");

            break;
        }
        pthread_mutex_unlock(&streaming_context_lock);

        av_packet_unref(&pkt);
    }

    audio_stream_finished = true;
    LOG_INFO("[AStreamingThread] Audio streaming thread stopped");
    return NULL;
}

bool processM3U8(AVMediaType AV_Type, const string initUrl, SEGMENT &segment, string adData = "")
{
    // printf("segment.url: %s, isAD: %s, count: %d, video-queue: %d\n",  segment.url.data(), segment.isAD? "True": "False",  g_pHLSInfo->getNewSegmentCount(), video_packet_queue.size);
    //1. create SCTE35 Information if next segment is AD.
    string updated_adData;
    if (AV_Type == AVMEDIA_TYPE_VIDEO && !adData.empty())
    {
        LOG_INFO("Processing with SCTE-35 ad data: ", adData);

        scte35::CSpliceClass obj_splice;

        obj_splice.RemoveSpaces(adData);
        if (obj_splice.ParseHexa(adData))
        {
            // update scte35 with pts_duration(ts duration)
            int64_t scaled_duration = segment.duration * (video_timebase.den != 0? video_timebase.den : 90000);
            // printf("segment.duration = %f, scaled_duration = %d\n", segment.duration, scaled_duration);
            obj_splice.SetPTSAdjustment(scaled_duration);
            // printf("\norignal hex_data: %s", adData.data());
            updated_adData = obj_splice.GetHexaFromSInfoData();
            // printf("\nupdated hex_data: %s\n", updated_adData.data());
        }
        else
        {
            LOG_ERROR("Failed to parse Hex data of SCTE35");
        }
    }

    //2. download and demux
    string url = segment.url;
    if (url.empty()) {
        LOG_ERROR("Empty URL");
        return false;
    }

    std::string file_extension = initUrl.empty()? getFileExtension(url) : "mp4";

    std::string segment_filename, load_filename;
    if (AV_Type == AVMEDIA_TYPE_VIDEO) {
        segment_filename    = "v_segment." + file_extension;
        load_filename       = "v_output."  + file_extension;
    } else if (AV_Type == AVMEDIA_TYPE_AUDIO) {
        segment_filename    = "a_segment." + file_extension;
        load_filename       = "a_output."  + file_extension;
    }

    segment_filename = downloadDir + segment_filename;
    std::remove(segment_filename.data());
    if (!ReDownloadFile(url, segment_filename)) {
        LOG_ERROR("Failed to download: ", url);
        return false;
    }
    
    string downloadPath = segment_filename;
    if (isFileEmpty(downloadPath.data())) {
        LOG_WARN("Empty file after downloading ", url);
        return true;
    }

    if (!initUrl.empty()) {
        load_filename = downloadDir + load_filename;

        if (AV_Type == AVMEDIA_TYPE_VIDEO) {
            if (init_v_file.empty()) {   // if fMP4
                std::string init_filename = downloadDir + "v_init.mp4";

                if (!ReDownloadFile(initUrl, init_filename)) {
                    LOG_ERROR("Downloading Video-init-content Failed!");
                    return false;
                }

                init_v_file = init_filename;
            }

            addMergeInputStreams(init_v_file.data(), segment_filename.data(), load_filename.data());
        }
        else if (AV_Type == AVMEDIA_TYPE_AUDIO) {
            if (init_a_file.empty()) {   // if fMP4
                std::string init_filename = downloadDir + "a_init.mp4";

                if (!ReDownloadFile(initUrl, init_filename)) {
                    LOG_ERROR("Downloading Audio-init-content Failed!");
                    return false;
                }

                init_a_file = init_filename; 
            }

            addMergeInputStreams(init_a_file.data(), segment_filename.data(), load_filename.data());
        }

        std::remove(segment_filename.data());
        downloadPath = load_filename;
    }

    if (!loadFileAndDemux(downloadPath.data(), AV_Type, updated_adData.empty()? NULL: updated_adData.data())) {
        LOG_ERROR("Failed to demux: ", downloadPath.data());
        return false;
    }

    LOG_INFO("Completed to demux successfully ", url.data());
    return true;
}

void *DemuxVThread(void *arg)
{
    LOG_INFO("[DemuxVThread] Video demux thread started");
    
    int consecutive_failures = 0;
    const int MAX_CONSECUTIVE_FAILURES = 10; // Allow up to 10 consecutive failures before giving up

    for (;;)
    {
        if (!target_connected) {
            LOG_DEBUG("[DemuxVThread] Waiting for SRT connection...");
            usleep(1000000);
            continue;
        }

#ifdef __LOCK_BUFFER__
        pthread_mutex_lock(&video_streaming_buffer_lock);
        int bufferThreshold = g_bufferManager->getBufferThreshold(AVMEDIA_TYPE_VIDEO);
        if (video_packet_queue.size > bufferThreshold)
        {
            pthread_mutex_unlock(&video_streaming_buffer_lock);

            usleep(1000000);
            continue;
        } 
        else if (video_packet_queue.size == 0) 
        {
            LOG_INFO("Go to initial stage, because of no video packect");

            // init new segments and previous segments
            g_pHLSInfo->initNewSegments(AVMEDIA_TYPE_VIDEO);

            // parse m3u8 and get new segments
            if (g_pHLSInfo->m_bestStream.url.empty()) {
                pthread_mutex_unlock(&video_streaming_buffer_lock);
                LOG_ERROR("[DemuxVThread] No video stream available!");
                break;
            }

            M3U8Info v_m3u8Info{};
            if (!segmentation(AVMEDIA_TYPE_VIDEO, g_pHLSInfo->m_bestStream.url, v_m3u8Info)) {
                pthread_mutex_unlock(&video_streaming_buffer_lock);
                LOG_ERROR("[DemuxVThread] Failed to segment video!");
                break;
            }
            g_pHLSInfo->m_v_initUrl = v_m3u8Info.init_url;

            // test
            g_pHLSInfo->printM3U8(AVMEDIA_TYPE_VIDEO, v_m3u8Info);
        }
        pthread_mutex_unlock(&video_streaming_buffer_lock);
#endif // __LOCK_BUFFER__

        SEGMENT segment;
        string adData;
        if (!g_pHLSInfo->popSegment(AVMEDIA_TYPE_VIDEO, segment, adData))
        {
            if (v_status == PARSING_FINISHED)
            {
                LOG_INFO("[DemuxVThread] Video parsing finished");
                break;
            }

            usleep(1000);
            continue;
        }
        
        LOG_DEBUG("[DemuxVThread] Processing video segment: ", segment.url);

        if (!processM3U8(AVMEDIA_TYPE_VIDEO, g_pHLSInfo->m_v_initUrl, segment, adData)) {
            consecutive_failures++;
            LOG_WARN("[DemuxVThread] Failed to process video segment ", segment.url, " (", consecutive_failures, "/", MAX_CONSECUTIVE_FAILURES, " consecutive failures)");

            // If we've had too many consecutive failures, break the loop
            if (consecutive_failures >= MAX_CONSECUTIVE_FAILURES)
            {
                LOG_ERROR("[DemuxVThread] Too many consecutive video segment failures (", consecutive_failures, "), terminating thread");
                break;
            }

            // Add a delay before trying the next segment to avoid hammering the server
            usleep(1000); // 1ms delay
            continue;
        } else {
            // Reset the failure counter on success
            if (consecutive_failures > 0)
            {
                LOG_INFO("[DemuxVThread] Successfully processed video segment after ", consecutive_failures, " failures");
                consecutive_failures = 0;
            }
        }

        usleep(100000);
    }

    v_status = DEMUX_FINISHED;

    LOG_INFO("[DemuxVThread] Video demux thread finished");
    return NULL;
}

void *DemuxAThread(void *arg)
{
    LOG_INFO("[DemuxAThread] Audio demux thread started");
    
    int consecutive_failures = 0;
    const int MAX_CONSECUTIVE_FAILURES = 10; // Allow up to 10 consecutive failures before giving up

    for (;;)
    {
        if (!target_connected) {
            LOG_DEBUG("[DemuxAThread] Waiting for SRT connection...");
            usleep(1000000);
            continue;
        }

#ifdef __LOCK_BUFFER__
        pthread_mutex_lock(&audio_streaming_buffer_lock);
        int bufferThreshold = g_bufferManager->getBufferThreshold(AVMEDIA_TYPE_AUDIO);
        if (audio_packet_queue.size > bufferThreshold)
        {
            pthread_mutex_unlock(&audio_streaming_buffer_lock);

            usleep(1000000);
            continue;
        }
        else if (audio_packet_queue.size == 0) 
        {
            LOG_INFO("Go to initial stage, because of no audio packet");

            // init new segments and previous segments
            g_pHLSInfo->initNewSegments(AVMEDIA_TYPE_AUDIO);

            // parse m3u8 and get new segments
            if (g_pHLSInfo->m_audio.url.empty()) {
                pthread_mutex_unlock(&audio_streaming_buffer_lock);
                LOG_ERROR("[DemuxAThread] No audio stream available!");
                break;
            }

            M3U8Info a_m3u8Info{};
            if (!segmentation(AVMEDIA_TYPE_AUDIO, g_pHLSInfo->m_audio.url, a_m3u8Info)) {   
                pthread_mutex_unlock(&audio_streaming_buffer_lock);
                LOG_ERROR("[DemuxAThread] Failed to segment audio!");
                break;
            }
            g_pHLSInfo->m_a_initUrl = a_m3u8Info.init_url;

            // test
            g_pHLSInfo->printM3U8(AVMEDIA_TYPE_AUDIO, a_m3u8Info);
        }
        pthread_mutex_unlock(&audio_streaming_buffer_lock);
#endif // __LOCK_BUFFER__

        SEGMENT segment;
        string adData;
        if (!g_pHLSInfo->popSegment(AVMEDIA_TYPE_AUDIO, segment, adData))
        {
            if (a_status == PARSING_FINISHED)
            {
                LOG_INFO("[DemuxAThread] Audio parsing finished");
                break;
            }

            usleep(1000);
            continue;
        }
        
        LOG_DEBUG("[DemuxAThread] Processing audio segment: ", segment.url);

        if (!processM3U8(AVMEDIA_TYPE_AUDIO, g_pHLSInfo->m_a_initUrl, segment)){
            consecutive_failures++;
            LOG_WARN("[DemuxAThread] Failed to process audio segment ", segment.url, " (", consecutive_failures, "/", MAX_CONSECUTIVE_FAILURES, " consecutive failures)");

            // If we've had too many consecutive failures, break the loop
            if (consecutive_failures >= MAX_CONSECUTIVE_FAILURES)
            {
                LOG_ERROR("[DemuxAThread] Too many consecutive audio segment failures (", consecutive_failures, "), terminating thread");
                break;
            }

            // Add a delay before trying the next segment to avoid hammering the server
            usleep(1000); // 1ms delay
            continue;
        } else {
            // Reset the failure counter on success
            if (consecutive_failures > 0)
            {
                LOG_INFO("[DemuxAThread] Successfully processed audio segment after ", consecutive_failures, " failures");
                consecutive_failures = 0;
            }
        }

        usleep(100000);
    }

    a_status = DEMUX_FINISHED;

    LOG_INFO("[DemuxAThread] Audio demux thread finished");
    return NULL;
}

void *SRTBroadCastingThread(void *arg)
{
    LOG_INFO("[SRTBroadCastingThread] SRT broadcasting thread started");
    LOG_INFO("[SRTBroadCastingThread] Target path: ", target_path);
    
    unique_ptr<Target> tar;
    SRTSOCKET s = SRT_INVALID_SOCK;
    int pollid = srt_epoll_create();
    
    while (true)
    {
        if (audio_stream_finished && video_stream_finished)
        {
            LOG_INFO("[SRTBroadCastingThread] SRT broadcasting thread finished");
            break;
        }

        try
        {   
            if (!tar.get())
            {
                tar = Target::Create(target_path);
                if (!tar.get())
                {
                    LOG_ERROR("[SRTBroadCastingThread] Unsupported target type: ", target_path);
                    continue;
                }

                // IN because we care for state transitions only
                // OUT - to check the connection state changes
                int events = SRT_EPOLL_OUT | SRT_EPOLL_ERR;

                if (srt_epoll_add_usock(pollid, tar->GetSRTSocket(), &events))
                {
                    LOG_ERROR("[SRTBroadCastingThread] Failed to add SRT destination to poll");
                    continue;
                }    
            }
           
            s = tar->GetSRTSocket();
            SRTSOCKET efd;
            int efdlen = 1;
            if (srt_epoll_wait(pollid, 0, 0, &efd, &efdlen, 100, nullptr, nullptr, 0, 0) < 0)
            {
                continue;
            }

            SRT_SOCKSTATUS status = srt_getsockstate(s);
            switch (status)
            {
                case SRTS_LISTENING:
                {
                    if (!tar->AcceptNewClient())
                    {
                        LOG_ERROR("[SRTBroadCastingThread] Failed to accept SRT connection");
                        continue;
                    }

                    srt_epoll_remove_usock(pollid, s);

                    s = tar->GetSRTSocket();
                    int events = SRT_EPOLL_OUT | SRT_EPOLL_ERR;
                    if (srt_epoll_add_usock(pollid, s, &events))
                    {
                        LOG_ERROR("[SRTBroadCastingThread] Failed to add SRT client to poll");
                        continue;
                    }
                    LOG_INFO("[SRTBroadCastingThread] Target connected (listener): ", target_path);
                    target_connected = true;
                }
                break;
                case SRTS_CONNECTED:
                {
                    if (target_connected == false)
                    {
                        LOG_INFO("[SRTBroadCastingThread] Target connected (caller)");
                        target_connected = true;
                    }
                }
                break;
                case SRTS_BROKEN:
                case SRTS_NONEXIST:
                case SRTS_CLOSED:
                {
                    LOG_WARN("[SRTBroadCastingThread] Target disconnected, status: ", status);
                    tar->Close();
                    tar.reset();
                    srt_epoll_remove_usock(pollid, s);
                    //		    srt_epoll_release(pollid);
                    usleep(3000000);
                    continue;
                }
                default:
                    break;
            }

            if (target_connected == true)
            {
                while (true)
                {
                    if (audio_stream_finished && video_stream_finished)
                        break;

                    status = srt_getsockstate(tar->GetSRTSocket());
                    if (status != SRTS_CONNECTED)
                    {
                        LOG_ERROR("[SRTBroadCastingThread] Socket no longer connected, status: ", status);
                        tar->Close();
                        tar.reset();
                        srt_epoll_remove_usock(pollid, s);
                        target_connected = false;
                        break;
                    }

                    if (!srt_packet_list.empty())
                    {
                        pthread_mutex_lock(&srt_buffer_lock);
                        MediaPacket *srt_pkt = srt_packet_list.front();
                        size_t packet_size = srt_pkt->payload.size();
                        
                        tar->Write(srt_pkt->payload.data(), packet_size, 0, std::cout);
                        
                        srt_packet_list.erase(srt_packet_list.begin());
                        delete (srt_pkt);
                        pthread_mutex_unlock(&srt_buffer_lock);
                        
                        // Log packet transmission periodically
                        static int packet_count = 0;
                        if (++packet_count % 100 == 0) {
                            LOG_DEBUG("[SRTBroadCastingThread] Transmitted ", packet_count, " packets, last size: ", packet_size);
                        }
                    }

                    usleep(1000);
                }
            }
            usleep(10000000);
        }
        catch (TransmissionError &er)
        {
            LOG_ERROR("[SRTBroadCastingThread] Transmission error: ", er.what(), " - interrupting engine");
            std::cerr << er.what() << " - interrupting engine: ";
            usleep(100000);
            srt_epoll_release(pollid);
        }
    }
    srt_epoll_release(pollid);

    return NULL;
}

void insertSCTE35Packet(const char *hexString, AVPacket &pkt)
{
    LOG_INFO("Inserting SCTE-35 packet with hex data: ", hexString);
    size_t hexStringLength = strlen(hexString);

    // Skip the "0x" prefix if present
    size_t startIndex = (hexStringLength >= 2 && hexString[0] == '0' && hexString[1] == 'x') ? 2 : 0;
    size_t hexDigitsLength = (hexStringLength - startIndex) / 2;

    uint8_t *byteArray = (uint8_t *)malloc(hexDigitsLength);
    memset(byteArray, 0x00, hexDigitsLength);
    if (hexStringToByteArray(hexString, byteArray, hexDigitsLength) != 0)
    {
        LOG_ERROR("hexStringToByteArray Error for hex string: ", hexString);
        return;
    }

    // parse_scte35(byteArray, hexDigitsLength);

    // Insert AD packet
    AVPacket *scte35_pkt = new AVPacket();
    scte35_pkt->data = (uint8_t *)av_malloc(hexDigitsLength);
    memcpy(scte35_pkt->data, byteArray, hexDigitsLength);
    scte35_pkt->size = hexDigitsLength;
    scte35_pkt->stream_index = data_stream_index;
    scte35_pkt->pts = (pkt.pts == AV_NOPTS_VALUE) ? 0 : pkt.pts;
    scte35_pkt->dts = (pkt.dts == AV_NOPTS_VALUE) ? 0 : pkt.dts;
    scte35_pkt->duration = 0;

    LOG_DEBUG("SCTE-35 packet created - pts: ", scte35_pkt->pts, ", dts: ", scte35_pkt->dts, ", flags: ", scte35_pkt->flags);

    pthread_mutex_lock(&streaming_context_lock);
    int ret = av_write_frame(ofmt_ctx, scte35_pkt);
    if (ret < 0)
    {
        pthread_mutex_unlock(&streaming_context_lock);
        LOG_ERROR("Writing SCTE-35 packet failed with error: ", ret);
    } else {
        LOG_DEBUG("SCTE-35 packet written successfully");
    }
    pthread_mutex_unlock(&streaming_context_lock);

    av_packet_unref(scte35_pkt);
    free(byteArray);
}

bool segmentation(AVMediaType AV_Type, const string& m3u8Url, M3U8Info& m3u8Info)
{
    if (!g_pHLSInfo->parseM3U8(AV_Type, m3u8Url, m3u8Info)) {
        LOG_ERROR("Failed to parse m3u8: ", m3u8Url);
        return false;
    }

    g_pHLSInfo->getNewSegments(AV_Type, m3u8Info);

    return true;
}

void terminateApp()
{
    LOG_INFO("Starting application termination");
    
    freeStream();

    // Delete all channel data.
    removeFolder(downloadDir);

    // kill all threads
    if (demux_v_pid)
        pthread_cancel(demux_v_pid);
    if (demux_a_pid)
        pthread_cancel(demux_a_pid);
    if (v_pid)
        pthread_cancel(v_pid);
    if (a_pid)
        pthread_cancel(a_pid);
    if (s_pid)
        pthread_cancel(s_pid);
        
    LOG_INFO("Application termination completed");
}

// Signal handler function
void handle_signal(int signal)
{
    LOG_INFO("Received signal: ", signal, ", Description: ", strsignal(signal));

    if (signal == SIGINT || signal == SIGTERM)
    {
        LOG_INFO("Received SIGINT (Ctrl+C) or SIGTERM(kill -15 <pid>). Exiting gracefully...");
        // Perform any cleanup tasks here
        terminateApp();

        _exit(0); // Exit the program
    }
}

/*
  argc: 4
  argv[1]: M3U8 URL(https://cdn.lawandcrime.net/247/720_scte.m3u8)
  argv[2]: SRT URL(srt://34.68.1.137:32700?mode=caller)
  argv[3]: channel name
*/
int main(int argc, char *argv[])
{
    if (argc < 4)
    {
        std::cerr << "Usage: " << argv[0] << " <m3u8URL> <srtURL> <channelName>" << std::endl;
        return -1;
    }

    // Set up the signal handler
    if (signal(SIGINT, handle_signal) == SIG_ERR)
    {
        printf("Error setting up SIGINT signal handler\n");
        return 1;
    }
    // Set up the signal handler
    if (signal(SIGTERM, handle_signal) == SIG_ERR)
    {
        printf("Error setting up SIGTERM signal handler\n");
        return 1;
    }

    // Fetch arguments
    std::string m3u8URL = argv[1];
    strcpy(target_path, argv[2]);
    string channelName = argv[3];

    // Initialize logger following udp-ad-udp.cpp pattern
    std::string baseDir = "/tmp/freecast/";
    if (!fs::exists(baseDir)) {
        fs::create_directories(baseDir);
    }
    std::string log_file = baseDir + channelName + "-hls-srt.log";
    Logger::init(log_file, channelName, LogLevel::INFO);

    LOG_INFO("HLS-SRT application starting");
    LOG_INFO("M3U8 URL: ", m3u8URL);
    LOG_INFO("SRT Target: ", target_path);
    LOG_INFO("Channel: ", channelName);

    // Make channel folder to download *.ts for Streaming
    downloadDir = DATA_DIR + channelName + "/";
    mkdir(DATA_DIR, 0755);
    makeChannelFolder(downloadDir);
    // srt_setloglevel(LOG_CRIT);

    try
    {
        LOG_INFO("Creating SRT broadcasting thread");
        pthread_create(&s_pid, NULL, SRTBroadCastingThread, NULL);

        LOG_INFO("Waiting for SRT connection...");
        while (true)
        {
            if (target_connected)
                break;

            usleep(1000000);
        }
        LOG_INFO("SRT connection established");
        
        // Start to parse M3U8
        LOG_INFO("Parsing HLS manifest");
        g_pHLSInfo = new CHLSInfo();
        if (!g_pHLSInfo->parseManifest(m3u8URL))
            throw std::runtime_error("Parsing manifest Failed!");

        has_externalAudio = !g_pHLSInfo->m_audio.url.empty();
        LOG_INFO("External audio stream: ", has_externalAudio ? "enabled" : "disabled");

        // test
        g_pHLSInfo->printManifest();

        // Initialize the dynamic buffer manager
        g_bufferManager = DynamicBufferManager::getInstance();

        // Start threads for streaming
        LOG_INFO("Initializing streaming context");
        freeStream();
        if (!initStream()) {
            LOG_ERROR("Failed to initialize stream context");
            throw std::runtime_error("Stream initialization failed");
        }
        LOG_INFO("Stream context initialized successfully");

        LOG_INFO("Creating streaming threads");
        pthread_create(&demux_v_pid, NULL, DemuxVThread, NULL);
        pthread_create(&demux_a_pid, NULL, DemuxAThread, NULL);
        pthread_create(&v_pid, NULL, VStreamingThread, NULL);
        pthread_create(&a_pid, NULL, AStreamingThread, NULL);
        LOG_INFO("All streaming threads created");

        LOG_INFO("Starting main processing loop");
        while (true)
        {
            if (!target_connected) {
                LOG_WARN("SRT connection lost, waiting for reconnection...");
                usleep(1000000);
                continue;
            }

            if (audio_stream_finished && video_stream_finished) {
                LOG_ERROR("Video & Audio Streaming Threads are stopped!");
                throw std::runtime_error("Video & Audio Streaming Threads are stopped!");
            }

            auto t_start = std::chrono::high_resolution_clock::now();

            M3U8Info v_m3u8Info = {}, a_m3u8Info = {};
            if (!g_pHLSInfo->m_bestStream.url.empty())
            {
                if (!segmentation(AVMEDIA_TYPE_VIDEO, g_pHLSInfo->m_bestStream.url, v_m3u8Info)) {
                    LOG_ERROR("Failed to segment video stream");
                    throw std::runtime_error("Invalid video stream URL!");
                }
            }

            if (has_externalAudio)
            {
                if (!segmentation(AVMEDIA_TYPE_AUDIO, g_pHLSInfo->m_audio.url, a_m3u8Info)) {
                    LOG_ERROR("Failed to segment audio stream");
                    throw std::runtime_error("Invalid external audio stream URL!");
                }
            }

            if (!v_m3u8Info.isLive && !a_m3u8Info.isLive) {
                LOG_INFO("This is VOD, not LIVE");
                break;
            }

            double duration = 0, v_duration = 0, a_duration = 0;

            if (!v_m3u8Info.segments.empty())
                v_duration = v_m3u8Info.segments.back().duration;
            if (!a_m3u8Info.segments.empty())
                a_duration = a_m3u8Info.segments.back().duration;

            if (v_duration == 0 && a_duration == 0)
            {
                duration = 5.0;
            }
            else if (v_duration != 0 && a_duration == 0)
            {
                duration = v_duration;
            }
            else if (v_duration == 0 && a_duration != 0)
            {
                duration = a_duration;
            }
            else
            {
                duration = std::min(v_duration, a_duration);
            }

            auto t_end = std::chrono::high_resolution_clock::now();
            double elapsed_time_ms = std::chrono::duration<double, std::milli>(t_end - t_start).count();

            // sleep
            double sleepDuration_ms = duration / 2 * 1000 - elapsed_time_ms;
            sleepDuration_ms = sleepDuration_ms > 0 ? sleepDuration_ms : 1000;
            // printf("----------- duration = %lf ms, elapsed_time_ms = %lf ms,
            // sleepDuration = %lf ms\n", duration * 1000, elapsed_time_ms,
            // sleepDuration_ms);

            std::this_thread::sleep_for(std::chrono::milliseconds(long(sleepDuration_ms)));
        }
    }
    catch (const std::exception &e)
    {
        LOG_ERROR("Standard exception: ", e.what());
        std::cerr << "Standard exception: " << e.what() << std::endl;

        terminateApp();
        Logger::cleanup();
        return -1;
    }

    LOG_INFO("Setting parsing status to finished");
    v_status = PARSING_FINISHED;
    a_status = PARSING_FINISHED;

    LOG_INFO("Waiting for threads to finish");
    pthread_join(demux_a_pid, NULL);
    pthread_join(demux_v_pid, NULL);
    pthread_join(a_pid, NULL);
    pthread_join(v_pid, NULL);
    pthread_join(s_pid, NULL);
    LOG_INFO("All threads joined successfully");

    // Delete all channel data.
    removeFolder(downloadDir);

    LOG_INFO("Streaming Service finished successfully");

    Logger::cleanup();
    return 0;
}
