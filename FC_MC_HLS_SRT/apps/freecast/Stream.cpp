#include "Stream.h"

// Initialize the packet queue
void packet_queue_init(PacketQueue* queue)
{
    queue->head = NULL;
    queue->tail = NULL;
    queue->size = 0;
}

// Push a packet onto the queue
int packet_queue_push(PacketQueue* queue, AVPacket* packet)
{
    PacketNode* new_node = (PacketNode*)malloc(sizeof(PacketNode));
    if (!new_node)
    {
        fprintf(stderr, "Failed to allocate memory for new packet node.\n");
        return -1;
    }

    // Initialize the new node
    new_node->packet = *packet;
    new_node->next = NULL;

    // If the queue is empty, the new node is both the head and the tail
    if (!queue->head)
    {
        queue->head = new_node;
        queue->tail = new_node;
    }
    else
    {
        // Otherwise, append it to the tail and update the tail pointer
        queue->tail->next = new_node;
        queue->tail = new_node;
    }

    queue->size++;
    return 0;
}

// Pop a packet from the queue
int packet_queue_pop(PacketQueue* queue, AVPacket* packet)
{
    if (!queue->head)
    {
        // Queue is empty
        return -1;
    }

    // Get the packet from the front of the queue
    PacketNode* temp_node = queue->head;
    *packet = temp_node->packet;

    // Move the head pointer to the next node
    queue->head = queue->head->next;

    // If the queue becomes empty, update the tail to NULL
    if (!queue->head)
    {
        queue->tail = NULL;
    }

    free(temp_node); // Free the memory of the old head node
    queue->size--;
    return 0;
}

// Free the entire packet queue
void packet_queue_free(PacketQueue* queue)
{
    AVPacket packet;
    while (packet_queue_pop(queue, &packet) == 0)
    {
        av_packet_unref(&packet); // Unreference the packet data
    }
}

/*
    AVIO reading packet
*/
int Read_Packet(void* opaque, uint8_t* buf, int buf_size)
{
    // printf("=======  [Read_packet]: CallBack Called  ===============\n");
    RawBuffer* buffer = (RawBuffer*)opaque;

    int position = buffer->position;
    int buffer_size = buffer->size;

    if (buffer_size - position <= 0)
    {
        return -1;
    }

    buf_size = FFMIN(buffer_size - position, buf_size);
    // printf("buffer_size = %d, buf_size = %d, position = %d \n", buffer_size, buf_size, position);
    memcpy(buf, buffer->data + position, buf_size);
    buffer->position += buf_size;

    return buf_size;
}

bool GetFileFormatInfo(std::string inputURL, FILE_FORMAT_INFO& fileFormatInfo)
{
    /* open input file, and allocate format context */
    AVFormatContext* formatContext = nullptr;

    avformat_network_init();

    if (avformat_open_input(&formatContext, inputURL.c_str(), NULL, NULL) < 0) {
        fprintf(stderr, "GetFileFormatInfo => Could not open source file %s\n", inputURL.c_str());
        return false;
    }
    /* retrieve stream information */
    if (avformat_find_stream_info(formatContext, NULL) < 0) {
        fprintf(stderr, "GetFileFormatInfo => Could not find stream information\n");
        return false;
    }

    int input_video_stream_idx = -1;
    for (unsigned int i = 0; i < formatContext->nb_streams; i++) {
        if (formatContext->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_VIDEO) {
            input_video_stream_idx = i;
            const AVCodec* codec = avcodec_find_decoder(formatContext->streams[i]->codecpar->codec_id);
            AVCodecContext* codec_ctx = avcodec_alloc_context3(codec);
            avcodec_parameters_to_context(codec_ctx, formatContext->streams[input_video_stream_idx]->codecpar);
            avcodec_open2(codec_ctx, codec, nullptr);
            
            fileFormatInfo.width = std::to_string(codec_ctx->width);
            fileFormatInfo.height = std::to_string(codec_ctx->height);
            fileFormatInfo.videoCodec = std::string(codec->name);
            fileFormatInfo.videoBitRate = std::to_string(formatContext->streams[i]->codecpar->bit_rate);
            
            AVRational framerate = av_guess_frame_rate(formatContext, formatContext->streams[input_video_stream_idx], NULL);
            fileFormatInfo.avgFrameRate = std::to_string(static_cast<double>(framerate.num) / framerate.den);
            
            avcodec_free_context(&codec_ctx);
            break;
        }
    }

    int input_audio_stream_idx = av_find_best_stream(formatContext, AVMEDIA_TYPE_AUDIO, -1, -1, NULL, 0);

    if (input_audio_stream_idx >= 0) {
        const AVCodec* audio_codec = avcodec_find_decoder(formatContext->streams[input_audio_stream_idx]->codecpar->codec_id);
        AVCodecContext* audio_context = avcodec_alloc_context3(audio_codec);
        avcodec_parameters_to_context(audio_context, formatContext->streams[input_audio_stream_idx]->codecpar);
        avcodec_open2(audio_context, audio_codec, nullptr);
        
        fileFormatInfo.audioCodec = std::string(audio_codec->name);
        fileFormatInfo.audioBitRate = std::to_string(audio_context->bit_rate);
        fileFormatInfo.audioSampleRate = std::to_string(formatContext->streams[input_audio_stream_idx]->codecpar->sample_rate);

        avcodec_free_context(&audio_context);
    }

    avformat_close_input(&formatContext);

    return true;
}

// Function to convert video using ffmpeg
int convertVideo(const std::string inputVideoPath, const std::string outputVideoPath, FILE_FORMAT_INFO& fileFormatInfo)
{
    std::ostringstream command;
    command << "ffmpeg -i " << inputVideoPath
        << " -c:v "         << fileFormatInfo.videoCodec
        << " -vf scale="    << fileFormatInfo.width << ":" << fileFormatInfo.height
        << " -r "           << fileFormatInfo.avgFrameRate
        << " -b:v "         << fileFormatInfo.videoBitRate
        << " -c:a "         << fileFormatInfo.audioCodec
        << " -b:a "         << fileFormatInfo.audioBitRate
        << " -ar "          << fileFormatInfo.audioSampleRate
        << " "              << outputVideoPath;
    int ret = system(command.str().c_str());
    return ret;
}

int downloadTSFromUDP(const std::string udp_url, const std::string output_dir, const std::string m3u8_path)
{
    std::ostringstream command;
    command << "ffmpeg -i " << udp_url
        << " -loglevel error "
        << " -c:v copy -c:a copy "
        << " -f hls "
        << " -hls_time 6 "
        << " -hls_list_size 6 "
        << " -hls_flags delete_segments "
        << " -hls_base_url " << output_dir
        << " -hls_segment_filename " << output_dir << "index_%03d.ts "
        << " "<< m3u8_path;
    int ret = system(command.str().c_str());
    return ret;
}
