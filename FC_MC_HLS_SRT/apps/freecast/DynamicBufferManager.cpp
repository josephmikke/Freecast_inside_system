#include "DynamicBufferManager.h"

#define QUEUE_SIZE 4
#define MIN_THRESHOLD 100

// Initialize static members
static DynamicBufferManager* gInstance = nullptr;

DynamicBufferManager* DynamicBufferManager::getInstance() {
    if (!gInstance)
        gInstance = new DynamicBufferManager();
    
    return gInstance;
}

DynamicBufferManager::DynamicBufferManager()
{}

DynamicBufferManager::~DynamicBufferManager()
{
    video_pkt_count_queue.clear();
    audio_pkt_count_queue.clear();
}

void DynamicBufferManager::storePktCount(AVMediaType mediaType, int pktCount)
{
    if (mediaType == AVMEDIA_TYPE_VIDEO) {
        video_pkt_count_queue.push_back(pktCount);
        if (video_pkt_count_queue.size() > QUEUE_SIZE)
            video_pkt_count_queue.erase(video_pkt_count_queue.begin());
    } else if (mediaType == AVMEDIA_TYPE_AUDIO) {
        audio_pkt_count_queue.push_back(pktCount);
        if (audio_pkt_count_queue.size() > QUEUE_SIZE)
            audio_pkt_count_queue.erase(audio_pkt_count_queue.begin());
    }
}

int DynamicBufferManager::getBufferThreshold(AVMediaType mediaType)
{
    int threshold = 0;
    int queue_size = 0;

    if (mediaType == AVMEDIA_TYPE_VIDEO) {
        for (const auto& cnt: video_pkt_count_queue) {
            threshold += cnt;
        }

        queue_size = video_pkt_count_queue.size();
    }
    else if (mediaType == AVMEDIA_TYPE_AUDIO) {
        for (const auto& cnt: audio_pkt_count_queue) {
            threshold += cnt;
        }

        queue_size = audio_pkt_count_queue.size();
    }

    if (threshold == 0 || queue_size == 0)
        return MIN_THRESHOLD;

    threshold = threshold / queue_size;
    return threshold;
}
