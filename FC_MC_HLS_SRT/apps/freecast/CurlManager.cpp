#include "CurlManager.h"
#include <regex>
#include <iostream>
#include <unistd.h>
#include <cstring> // for memcpy
#include <iomanip>

// Initialize static members
CurlManager* CurlManager::instance = nullptr;
std::mutex CurlManager::instanceMutex;

// Callback functions for curl
size_t WriteCallback_String(void* contents, size_t size, size_t nmemb, std::string* s) {
    size_t totalSize = size * nmemb;
    s->append((char*)contents, totalSize);
    return totalSize;
}

size_t WriteCallback_Vector(void* contents, size_t size, size_t nmemb, std::vector<uint8_t>* vec) {
    size_t totalSize = size * nmemb;
    size_t oldSize = vec->size();
    vec->resize(oldSize + totalSize);
    memcpy(vec->data() + oldSize, contents, totalSize);
    return totalSize;
}

size_t WriteCallback_File(void* contents, size_t size, size_t nmemb, void* userp) {
    size_t written = fwrite(contents, size, nmemb, (FILE*)userp);
    return written;
}

CurlManager::CurlManager() {
    // Initialize curl globally when the manager is created
    initialize();
}

CurlManager::~CurlManager() {
    // Clean up curl when the manager is destroyed
    cleanup();
}

CurlManager* CurlManager::getInstance() {
    if (instance == nullptr) {
        std::lock_guard<std::mutex> lock(instanceMutex);
        if (instance == nullptr) {
            instance = new CurlManager();
        }
    }
    return instance;
}

bool CurlManager::initialize() {
    CURLcode code = curl_global_init(CURL_GLOBAL_ALL);
    if (code != CURLE_OK) {
        printf("Failed to initialize curl globally: %s\n", curl_easy_strerror(code));
        return false;
    }
    printf("Curl initialized globally\n");
    return true;
}

void CurlManager::cleanup() {
    curl_global_cleanup();
    printf("Curl global cleanup completed\n");
}

std::string CurlManager::extractDomain(const std::string& url) {
    std::regex domainRegex("^(?:https?://)?([^:/]+)");
    std::smatch match;
    if (std::regex_search(url, match, domainRegex) && match.size() > 1) {
        return match[1].str();
    }
    return url; // Return the full URL if we can't extract the domain
}

// Helper method to get appropriate max retries based on content type
int CurlManager::getMaxRetries(ContentType contentType) {
    return (contentType == LIVE) ? LIVE_MAX_RETRIES : DEFAULT_MAX_RETRIES;
}

// Helper method to get appropriate recovery timeout based on content type
int CurlManager::getRecoveryTimeout(ContentType contentType) {
    return (contentType == LIVE) ? LIVE_RECOVERY_TIMEOUT_MS : RECOVERY_TIMEOUT_MS;
}

std::string CurlManager::url_encode(const std::string &value) {
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

// Helper method to calculate backoff time based on attempt number and content type
int CurlManager::getBackoffTime(int attempt, ContentType contentType) {
    int baseMs = (contentType == LIVE) ? LIVE_BACKOFF_BASE_MS : VOD_BACKOFF_BASE_MS;
    int jitterMs = rand() % 100; // Add a small amount of jitter (0-100ms)

    // For live content, use a more gentle backoff curve
    if (contentType == LIVE) {
        return (baseMs * (attempt + 1) + jitterMs);
    } else {
        // For VOD, use the original exponential backoff
        return (baseMs * (attempt + 1) + jitterMs);
    }
}

bool CurlManager::canMakeRequest(const std::string& url, ContentType contentType) {
    std::string domain = extractDomain(url);

    // For live content, be more lenient with the circuit breaker
    if (contentType == LIVE) {
        // For live content, we'll always allow the request
        // This is a critical change to prevent the daemon from being killed unexpectedly
        // printf("Live content detected for domain %s, bypassing circuit breaker completely\n", domain.c_str());
        return true;
    }

    // For VOD content, use the normal circuit breaker logic
    std::lock_guard<std::mutex> lock(statsMutex);

    // If domain not in stats, add it with default values
    if (domainStats.find(domain) == domainStats.end()) {
        domainStats[domain] = DomainStats();
        return true;
    }

    DomainStats& stats = domainStats[domain];

    // Check circuit breaker state for VOD content
    switch (stats.state) {
        case CLOSED:
            return true;

        case OPEN: {
            // Check if recovery timeout has elapsed
            auto now = std::chrono::steady_clock::now();
            auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
                now - stats.lastFailureTime).count();

            if (elapsed > RECOVERY_TIMEOUT_MS) {
                // Transition to half-open state
                stats.state = HALF_OPEN;
                printf("Circuit breaker for domain %s transitioning to HALF_OPEN state\n", domain.c_str());
                return true;
            }

            printf("Circuit breaker for domain %s is OPEN, request blocked\n", domain.c_str());
            return false;
        }

        case HALF_OPEN:
            // Allow one test request in half-open state
            return true;
    }

    return true;
}

void CurlManager::updateStats(const std::string& url, bool success, CURLcode res, ContentType contentType) {
    std::string domain = extractDomain(url);
    std::lock_guard<std::mutex> lock(statsMutex);

    DomainStats& stats = domainStats[domain];
    stats.totalRequests++;

    if (success) {
        stats.successfulRequests++;
        stats.consecutiveFailures = 0;

        // If in half-open state and request succeeded, transition to closed
        if (stats.state == HALF_OPEN) {
            stats.state = CLOSED;
            printf("Circuit breaker for domain %s reset to CLOSED state\n", domain.c_str());
        }
    } else {
        stats.failedRequests++;

        // For live content, we don't want to increment consecutive failures
        // This is to prevent the circuit breaker from opening for live content
        if (contentType == LIVE) {
            // For live content, just log the error but don't increment consecutive failures
            printf("Curl error for live content domain %s: %s (not counting toward circuit breaker)\n",
                    domain.c_str(), curl_easy_strerror(res));
        } else {
            // For VOD content, use the normal circuit breaker logic
            stats.consecutiveFailures++;
            stats.lastFailureTime = std::chrono::steady_clock::now();

            // Log the specific curl error
            printf("Curl error for domain %s: %s\n", domain.c_str(), curl_easy_strerror(res));

            // If consecutive failures exceed threshold, open the circuit breaker
            if (stats.consecutiveFailures >= FAILURE_THRESHOLD) {
                if (stats.state != OPEN) {
                    stats.state = OPEN;
                    printf("Circuit breaker for domain %s opened after %d consecutive failures\n",
                             domain.c_str(), stats.consecutiveFailures);
                }
            }

            // If in half-open state and request failed, go back to open
            if (stats.state == HALF_OPEN) {
                stats.state = OPEN;
                printf("Circuit breaker for domain %s returning to OPEN state after test failure\n", domain.c_str());
            }
        }
    }
}

void CurlManager::configureCurlHandle(CURL* curl, const std::string& url, ContentType contentType) {
    if (!curl) return;

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0);
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);

    // Use shorter timeout for live content
    int timeout = (contentType == LIVE) ? LIVE_TIMEOUT : DEFAULT_TIMEOUT;
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, timeout);

    curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT, DEFAULT_CONNECT_TIMEOUT);
    curl_easy_setopt(curl, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
    curl_easy_setopt(curl, CURLOPT_TCP_KEEPALIVE, 1L);

    // For live content, use more aggressive TCP keepalive settings
    if (contentType == LIVE) {
        curl_easy_setopt(curl, CURLOPT_TCP_KEEPIDLE, 30L);  // Start keepalive after 30 seconds
        curl_easy_setopt(curl, CURLOPT_TCP_KEEPINTVL, 15L); // 15 second interval
    } else {
        curl_easy_setopt(curl, CURLOPT_TCP_KEEPIDLE, 120L);
        curl_easy_setopt(curl, CURLOPT_TCP_KEEPINTVL, 60L);
    }

    // Shorter DNS cache timeout for live content to handle dynamic CDN changes
    curl_easy_setopt(curl, CURLOPT_DNS_CACHE_TIMEOUT, (contentType == LIVE) ? 30L : 60L);

    // Add low speed limits to detect stalled transfers
    curl_easy_setopt(curl, CURLOPT_LOW_SPEED_LIMIT, DEFAULT_LOW_SPEED_LIMIT);
    curl_easy_setopt(curl, CURLOPT_LOW_SPEED_TIME, DEFAULT_LOW_SPEED_TIME);
}

bool CurlManager::downloadFile(const std::string& url, const std::string& outputPath, int maxRetries, ContentType contentType) {
    std::string encoded_url = url_encode(url);

    // Use content-type specific max retries if not explicitly specified
    if (maxRetries < 0) maxRetries = getMaxRetries(contentType);

    // Check circuit breaker with content type awareness
    if (!canMakeRequest(encoded_url, contentType)) {
        printf("Circuit breaker prevented request to %s\n", encoded_url.c_str());
        return false;
    }

    CURL* curl = nullptr;
    CURLcode res;
    bool success = false;
    int attempt = 0;

    // Try to initialize curl
    while (attempt < maxRetries) {
        curl = curl_easy_init();
        if (curl) break;

        printf("downloadFile => Attempt %d: Failed to initialize libcurl\n", attempt + 1);
        usleep(getBackoffTime(attempt, contentType) * 1000); // Use adaptive backoff
        attempt++;
    }

    if (!curl) {
        printf("downloadFile => Failed to initialize curl after %d attempts\n", maxRetries);
        updateStats(encoded_url, false, CURLE_FAILED_INIT, contentType);
        return false;
    }

    FILE* fp = fopen(outputPath.c_str(), "wb");
    if (!fp) {
        printf("Failed to open file for writing: %s\n", outputPath.c_str());
        curl_easy_cleanup(curl);
        updateStats(encoded_url, false, CURLE_WRITE_ERROR, contentType);
        return false;
    }

    // Configure curl handle with content type awareness
    configureCurlHandle(curl, encoded_url, contentType);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback_File);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, fp);

    // Perform the download with retries
    attempt = 0;
    do {
        res = curl_easy_perform(curl);
        if (res == CURLE_OK) {
            long response_code = 0;
            curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response_code);
            if (response_code == 200) {
                success = true;
                break;
            } else {
                printf("HTTP Error: %ld for URL: %s\n", response_code, encoded_url.c_str());

                // Special handling for 404 errors
                if (response_code == 404) {
                    if (contentType == LIVE) {
                        // For LIVE content, break immediately on 404 errors
                        printf("404 error for live content, breaking immediately for URL: %s\n", encoded_url.c_str());
                        success = false; // Ensure we return failure
                        break;
                    } else {
                        // For VOD content, continue with retries
                        printf("404 error for VOD content, continuing with retry for URL: %s\n", encoded_url.c_str());
                        // Continue with retry
                    }
                }
                // For other error codes (400, 401), use normal handling
                else if (response_code == 400 || response_code == 401) {
                    printf("HTTP Error %ld, continuing with retry for URL: %s\n", response_code, encoded_url.c_str());
                }
                // For any other error codes
                else {
                    printf("Unexpected HTTP Error %ld for URL: %s, continuing with retry\n", response_code, encoded_url.c_str());
                }
            }
        } else {
            printf("downloadFile => Attempt %d failed: %s for URL: %s\n",
                    attempt + 1, curl_easy_strerror(res), encoded_url.c_str());
        }

        // Use adaptive backoff based on content type
        usleep(getBackoffTime(attempt, contentType) * 1000);
    } while (++attempt < maxRetries);

    // Cleanup
    fclose(fp);
    curl_easy_cleanup(curl);

    // Update statistics
    updateStats(encoded_url, success, res, contentType);

    return success;
}

bool CurlManager::fetchContent(const std::string& url, std::string& content, int maxRetries, ContentType contentType) {
    std::string encoded_url = url_encode(url);

    // Use content-type specific max retries if not explicitly specified
    if (maxRetries < 0) maxRetries = getMaxRetries(contentType);

    // Check circuit breaker with content type awareness
    if (!canMakeRequest(encoded_url, contentType)) {
        printf("Circuit breaker prevented request to %s\n", encoded_url.c_str());
        return false;
    }

    CURL* curl = nullptr;
    CURLcode res;
    int attempt = 0;

    // Try to initialize curl
    while (attempt < maxRetries) {
        curl = curl_easy_init();
        if (curl) break;

        printf("fetchContent => Attempt %d: Failed to initialize libcurl\n", attempt + 1);
        usleep(getBackoffTime(attempt, contentType) * 1000); // Use adaptive backoff
        attempt++;
    }

    if (!curl) {
        printf("fetchContent => Failed to initialize curl after %d attempts\n", maxRetries);
        updateStats(encoded_url, false, CURLE_FAILED_INIT, contentType);
        return false;
    }

    // Configure curl handle with content type awareness
    configureCurlHandle(curl, encoded_url, contentType);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback_String);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &content);

    // Perform the download with retries
    attempt = 0;
    bool success = false;

    do {
        content.clear(); // Clear content before each attempt
        res = curl_easy_perform(curl);
        if (res == CURLE_OK) {
            long response_code = 0;
            curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response_code);
            if (response_code == 200) {
                success = true;
                break;
            } else {
                printf("HTTP Error: %ld for URL: %s\n", response_code, encoded_url.c_str());

                // Special handling for 404 errors
                if (response_code == 404) {
                    if (contentType == LIVE) {
                        // For LIVE content, break immediately on 404 errors
                        printf("404 error for live content, breaking immediately for URL: %s\n", encoded_url.c_str());
                        success = false; // Ensure we return failure
                        break;
                    } else {
                        // For VOD content, continue with retries
                        printf("404 error for VOD content, continuing with retry for URL: %s\n", encoded_url.c_str());
                        // Continue with retry
                    }
                }
                // For other error codes (400, 401), use normal handling
                else if (response_code == 400 || response_code == 401) {
                    printf("HTTP Error %ld, continuing with retry for URL: %s\n", response_code, encoded_url.c_str());
                }
                // For any other error codes
                else {
                    printf("Unexpected HTTP Error %ld for URL: %s, continuing with retry\n", response_code, encoded_url.c_str());
                }
            }
        } else {
            printf("fetchContent => Attempt %d failed: %s for URL: %s\n",
                    attempt + 1, curl_easy_strerror(res), encoded_url.c_str());
        }

        // Use adaptive backoff based on content type
        usleep(getBackoffTime(attempt, contentType) * 1000);
    } while (++attempt < maxRetries);

    curl_easy_cleanup(curl);

    // Update statistics
    updateStats(encoded_url, success, res, contentType);

    return success;
}

bool CurlManager::fetchFileContent(const std::string& url, std::vector<uint8_t>& content, int maxRetries, ContentType contentType) {
    std::string encoded_url = url_encode(url);

    // Use content-type specific max retries if not explicitly specified
    if (maxRetries < 0) maxRetries = getMaxRetries(contentType);

    // Check circuit breaker with content type awareness
    if (!canMakeRequest(encoded_url, contentType)) {
        printf("Circuit breaker prevented request to %s\n", encoded_url.c_str());
        return false;
    }

    CURL* curl = nullptr;
    CURLcode res;
    int attempt = 0;

    // Try to initialize curl
    while (attempt < maxRetries) {
        curl = curl_easy_init();
        if (curl) break;

        printf("fetchFileContent => Attempt %d: Failed to initialize libcurl\n", attempt + 1);
        usleep(getBackoffTime(attempt, contentType) * 1000); // Use adaptive backoff
        attempt++;
    }

    if (!curl) {
        printf("fetchFileContent => Failed to initialize curl after %d attempts\n", maxRetries);
        updateStats(encoded_url, false, CURLE_FAILED_INIT, contentType);
        return false;
    }

    // Configure curl handle with content type awareness
    configureCurlHandle(curl, encoded_url, contentType);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback_Vector);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &content);

    // Perform the download with retries
    attempt = 0;
    bool success = false;

    do {
        content.clear(); // Clear content before each attempt
        res = curl_easy_perform(curl);
        if (res == CURLE_OK) {
            long response_code = 0;
            curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response_code);
            if (response_code == 200) {
                success = true;
                break;
            } else {
                printf("HTTP Error: %ld for URL: %s\n", response_code, encoded_url.c_str());

                // Special handling for 404 errors
                if (response_code == 404) {
                    if (contentType == LIVE) {
                        // For LIVE content, break immediately on 404 errors
                        printf("404 error for live content, breaking immediately for URL: %s\n", encoded_url.c_str());
                        success = false; // Ensure we return failure
                        break;
                    } else {
                        // For VOD content, continue with retries
                        printf("404 error for VOD content, continuing with retry for URL: %s\n", encoded_url.c_str());
                        // Continue with retry
                    }
                }

                // For other error codes (400, 401), use normal handling
                else if (response_code == 400 || response_code == 401) {
                    printf("HTTP Error %ld, continuing with retry for URL: %s\n", response_code, encoded_url.c_str());
                }
                // For any other error codes
                else {
                    printf("Unexpected HTTP Error %ld for URL: %s, continuing with retry\n", response_code, encoded_url.c_str());
                }
            }
        } else {
            printf("fetchFileContent => Attempt %d failed: %s for URL: %s\n",
                    attempt + 1, curl_easy_strerror(res), encoded_url.c_str());
        }

        // Use adaptive backoff based on content type
        usleep(getBackoffTime(attempt, contentType) * 1000);
    } while (++attempt < maxRetries);

    curl_easy_cleanup(curl);

    // Update statistics
    updateStats(encoded_url, success, res, contentType);

    return success;
}

DomainStats CurlManager::getDomainStats(const std::string& url) {
    std::string domain = extractDomain(url);
    std::lock_guard<std::mutex> lock(statsMutex);

    if (domainStats.find(domain) == domainStats.end()) {
        return DomainStats();
    }

    return domainStats[domain];
}

void CurlManager::resetCircuitBreaker(const std::string& url) {
    std::string domain = extractDomain(url);
    std::lock_guard<std::mutex> lock(statsMutex);

    if (domainStats.find(domain) != domainStats.end()) {
        domainStats[domain].consecutiveFailures = 0;
        domainStats[domain].state = CLOSED;
        printf("Circuit breaker for domain %s manually reset to CLOSED state\n", domain.c_str());
    }
}
