#include "hlsclass.h"
#include "spliceclass.hpp"
#include <iomanip>
#include <unistd.h>

const string KEYFORMAT_WIDEVINE         = "urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed";  // Widevine 
const string KEYFORMAT_APPLEFAIRPLAY    = "com.apple.streamingkeydelivery";                 // Apple FairPlay DRM

CHLSInfo::CHLSInfo()
{
    m_bestStream = {};
    m_audio = {};
    m_subtitle = {};
    m_vKey = {};
    m_aKey = {};

    m_isLive = false;
}

CHLSInfo::~CHLSInfo()
{
}

bool CHLSInfo::parseManifest(string m3u8Url)
{
    m3u8Url = _trim(m3u8Url);

    string content;
    ReFetchContent(m3u8Url, content);
    
    if (content.empty()) {
        printf("parseStreamInfo => Empty Content!\n");
        return false;
    }
    
    vector<STREAM_INFO> streamInfo_list;

    // select a m3u8 with best quality(high resolution & high bandwidth)
    if (parseStreamInfo(content, streamInfo_list))
    {
        STREAM_INFO bestStream = streamInfo_list[0];
        for (const auto& stream: streamInfo_list) {
            long bestResolution = bestStream.width * bestStream.height;
            long currentResolution = stream.width * stream.height;

            if (currentResolution > bestResolution || 
                (currentResolution == bestResolution && stream.bandWidth > bestStream.bandWidth)) {
                bestStream = stream;
            }
        }
        m_bestStream = bestStream;
    } else {
        m_bestStream.url = m3u8Url;
    }

    m_bestStream.url = getFullUrl(m3u8Url, m_bestStream.url);
    
    // select audio-m3u8 and subtitle-m3u8
    vector<MEDIA> media_list;
    parseMedia(content, media_list);
    
    for (const auto& media: media_list) {
        if (media.type == "AUDIO") {
            if (m_audio.url.empty() && media.groupId == m_bestStream.audio && media.autoselect == "YES") {
                m_audio = media;
            }
        } else if (media.type == "SUBTITLES") {
            if (m_subtitle.url.empty() && media.groupId == m_bestStream.subtitle && media.autoselect == "YES") {
                m_subtitle = media;
            }
        }
    }

    m_audio.url     = getFullUrl(m3u8Url, m_audio.url);
    m_subtitle.url  = getFullUrl(m3u8Url, m_subtitle.url);
    
    return true;
}

bool CHLSInfo::parseM3U8(AVMediaType AV_Type, const string& m3u8Url, M3U8Info& m3u8Info)
{
    string content;
    if (!ReFetchContent(m3u8Url, content))
        return false;

    if (content.empty()) {
        printf("parseM3U8 => Empty Content!\n");
        return false;
    }
    
    m3u8Info.isLive = true;
    m_isLive = true;
    bool isAD = false;
    string adData;
    bool ret  = false;
    double duration = 0.0;

    regex targetDurationRegex(R"(#EXT-X-TARGETDURATION:(\d+))");
    regex extinfRegex(R"(^#EXTINF:([\d\.]+),)");

    string line;
    std::smatch match;    
    std::istringstream contentStream(content);

    while (std::getline(contentStream, line)) {
        if (line.find("EXTM3U") != string::npos)
            ret= true;
        else if (regex_search(line, match, extinfRegex)) {
            duration = std::stod(_trim(match[1].str()));
        }
        else if (!line.empty() && line[0] != '#') {
            KEY key{};
            if (AV_Type == AVMEDIA_TYPE_VIDEO) {
                key = m_vKey;
            } else if (AV_Type == AVMEDIA_TYPE_AUDIO) {
                key = m_aKey;
            }

            SEGMENT segment{};            
            segment.duration = duration;
            segment.key = key;
            segment.isAD = isAD;
            segment.adData = adData;
            segment.url = getFullUrl(m3u8Url, _trim(line));

            m3u8Info.segments.push_back(segment);

            isAD = false;
            adData.clear();
        }
        else if (line.find("#EXT-X-KEY") != string::npos) {
            KEY key{};
            regex method_regex(R"(METHOD=([^,]+))");
            if (regex_search(line, match, method_regex)) {
                key.method = _trim(match[1].str());
            }

            regex keyformat_regex(R"(KEYFORMAT=\"([^\"]+)\")");
            if (regex_search(line, match, keyformat_regex)) {
                key.format = _trim(match[1].str());
            }

            regex uri_regex(R"(URI=\"([^\"]+)\")");
            if (regex_search(line, match, uri_regex)) {
                key.url = _trim(match[1].str());

                if (key.format == KEYFORMAT_WIDEVINE) {
                    regex base64_regex(R"(base64,([\w+/=]+))");
                    if (regex_search(line, match, base64_regex)) {
                        key.url = _trim(match[1].str());
                    }
                }
            }

            regex iv_regex(R"(IV=0[Xx]([0-9A-Fa-f]+))");
            if (regex_search(line, match, iv_regex)) {
                key.iv = _trim(match[1].str());
            }

            bool isValidKey = false;
#ifdef VERIMATRIX
            isValidKey = isFullUrl(key.url);
#endif // VERIMATRIX

#ifdef WIDEVINE
            isValidKey = (key.format == KEYFORMAT_WIDEVINE);
#endif // WIDEVINE

            if (isValidKey) {
                if (AV_Type == AVMEDIA_TYPE_VIDEO) {
                    m_vKey = key;
                } else if (AV_Type == AVMEDIA_TYPE_AUDIO) {
                    m_aKey = key;
                }
            }
        }
        else if (line.find("#EXT-X-MAP") != string::npos) {
            regex map_regex(R"(URI=\"([^\"]+)\")");
            if (regex_search(line, match, map_regex)) {
                m3u8Info.init_url = getFullUrl(m3u8Url, _trim(match[1].str()));
            }
        }
        else if (regex_search(line, match, targetDurationRegex)) {
            m3u8Info.targetDuration = std::stoi(_trim(match.str(1)));
        }
        else if (line.find("#EXT-X-ENDLIST") != string::npos) {
            m3u8Info.isLive = false; // Found the ENDLIST tag, not a live stream
            m_isLive = false;
        }
        else if (line.find("#EXT-X-CUE-OUT") != string::npos) {
            isAD = true;
        }
        else if (line.find("#EXT-X-CUE-IN") != string::npos) {
            isAD = false;
        }
        
        // fetch SCTE35 info: #EXT-OATCLS-SCTE35, #EXT-X-SPLICEPOINT-SCTE35, #EXT-X-SCTE35, #EXT-X-DATERANGE
        else if (line.find("#EXT-OATCLS-SCTE35") != std::string::npos 
                || line.find("#EXT-X-SPLICEPOINT-SCTE35") != std::string::npos 
                || line.find("#EXT-X-SCTE35") != std::string::npos) {
            isAD = true;
            if (AV_Type != AVMEDIA_TYPE_VIDEO) {
                printf("ad is true, or AV_Type is not video\n");
                continue;
            }

            size_t length;
            uint8_t* byteArray = base64_decode(_trim(line.substr(line.find(":") + 1)), length);

            if (!byteArray) {
                printf("++++++++++++ No SCTE35 data!\n");
                continue;
            }

            std::ostringstream hexStream;
            for (size_t i = 0; i < length; ++i) {
                // Add each byte as a two-character hexadecimal value
                hexStream << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(byteArray[i]);
            }

            adData = hexStream.str();
        }
        else if (line.find("#EXT-X-DATERANGE") != std::string::npos) {
            isAD = true;
            if (AV_Type != AVMEDIA_TYPE_VIDEO) {
                printf("ad is true, or AV_Type is not video\n");
                continue;
            }

            std::regex scte35Regex(R"(SCTE35-OUT=0x([A-Fa-f0-9]+))");
            if (std::regex_search(line, match, scte35Regex)) {
                adData = _trim(match.str(1));
            }
        }
    }

    return ret;
}

bool CHLSInfo::parseStreamInfo(const string& m3u8Content, vector<STREAM_INFO>& streamInfo_list)
{
    string line;
    std::smatch match;    
    std::istringstream contentStream(m3u8Content);

    while (std::getline(contentStream, line)) {
        if (line.find("#EXT-X-STREAM-INF") != std::string::npos) {
            STREAM_INFO streamInfo;

            std::regex resolution_regex(R"(RESOLUTION=(\d+)x(\d+))");
            if (std::regex_search(line, match, resolution_regex)) {
                streamInfo.width = std::stoi(match[1].str());
                streamInfo.height = std::stoi(match[2].str());
            }

            std::regex regexBandwidth(R"(BANDWIDTH=(\d+))");
            if (std::regex_search(line, match, regexBandwidth)) {
                streamInfo.bandWidth = std::stoi(match[1].str());
            }

            std::regex audio_regex(R"(AUDIO=\"([^\"]+)\")");
            if (std::regex_search(line, match, audio_regex)) {
                streamInfo.audio = _trim(match[1].str());
            }

            std::regex subtitles_regex(R"(SUBTITLES=\"([^\"]+)\")");
            if (std::regex_search(line, match, subtitles_regex)) {
                streamInfo.subtitle = _trim(match[1].str());
            }

            if (std::getline(contentStream, line)) {
                if (line[0] != '#') {
                    streamInfo.url = _trim(line);
                }
            }

            streamInfo_list.push_back(streamInfo);
        }
    }

    return streamInfo_list.size() > 0;
}

void CHLSInfo::parseMedia(const string& m3u8Content, vector<MEDIA>& media_list)
{
    string line;
    std::smatch match;    
    std::istringstream contentStream(m3u8Content);

    while (std::getline(contentStream, line)) {
        if (line.find("#EXT-X-MEDIA") != std::string::npos) {
            MEDIA media;

            regex type_regex(R"(TYPE=([^,]+))");
            if (std::regex_search(line, match, type_regex)) {
                media.type = _trim(match[1].str());
            }

            regex group_id_regex(R"(GROUP-ID=\"([^\"]+)\")");
            if (std::regex_search(line, match, group_id_regex)) {
                media.groupId = _trim(match[1].str());
            }

            regex autoselect_regex(R"(AUTOSELECT=([^,]+))");
            if (std::regex_search(line, match, autoselect_regex)) {
                media.autoselect = _trim(match[1].str());
            }

            regex uri_regex(R"(URI=\"([^\"]+)\")");
            if (std::regex_search(line, match, uri_regex)) {
                media.url = _trim(match[1].str());
            }

            media_list.push_back(media);
        }
    }
}

void CHLSInfo::getNewSegments(AVMediaType AV_Type, const M3U8Info& m3u8Info)
{
    std::lock_guard<std::mutex> lock(m_parse_mutex);

    bool v_hasNewSegment = false, a_hasNewSegment = false;

    for (const auto& segment: m3u8Info.segments)
    {
        if (AV_Type == AVMEDIA_TYPE_VIDEO) {
            if (std::find(m_v_prevSegments.begin(), m_v_prevSegments.end(), segment) == m_v_prevSegments.end()) {
                m_v_newSegments.push_back(segment);
                v_hasNewSegment = true;
            }
        } else if (AV_Type == AVMEDIA_TYPE_AUDIO) {
            if (std::find(m_a_prevSegments.begin(), m_a_prevSegments.end(), segment) == m_a_prevSegments.end()) {
                m_a_newSegments.push_back(segment);
                a_hasNewSegment = true;
            }
        }
    }

    if (AV_Type == AVMEDIA_TYPE_VIDEO && v_hasNewSegment) {        
        m_v_prevSegments = m3u8Info.segments;
    } 
    else if (AV_Type == AVMEDIA_TYPE_AUDIO && a_hasNewSegment) {        
        m_a_prevSegments = m3u8Info.segments;
    }
}

bool CHLSInfo::popSegment(AVMediaType AV_Type, SEGMENT& segment, string& adData)
{
    std::lock_guard<std::mutex> lock(m_parse_mutex);
    if (AV_Type == AVMEDIA_TYPE_VIDEO) {
        if (m_isLive) 
        {
            if (m_v_newSegments.size() < 2)
                return false;
        } else {
            if (m_v_newSegments.size() < 1)
                return false;
        }
        
        segment = m_v_newSegments.front();
        m_v_newSegments.erase(m_v_newSegments.begin());

        if (!m_v_newSegments.empty()) {
            if (!segment.isAD && m_v_newSegments.front().isAD) {
                adData = m_v_newSegments.front().adData;
                if (adData.empty()) {
                    adData = "fc302500000002cadb00fff0140540009c5f7fefff0a9f83dafe0149dfa50001000000007f856615";
                }
            }
        }
    } 
    else if (AV_Type == AVMEDIA_TYPE_AUDIO) {
        if (m_a_newSegments.size() < 2)
            return false;

        segment = m_a_newSegments.front();
        m_a_newSegments.erase(m_a_newSegments.begin());
    }

    return true;
}

void CHLSInfo::initNewSegments(AVMediaType AV_Type)
{
    std::lock_guard<std::mutex> lock(m_parse_mutex);
    if (AV_Type == AVMEDIA_TYPE_VIDEO) {
        m_v_prevSegments.clear();
        m_v_newSegments.clear();
    } else if (AV_Type == AVMEDIA_TYPE_AUDIO) {
        m_a_prevSegments.clear();
        m_a_newSegments.clear();
    }
}

void CHLSInfo::printManifest()
{
    printf("\n---------------- Manifest --------------\n");
    if (m_bestStream.width * m_bestStream.height > 0) {
        printf("Resolution: %d X %d\n", m_bestStream.width, m_bestStream.height);
    } else {
        printf("Resolution:\n");
    }
    
    if (m_bestStream.bandWidth > 0) {
        printf("Bandwidth: %d\n", m_bestStream.bandWidth);
    } else {
        printf("Bandwidth:\n");
    }

    printf("AUDIO: %s, SUBTITLES: %s\n", m_bestStream.audio.empty()? "N/A":m_bestStream.audio.data(), m_bestStream.subtitle.empty()? "N/A":m_bestStream.subtitle.data());
    printf("M3U8: %s\n", m_bestStream.url.data());
    printf("------------------------------------------\n\n");

    if (!m_audio.url.empty()) {
        printf("------------------- External Audio -------------------\n");
        printf("Type: %s\n", m_audio.type.data());
        printf("Group ID: %s\n", m_audio.groupId.data());
        printf("AutoSelect: %s\n", m_audio.autoselect.data());
        printf("URL: %s\n", m_audio.url.data());
        printf("---------------------------------------------\n");
    }
}

void CHLSInfo::printM3U8(AVMediaType AV_Type, M3U8Info& m3u8Info)
{
    std::string str_avType;
    if (AV_Type == AVMEDIA_TYPE_VIDEO) {
        str_avType = "Video";
    } else if (AV_Type == AVMEDIA_TYPE_AUDIO) {
        str_avType = "Audio";
    } else if (AV_Type == AVMEDIA_TYPE_SUBTITLE) {
        str_avType = "Subtitle";
    }

    printf("\n--------------- M3U8(%s): --------------\n", str_avType.data());
    if (!m3u8Info.segments.empty())
        printf("Encrypted: %s\n", m3u8Info.segments.back().key.url.empty()? "No" : "Yes");
    printf("Type: %s\n", (m3u8Info.isLive)? "LIVE" : "VOD");
    printf("Target Duration: %d\n", m3u8Info.targetDuration);
    printf("Init URL: %s\n\n", m3u8Info.init_url.empty()? "N/A":m3u8Info.init_url.data());
    
    int idx = 0;
    for (const auto& segment: m3u8Info.segments) {
        printf("Segment-%d => url: %s, duration: %0.2f, AD: %s, key_method: %s, key_url: %s, key_iv: %s\n", idx, segment.url.data(), segment.duration, segment.isAD? "True": "False",
            segment.key.method.empty()? "N/A":segment.key.method.data(), segment.key.url.empty()? "N/A":segment.key.url.data(), segment.key.iv.empty()? "N/A":segment.key.iv.data());
        idx ++;
    }
    printf("Segment size: %ld\n\n", !m3u8Info.segments.empty()? m3u8Info.segments.size() : 0);
}

void CHLSInfo::printNewSegments(AVMediaType AV_Type)
{
    std::string str_avType;

    if (AV_Type == AVMEDIA_TYPE_VIDEO) {
        str_avType = "Video";
    } else if (AV_Type == AVMEDIA_TYPE_AUDIO) {
        str_avType = "Audio";
    } else if (AV_Type == AVMEDIA_TYPE_SUBTITLE) {
        str_avType = "Subtitle";
    }

    printf("\n--------------- New Segments(%s): --------------\n", str_avType.data());
    int idx = 0;
    if (AV_Type == AVMEDIA_TYPE_VIDEO) {
        for (const auto& segment: m_v_newSegments) {
            printf("New Segment-%d => url: %s, duration: %0.2f, AD: %s, key_method: %s, key_url: %s, key_iv: %s\n", idx, segment.url.data(), segment.duration, segment.isAD? "True": "False",
                segment.key.method.empty()? "N/A":segment.key.method.data(), segment.key.url.empty()? "N/A":segment.key.url.data(), segment.key.iv.empty()? "N/A":segment.key.iv.data());
            idx ++;
        }
        printf("m_v_newSegments size: %ld\n\n", !m_v_newSegments.empty()? m_v_newSegments.size() : 0);  
    } else if (AV_Type == AVMEDIA_TYPE_AUDIO) {
        for (const auto& segment: m_a_newSegments) {
            printf("New Segment-%d => url: %s, duration: %0.2f, AD: %s, key_method: %s, key_url: %s, key_iv: %s\n", idx, segment.url.data(), segment.duration, segment.isAD? "True": "False",
                segment.key.method.empty()? "N/A":segment.key.method.data(), segment.key.url.empty()? "N/A":segment.key.url.data(), segment.key.iv.empty()? "N/A":segment.key.iv.data());
            idx ++;
        }
        printf("m_a_newSegments size: %ld\n\n", !m_a_newSegments.empty()? m_a_newSegments.size() : 0);
    }
}
