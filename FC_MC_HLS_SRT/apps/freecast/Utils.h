#ifndef _HLUTILS_H_
#define _HLUTILS_H_

#include <cstdint>
#include <regex>
#include <string>
#include <sys/stat.h>

enum PathType {
  FULL_BASE_URL,
  FULL_FILE_URL,
  RELATIVE_BASE_URL,
  LOCAL_FILE,
  UNKNOWN
};

std::string _trim(const std::string &str);
bool isFileEmpty(const char* filename);
bool fetchContent(const std::string &url, std::string &content);
bool ReFetchContent(const std::string &url, std::string &content);
bool fetchFileContent(const std::string &url, std::vector<uint8_t> &content);
bool ReFetchFileContent(const std::string &url, std::vector<uint8_t> &content);
bool downloadFile(const std::string &url, const std::string &outputPath);
bool ReDownloadFile(const std::string &url, const std::string &outputPath);

bool isFullUrl(const std::string &url);
std::string getBaseUrl(const std::string &url);
std::string getFullUrl(const std::string &url, const std::string &filepath);
bool fileExists(const std::string &url);
std::string extractFilename(const std::string &url);
std::string getFileExtension(const std::string& path);
std::string extractUrlWithoutQuery(const std::string &url);
PathType detectPathType(const std::string &str);

void makeChannelFolder(const std::string &channelDir);
void removeFolder(const std::string &dir);

int hexStringToByteArray(const char *hexString, unsigned char *byteArray,
                         size_t byteArraySize);
void addMergeInputStreams(const char *initFileName, const char *m4sFileName,
                          const char *midFileName);

uint8_t *base64_decode(const std::string &base64Str, size_t &outLen);
double convertToEpoch(const std::string &startDate);
uint64_t convertToPts(double epochTime);

#endif // _HLUTILS_H_
