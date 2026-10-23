#ifndef _HLSINFO_H_
#define _HLSINFO_H_

#include "Utils.h"
#include <vector>
#include <mutex>

extern "C" {
    #include <libavformat/avformat.h>
}

using namespace std;

struct KEY {
    string  method;
    string  url;    // Verimatrix & Widevine
    string  iv;     // Verimatrix
    string  id;     // Widevine
    string  format; // Widevine
};

struct SEGMENT
{
    KEY     key;

    string  url;
    double  duration;    // seconds
    string  adData;      // HEX data
    bool    isAD;        // true if current segment is the start of an ad, or false

    // Equality operator for comparison
    bool operator==(const SEGMENT& other) const {
        return url == other.url;
    }
};

struct STREAM_INFO
{
    int     width, height;
    int     bandWidth;
    string  audio, subtitle;
    string  url;
};

struct MEDIA
{
    string  type;    // audio, subtitle, caption
    string  groupId;
    string  autoselect;
    string  url;
};

struct M3U8Info
{
    bool    isLive = false;
    int     targetDuration = 0;
    string  init_url; // for only fMP4

    vector<SEGMENT> segments;
};

class CHLSInfo
{
    public:
        CHLSInfo();
        ~CHLSInfo();

        bool parseManifest(string m3u8Url);
        bool parseM3U8(AVMediaType AV_Type, const string& m3u8Url, M3U8Info& m3u8Info);

        void getNewSegments(AVMediaType AV_Type, const M3U8Info& m3u8Info);
        bool popSegment(AVMediaType AV_Type, SEGMENT& segment, string& adData);
        void initNewSegments(AVMediaType AV_Type);

        // test
        void printManifest();
        void printM3U8(AVMediaType AV_Type, M3U8Info& m3u8Info);
        void printNewSegments(AVMediaType AV_Type);
        int  getNewSegmentCount() { return m_v_newSegments.size(); };

        STREAM_INFO m_bestStream;
        MEDIA       m_audio, m_subtitle;
        string      m_v_initUrl, m_a_initUrl;

    private:
        bool parseStreamInfo(const string& m3u8Content, vector<STREAM_INFO>& streamInfo_list);
        void parseMedia(const string& m3u8Content, vector<MEDIA>& media_list);

        bool m_isLive;
        KEY m_vKey, m_aKey;

        vector<SEGMENT> m_v_prevSegments, m_a_prevSegments, m_v_newSegments, m_a_newSegments;
        std::mutex m_parse_mutex;
};

#endif // _MPDINFO_H_
