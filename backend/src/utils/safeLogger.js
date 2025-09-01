// Safe Logger - Production-optimized logging utility

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'; // debug, info, warn, error

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLogLevel = LOG_LEVELS[LOG_LEVEL] || LOG_LEVELS.info;

/**
 * Safe logger that respects production environment and log levels
 */
class SafeLogger {
  static debug(message, ...args) {
    if (currentLogLevel <= LOG_LEVELS.debug && !IS_PRODUCTION) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
  
  static info(message, ...args) {
    if (currentLogLevel <= LOG_LEVELS.info) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }
  
  static warn(message, ...args) {
    if (currentLogLevel <= LOG_LEVELS.warn) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }
  
  static error(message, ...args) {
    if (currentLogLevel <= LOG_LEVELS.error) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
  
  // Security-specific logging (always logged)
  static security(message, ...args) {
    console.error(`[SECURITY] ${message}`, ...args);
  }
  
  // Performance-specific logging (only in debug mode)
  static performance(message, ...args) {
    if (!IS_PRODUCTION && currentLogLevel <= LOG_LEVELS.debug) {
      console.log(`[PERF] ${message}`, ...args);
    }
  }
}

module.exports = SafeLogger;
