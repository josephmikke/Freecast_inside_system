#include "stdio.h"
#include <pthread.h>
#include <string>
#include <sstream>
#include <vector>
#include <mutex>
#include <unistd.h>
#include <fstream> 

/*-------------------------------------------------------------------------
 * ffmpeg library includes
---------------------------------------------------------------------------*/
extern "C" {
    #include <libavutil/imgutils.h>
    #include <libavutil/samplefmt.h>
    #include <libavutil/timestamp.h>
    #include <libavcodec/avcodec.h>
    #include <libavformat/avformat.h>
    #include <libavutil/time.h>
}

typedef struct RawBuffer {
    uint8_t* data;
    int       size;
    int       position;
} RawBuffer;

// Define a node in the linked list
typedef struct PacketNode {
    AVPacket packet;
    struct PacketNode* next;
} PacketNode;

// Define the packet queue
typedef struct PacketQueue {
    PacketNode* head;
    PacketNode* tail;
    int size; // Track the number of packets in the queue
    int64_t get_front_dts() const {
        if (!head) return INT64_MAX;
        return head->packet.dts;
    }

} PacketQueue;

struct FILE_FORMAT_INFO {
    std::string videoCodec, width, height, avgFrameRate, videoBitRate, audioCodec, audioBitRate, audioSampleRate;
};

void    packet_queue_init(PacketQueue* queue);
int     packet_queue_push(PacketQueue* queue, AVPacket* packet);
int     packet_queue_pop(PacketQueue* queue, AVPacket* packet);
void    packet_queue_free(PacketQueue* queue);
int     Read_Packet(void* opaque, uint8_t* buf, int buf_size);

bool    GetFileFormatInfo(std::string inputURL, FILE_FORMAT_INFO& fileFormatInfo);
int     convertVideo(const std::string inputVideoPath, const std::string outputVideoPath, FILE_FORMAT_INFO& fileFormatInfo);
int     downloadTSFromUDP(const std::string udp_url, const std::string output_dir, const std::string m3u8_path);
