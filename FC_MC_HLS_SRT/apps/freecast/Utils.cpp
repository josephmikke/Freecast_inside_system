#include "Utils.h"
#include "CurlManager.h"
#include <cstring>
#include <curl/curl.h>
#include <dirent.h>
#include <iomanip>
#include <openssl/bio.h>
#include <openssl/evp.h>
#include <unistd.h>

#define HTTP_OK 200
#define HTTP_NOT_FOUND 404
#define HTTP_BAD_REQUEST 400
#define HTTP_UNAUTHORIZED 401
#define HTTP_FORBIDDEN 403
#define HTTP_INTERNAL_SERVER_ERROR 500

std::string _trim(const std::string &str) {
  // Find first non-whitespace character
  size_t start = str.find_first_not_of(" \t\n\r");
  if (start == std::string::npos)
    return ""; // String is all whitespace

  // Find last non-whitespace character
  size_t end = str.find_last_not_of(" \t\n\r");

  // Extract the trimmed substring
  return str.substr(start, end - start + 1);
}

std::string url_encode(const std::string &value) {
  std::string encoded;
  for (char c : value) {
    if (c == ' ') {
      encoded += "%20";
    } else {
      encoded += c;
    }
  }
  return encoded;
#if 0
  std::ostringstream escaped;
  escaped.fill('0');
  escaped << std::hex;

  for (char c : value) {
    // Keep alphanumeric and these characters: -_.~/
    if (isalnum(static_cast<unsigned char>(c)) || c == '-' || c == '_' ||
        c == '.' || c == '~' || c == '/') {
      escaped << c;
    } else {
      escaped << '%' << std::uppercase << std::setw(2) << int((unsigned char)c);
    }
  }
  return escaped.str();
#endif
}

bool isFileEmpty(const char* filename) 
{
    FILE* file = fopen(filename, "rb");
    if (!file) {
        printf("Error opening file: %s\n", filename);
        return false; // or handle error differently
    }

    if (fseek(file, 0, SEEK_END) != 0) {
        printf("Error seeking in file: %s\n", filename);
        fclose(file);
        return false;
    }

    long size = ftell(file);
    fclose(file);

    if (size == -1L) {
        printf("Error getting file size: %s\n", filename);
        return false;
    }

    return size == 0;
}

bool fetchContent(const std::string &url, std::string &content) {
  return CurlManager::getInstance()->fetchContent(url, content);
}

bool ReFetchContent(const std::string &url, std::string &content) {
  // Try with more retries for critical content
  if (!CurlManager::getInstance()->fetchContent(url, content, 5))
  {
    printf("ReFetchContent => Failed to download content from %s\n", url.c_str());
    content.clear();

    return false;
  }

  return true;
}

bool fetchFileContent(const std::string &url,
                      std::vector<uint8_t> &content) {
  return CurlManager::getInstance()->fetchFileContent(url, content);
}

bool ReFetchFileContent(const std::string &url, std::vector<uint8_t> &content) {
  content.clear();

  // Try with the original URL first
  if (!CurlManager::getInstance()->fetchFileContent(url, content, 5))
  {
    printf("ReFetchFileContent => Downloading failed: %s\n", url.c_str());

    // Try with URL without query parameters as a fallback
    std::string updatedUrl = extractUrlWithoutQuery(url);
    if (updatedUrl.empty() || updatedUrl == url)
      return false;

    printf("Trying updated URL: %s\n", updatedUrl.c_str());

    content.clear();
    if (!CurlManager::getInstance()->fetchFileContent(updatedUrl, content, 5))
    {
      printf("ReFetchFileContent => Downloading failed with updated URL: %s\n", updatedUrl.c_str());
      return false;
    }
  }

  return true;
}

bool downloadFile(const std::string &url,
                  const std::string &outputPath) {
  return CurlManager::getInstance()->downloadFile(url, outputPath);
}

bool ReDownloadFile(const std::string &url, const std::string &outputPath) {
  // Try with the original URL first with more retries
  if (!CurlManager::getInstance()->downloadFile(url, outputPath, 5))
  {
    printf("ReDownloadFile => Downloading failed: %s\n", url.c_str());

    // Try with URL without query parameters as a fallback
    std::string updatedUrl = extractUrlWithoutQuery(url);
    if (updatedUrl.empty() || updatedUrl == url)
      return false;

    printf("Trying updated URL: %s\n", updatedUrl.c_str());

    if (!CurlManager::getInstance()->downloadFile(updatedUrl, outputPath, 5))
    {
      printf("ReDownloadFile => Downloading failed with updated URL: %s\n", updatedUrl.c_str());
      return false;
    }
  }

  return true;
}

bool isFullUrl(const std::string &url) {
  // Regular expression to check if the path is a URL
  std::regex urlRegex(R"(^(http|https)://[\w.-]+(:\d+)?(/.*)?$)",
                      std::regex::icase);
  return std::regex_match(url, urlRegex);
}

// Function to get the base URL without the filename
std::string getBaseUrl(const std::string &url) {
  size_t lastSlashPos = url.find_last_of('/');
  if (lastSlashPos != std::string::npos) {
    return url.substr(0, lastSlashPos + 1);
  }
  return url; // Return the original URL if no slash is found
}

std::string getFullUrl(const std::string &url, const std::string &filepath) {
  if (isFullUrl(filepath) || filepath.empty()) {
    return filepath;
  } else {
    return getBaseUrl(url) + filepath;
  }
}

// Function to check if a file exists at the given URL
bool fileExists(const std::string &origin_url) {
  CURL *curl = NULL;
  CURLcode res;

  int maxRetries = 3;
  int attempt = 0;

  std::string url = url_encode(origin_url);
  // Retry mechanism for curl_easy_init()
  while (attempt < maxRetries) {
    curl = curl_easy_init();
    if (curl) {
      break; // Success
    }

    printf("fetchFileContent => Attempt %d : Failed to initialize libcurl!\n",
           attempt + 1);
    usleep(2 * (attempt + 1) * 1000000); // Exponential backoff: 2, 4, 6 seconds
    attempt++;
  }

  if (!curl) {
    printf("Failed to initialize CURL\n");
    return false;
  }

  curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
  curl_easy_setopt(curl, CURLOPT_NOBODY,
                   1L); // Use HEAD request to check existence
  curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L); // Follow redirects

  maxRetries = 3;
  attempt = 0;

  do {
    res = curl_easy_perform(curl);
    if (res == CURLE_OK) {
      break; // Success
    }

    printf("fetchContent => Attempt %d failed: %s (%s)\n", attempt + 1,
           curl_easy_strerror(res), url.c_str());
    usleep(2 * (attempt + 1) * 1000000);
  } while (++attempt < maxRetries);

  long response_code = 0;
  if (res == CURLE_OK) {
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response_code);
  }

  curl_easy_cleanup(curl);

  // HTTP 200 means the file exists
  return (res == CURLE_OK && response_code == HTTP_OK);
}

std::string extractFilename(const std::string &url) {
  size_t lastSlash = url.find_last_of("/");
  if (lastSlash == std::string::npos) {
    return ""; // No valid filename found
  }

  std::string filename = url.substr(lastSlash + 1);

  // Remove query parameters if present
  size_t queryPos = filename.find("?");
  if (queryPos != std::string::npos) {
    filename = filename.substr(0, queryPos);
  }

  return filename;
}

// Function to get file extension
std::string getFileExtension(const std::string& path) {
    // Remove query parameters (everything after '?')
    std::string::size_type query_pos = path.find('?');
    std::string clean_path = (query_pos != std::string::npos) ? path.substr(0, query_pos) : path;

    // Find the last '.' in the cleaned path
    std::string::size_type dot_pos = clean_path.rfind('.');
    if (dot_pos != std::string::npos && dot_pos + 1 < clean_path.size()) {
        return clean_path.substr(dot_pos + 1);
    }

    return ""; // No extension found
}

std::string extractUrlWithoutQuery(const std::string &url) {
  std::string updatedUrl;

  std::regex baseUrlRegex(
      R"((https?://[^?]+))"); // Match everything before the '?'
  std::smatch match;
  if (std::regex_search(url, match, baseUrlRegex)) {
    updatedUrl = match[1].str();
  }

  return updatedUrl;
}

bool startsWithHttp(const std::string &str) {
  return str.rfind("http://", 0) == 0 || str.rfind("https://", 0) == 0;
}

bool endsWithSlash(const std::string &str) {
  return !str.empty() && str.back() == '/';
}

// Check if there's a '.' after the last '/' but before any '?' (to catch things
// like .ts?x=...)
bool hasDotAfterLastSlash(const std::string &str) {
  size_t lastSlash = str.find_last_of('/');
  size_t queryPos = str.find('?');
  size_t dotPos =
      str.find('.', (lastSlash == std::string::npos) ? 0 : lastSlash + 1);

  return dotPos != std::string::npos &&
         (queryPos == std::string::npos || dotPos < queryPos);
}

PathType detectPathType(const std::string &path) {
  bool isFullUrl = startsWithHttp(path);
  bool isSlashEnd = endsWithSlash(path);
  bool isFileLike = hasDotAfterLastSlash(path);

  if (isFullUrl) {
    if (isSlashEnd)
      return PathType::FULL_BASE_URL;
    if (isFileLike)
      return PathType::FULL_FILE_URL;
  } else {
    if (isSlashEnd)
      return PathType::RELATIVE_BASE_URL;
    if (isFileLike)
      return PathType::LOCAL_FILE;
  }

  return PathType::UNKNOWN;
}

uint8_t *base64_decode(const std::string &base64Str, size_t &outLen) {
  BIO *bio = nullptr;
  BIO *b64 = nullptr;
  uint8_t *buffer = nullptr;

  try {
    size_t input_length = base64Str.size();
    buffer =
        (uint8_t *)malloc(input_length); // Allocate memory for the decoded data
    if (!buffer) {
      throw std::runtime_error("Memory allocation failed");
    }

    bio = BIO_new_mem_buf(base64Str.c_str(), -1);
    if (!bio) {
      throw std::runtime_error("Failed to create BIO for base64 input");
    }

    b64 = BIO_new(BIO_f_base64());
    if (!b64) {
      throw std::runtime_error("Failed to create BIO for base64 filter");
    }

    bio = BIO_push(b64, bio);
    BIO_set_flags(
        bio, BIO_FLAGS_BASE64_NO_NL); // Do not use newlines to flush buffer

    int decodeLen = BIO_read(bio, buffer, input_length);
    if (decodeLen < 0) {
      throw std::runtime_error("Failed to decode base64 data");
    }

    outLen = static_cast<size_t>(decodeLen);
  } catch (...) {
    if (bio)
      BIO_free_all(bio);
    if (buffer)
      free(buffer);
    throw; // Re-throw the exception after cleanup
  }

  BIO_free_all(bio); // Free all BIOs
  return buffer;
}

// Function to convert START-DATE to epoch time in seconds
double convertToEpoch(const std::string &startDate) {
  std::tm tm = {};
  double fractionalSeconds = 0.0;

  // Parse the datetime using a stringstream
  std::stringstream ss(
      startDate.substr(0, 19)); // Only take "2025-01-07T08:32:03"
  ss >> std::get_time(&tm, "%Y-%m-%dT%H:%M:%S");
  if (ss.fail()) {
    throw std::runtime_error("Failed to parse START-DATE.");
  }

  // Handle fractional seconds
  size_t fracPos = startDate.find('.');
  if (fracPos != std::string::npos) {
    fractionalSeconds = std::stod("0" + startDate.substr(fracPos));
  }

  // Convert to epoch time
  time_t epochTime = timegm(&tm); // Use timegm for UTC time
  return static_cast<double>(epochTime) + fractionalSeconds;
}

// Function to convert epoch time to PTS (90 kHz clock)
uint64_t convertToPts(double epochTime) {
  return static_cast<uint64_t>(epochTime * 90000.0); // Convert to 90 kHz clock
}

void makeChannelFolder(const std::string &channelDir) {
  removeFolder(channelDir);
  mkdir(channelDir.c_str(), 0755);
}

void removeFolder(const std::string &path) {
  struct stat info;

  // Check if path exists and is a directory
  if (stat(path.c_str(), &info) != 0 || !S_ISDIR(info.st_mode)) {
    return;
  }

  DIR *dir = opendir(path.c_str());
  if (!dir) {
    printf("Error opening directory: %s\n", path.c_str());
    return;
  }

  struct dirent *entry;
  while ((entry = readdir(dir)) != nullptr) {
    std::string entryName = entry->d_name;

    // Skip "." and ".."
    if (entryName == "." || entryName == "..") {
      continue;
    }

    std::string fullPath = path + "/" + entryName;

    struct stat entryInfo;
    if (stat(fullPath.c_str(), &entryInfo) == 0) {
      if (S_ISDIR(entryInfo.st_mode)) {
        // Recursively remove subdirectory
        removeFolder(fullPath);
      } else {
        // Remove file
        if (unlink(fullPath.c_str()) != 0) {
          printf("Error deleting file: %s\n", fullPath.c_str());
        }
      }
    }
  }

  closedir(dir);

  // Finally, remove the now-empty directory
  if (rmdir(path.c_str()) != 0) {
    printf("Error removing directory: %s\n", path.c_str());
  }
}

// Function to convert a single hex character to a decimal value
int hexCharToInt(char c) {
  if (c >= '0' && c <= '9')
    return c - '0';
  if (c >= 'a' && c <= 'f')
    return c - 'a' + 10;
  if (c >= 'A' && c <= 'F')
    return c - 'A' + 10;
  return -1; // Error: not a valid hex character
}

// Function to convert a hex string to a byte array
int hexStringToByteArray(const char *hexString, unsigned char *byteArray,
                         size_t byteArraySize) {
  size_t hexStringLength = strlen(hexString);

  // Skip the "0x" prefix if present
  size_t startIndex =
      (hexStringLength >= 2 && hexString[0] == '0' && hexString[1] == 'x') ? 2
                                                                           : 0;
  size_t hexDigitsLength = hexStringLength - startIndex;

  if (hexDigitsLength % 2 != 0 || hexDigitsLength / 2 > byteArraySize) {
    // Error: invalid input length
    return -1;
  }

  for (size_t i = 0; i < hexDigitsLength; i += 2) {
    int highNibble = hexCharToInt(hexString[startIndex + i]);
    int lowNibble = hexCharToInt(hexString[startIndex + i + 1]);

    if (highNibble == -1 || lowNibble == -1) {
      // Error: invalid hex character
      return -1;
    }

    byteArray[i / 2] = (highNibble << 4) | lowNibble;
  }
  return 0; // Success
}

/*----------------------------------------------------------------------
    Add Merge header and body of Video & Audio
+----------------------------------------------------------------------*/

void addMergeInputStreams(const char *initFileName, const char *m4sFileName,
                          const char *midFileName) {
  FILE *input1 = fopen(initFileName, "rb");
  FILE *input2 = fopen(m4sFileName, "rb");
  FILE *output = fopen(midFileName, "wb");

  if (input1 == NULL) {
    printf("Error opening input init file\n");
    return;
  }

  if (input2 == NULL) {
    printf("Error opening decrypted file\n");
    return;
  }

  if (output == NULL) {
    printf("Error opening output file\n");
    return;
  }

  char buffer[8192];
  size_t bytesRead;

  while ((bytesRead = fread(buffer, 1, sizeof(buffer), input1)) > 0) {
    fwrite(buffer, 1, bytesRead, output);
  }

  while ((bytesRead = fread(buffer, 1, sizeof(buffer), input2)) > 0) {
    fwrite(buffer, 1, bytesRead, output);
  }

  fclose(input1);
  fclose(input2);
  fclose(output);

  // if (remove(m4sFileName) == 0) {
  //     printf("File '%s' successfully deleted.\n", m4sFileName);
  // } else {
  //     printf("Error %s deleting file",m4sFileName);  // Print error if file
  //     removal fails
  // }

  // printf("Files Merged [%s] [%s]\n", initFileName, m4sFileName);
  return;
}
