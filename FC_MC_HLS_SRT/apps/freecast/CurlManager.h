#ifndef __CURL_MANAGER_H__
#define __CURL_MANAGER_H__

#include <string>
#include <vector>
#include <map>
#include <mutex>
#include <curl/curl.h>
#include <chrono>
#include <unordered_map>

using namespace std;

// Circuit breaker states
enum CircuitBreakerState {
    CLOSED,     // Normal operation, requests allowed
    OPEN,       // Circuit is open, requests blocked
    HALF_OPEN   // Testing if service is back, allowing one request
};

// Content type for adaptive retry strategy
enum ContentType {
    VOD,        // Video on demand content
    LIVE        // Live streaming content (default)
};

// Structure to track domain statistics for circuit breaker
struct DomainStats {
    CircuitBreakerState state = CLOSED;
    int consecutiveFailures = 0;
    int totalRequests = 0;
    int successfulRequests = 0;
    int failedRequests = 0;
    std::chrono::time_point<std::chrono::steady_clock> lastFailureTime = std::chrono::steady_clock::now();
};

class CurlManager {
private:
    // Singleton instance
    static CurlManager* instance;
    static std::mutex instanceMutex;

    // Circuit breaker settings
    const int FAILURE_THRESHOLD = 5;
    const int RECOVERY_TIMEOUT_MS = 30000; // 30 seconds
    const int LIVE_RECOVERY_TIMEOUT_MS = 5000; // 5 seconds for live content

    // Default settings
    const int DEFAULT_MAX_RETRIES = 3;
    const int LIVE_MAX_RETRIES = 5; // More retries for live content
    const int DEFAULT_CONNECT_TIMEOUT = 10;
    const int DEFAULT_TIMEOUT = 30;
    const int LIVE_TIMEOUT = 15; // Shorter timeout for live content
    const int DEFAULT_LOW_SPEED_LIMIT = 10;
    const int DEFAULT_LOW_SPEED_TIME = 15;

    // Retry backoff settings (in milliseconds)
    const int VOD_BACKOFF_BASE_MS = 2000;  // 2 seconds base for VOD
    const int LIVE_BACKOFF_BASE_MS = 200;  // 200ms base for live content

    // Domain statistics for circuit breaker
    std::unordered_map<std::string, DomainStats> domainStats;
    std::mutex statsMutex;

    // Private constructor for singleton
    CurlManager();

    // Helper methods
    bool initialize();
    void cleanup();
    std::string extractDomain(const std::string& url);
    bool canMakeRequest(const std::string& url, ContentType contentType = LIVE);
    void updateStats(const std::string& url, bool success, CURLcode errorCode, ContentType contentType = LIVE);
    void configureCurlHandle(CURL* curl, const std::string& url, ContentType contentType = LIVE);
    int getBackoffTime(int attempt, ContentType contentType = LIVE);
    int getMaxRetries(ContentType contentType = LIVE);
    int getRecoveryTimeout(ContentType contentType = LIVE);
    std::string url_encode(const std::string &value);

public:
    // Singleton access
    static CurlManager* getInstance();

    // Destructor
    ~CurlManager();

    // Delete copy constructor and assignment operator
    CurlManager(const CurlManager&) = delete;
    CurlManager& operator=(const CurlManager&) = delete;

    // Main curl operations with content type parameter
    bool downloadFile(const std::string& url, const std::string& outputPath, int maxRetries = -1, ContentType contentType = LIVE);
    bool fetchContent(const std::string& url, std::string& content, int maxRetries = -1, ContentType contentType = LIVE);
    bool fetchFileContent(const std::string& url, std::vector<uint8_t>& content, int maxRetries = -1, ContentType contentType = LIVE);

    // Utility methods
    void resetCircuitBreaker(const std::string& url);

    // Get statistics
    DomainStats getDomainStats(const std::string& url);
};

// Callback functions for curl
size_t WriteCallback_String(void* contents, size_t size, size_t nmemb, std::string* s);
size_t WriteCallback_Vector(void* contents, size_t size, size_t nmemb, std::vector<uint8_t>* vec);
size_t WriteCallback_File(void* contents, size_t size, size_t nmemb, void* userp);

#endif // __CURL_MANAGER_H__
