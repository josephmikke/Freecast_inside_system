#ifndef __DYNAMIC_BUFFER_MANAGER_H__
#define __DYNAMIC_BUFFER_MANAGER_H__

#include <vector>

extern "C" {
#include <libavformat/avformat.h>
}

/**
 * DynamicBufferManager - Manages dynamic buffer sizing based on segment characteristics
 *
 * This class calculates appropriate buffer thresholds based on segment duration,
 * bitrate, and stream type (video vs audio). It replaces the fixed MIN_BUFFER_SIZE
 * constant with dynamic values that adapt to the content being processed.
 */
class DynamicBufferManager {
public:
    /**
     * Get the singleton instance of the buffer manager
     */
    static DynamicBufferManager* getInstance();
    ~DynamicBufferManager();

    /**
     * Update segment information for a specific media type
     *
     * @param mediaType The media type (AVMEDIA_TYPE_VIDEO or AVMEDIA_TYPE_AUDIO)
     * @param pktCount packet count per segment
     */
    void storePktCount(AVMediaType mediaType, int pktCount);

    /**
     * Get the current buffer threshold for a specific media type
     *
     * @param mediaType The media type (AVMEDIA_TYPE_VIDEO or AVMEDIA_TYPE_AUDIO)
     * @return The calculated buffer threshold (number of packets)
     */
    int getBufferThreshold(AVMediaType mediaType);

private:
    DynamicBufferManager();

    std::vector<int> video_pkt_count_queue, audio_pkt_count_queue;
};

#endif // __DYNAMIC_BUFFER_MANAGER_H__
