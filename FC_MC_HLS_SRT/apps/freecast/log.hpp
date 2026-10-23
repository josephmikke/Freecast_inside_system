#ifndef LOGGER_HPP
#define LOGGER_HPP

#include <iostream>
#include <fstream>
#include <sstream>
#include <ctime>
#include <mutex>
#include <vector>
#include <iomanip>
#include <unistd.h>
#include <chrono>

enum class LogLevel {
    DEBUG,
    INFO,
    WARNING,
    ERROR,
    FATAL
};

class Logger {
private:
    static LogLevel current_level;
    static std::ofstream log_file;
    static std::mutex log_mutex;
    static pid_t process_id;
    static std::string map_name;
    static std::vector<std::string> log_file_buffer;
    static const size_t LOG_BUFFER_SIZE = 1;

    static void flush_buffer();
    static std::string getTimestamp();
    static bool shouldLog(LogLevel msgLevel);

public:
    static void init(const std::string& log_path, const std::string& map_n, LogLevel level = LogLevel::INFO);
    static void cleanup();
    static std::string levelToString(LogLevel level);
    static void setLogLevel(const std::string& level);

    template<typename... Args>
    static void log(LogLevel level, Args... args) {
        if (shouldLog(level)) {
            std::lock_guard<std::mutex> lock(log_mutex);
            std::stringstream ss;
            ss << "[" << getTimestamp() << "] ";
            
            ss << "[" << levelToString(level) << "] ";
            ss << "[MAP:" << map_name << "] ";
            ss << "[PID:" << process_id << "] ";
            
            (ss << ... << args) << std::endl;
            // std::cout << ss.str();
            log_file_buffer.push_back(ss.str());

            if (log_file_buffer.size() >= LOG_BUFFER_SIZE) {
                flush_buffer();
            }
        }
    }
};

#define LOG_DEBUG(...) Logger::log(LogLevel::DEBUG, __VA_ARGS__)
#define LOG_INFO(...) Logger::log(LogLevel::INFO, __VA_ARGS__)
#define LOG_WARN(...) Logger::log(LogLevel::WARNING, __VA_ARGS__)
#define LOG_ERROR(...) Logger::log(LogLevel::ERROR, __VA_ARGS__)
#define LOG_FATAL(...) Logger::log(LogLevel::FATAL, __VA_ARGS__)

#endif // LOGGER_HPP