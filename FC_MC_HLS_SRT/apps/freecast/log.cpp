#include "log.hpp"
// Initialize static members
LogLevel Logger::current_level = LogLevel::INFO;
std::ofstream Logger::log_file;
std::mutex Logger::log_mutex;
pid_t Logger::process_id = 0;
std::string Logger::map_name;
std::vector<std::string> Logger::log_file_buffer;

void Logger::flush_buffer() {
    if (log_file.is_open() && !log_file_buffer.empty()) {
        for (const auto& msg : log_file_buffer) {
            log_file << msg;
        }
        log_file.flush();
        log_file_buffer.clear();
    }
}

std::string Logger::getTimestamp() {
    auto now = std::chrono::system_clock::now();
    auto now_c = std::chrono::system_clock::to_time_t(now);
    
    char buffer[26];
    struct tm* tm_info = localtime(&now_c);
    strftime(buffer, 26, "%Y-%m-%d %H:%M:%S", tm_info);
    
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()) % 1000;
        
    std::stringstream ss;
    ss << buffer << "." << std::setfill('0') << std::setw(3) << ms.count();
    return ss.str();
}

bool Logger::shouldLog(LogLevel msgLevel) {
    return static_cast<int>(msgLevel) >= static_cast<int>(current_level);
}

void Logger::init(const std::string& log_path, const std::string& map_n, LogLevel level) {
    if (log_file.is_open()) {
        return;
    }
    current_level = level;
    process_id = getpid();
    map_name = map_n;
    
    std::lock_guard<std::mutex> lock(log_mutex);
    log_file.open(log_path, std::ios::app);
    
    std::stringstream ss;
    ss << "[" << getTimestamp() << "] "
       << "[INFO] "
       << "[MAP:" << map_name << "] "
       << "[PID:" << process_id << "] "
       << "Logger initialized for process " << process_id << std::endl;
       
    std::cout << ss.str();
    if (log_file.is_open()) {
        log_file << ss.str();
        log_file.flush();
    }
}

std::string Logger::levelToString(LogLevel level) {
    switch(level) {
        case LogLevel::DEBUG: return "DEBUG";
        case LogLevel::INFO: return "INFO";
        case LogLevel::WARNING: return "WARNING";
        case LogLevel::ERROR: return "ERROR";
        case LogLevel::FATAL: return "FATAL";
        default: return "UNKNOWN";
    }
}

void Logger::setLogLevel(const std::string& level) {
    std::lock_guard<std::mutex> lock(log_mutex);
    LogLevel oldLevel = current_level;
    
    if (level == "DEBUG") current_level = LogLevel::DEBUG;
    else if (level == "INFO") current_level = LogLevel::INFO;
    else if (level == "WARNING") current_level = LogLevel::WARNING;
    else if (level == "ERROR") current_level = LogLevel::ERROR;
    else if (level == "FATAL") current_level = LogLevel::FATAL;
    else return;

    log(LogLevel::INFO, "Log level changed from ", 
        levelToString(oldLevel), " to ", levelToString(current_level));
}

void Logger::cleanup() {
    std::lock_guard<std::mutex> lock(log_mutex);
    flush_buffer();
    if (log_file.is_open()) {
        log_file.close();
    }
}