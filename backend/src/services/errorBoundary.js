// Error Boundary Service - Prevents any errors from crashing the app
class ErrorBoundary {
  constructor() {
    this.setupGlobalErrorHandlers();
  }

  // Catch all uncaught exceptions
  setupGlobalErrorHandlers() {
    process.on('uncaughtException', (error) => {
      console.error('🚨 UNCAUGHT EXCEPTION - App would have crashed, but we caught it:');
      console.error(error);
      
      // Log to file/service for debugging
      ErrorBoundary.logCriticalError('uncaughtException', error);
      
      // App continues running instead of crashing
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 UNHANDLED REJECTION - App would have crashed, but we caught it:');
      console.error('Reason:', reason);
      console.error('Promise:', promise);
      
      ErrorBoundary.logCriticalError('unhandledRejection', reason);
      
      // App continues running instead of crashing
    });
  }

  // Safe wrapper for any function
  static safeExecute(fn, fallbackValue = null, context = 'unknown') {
    return async (...args) => {
      try {
        const result = await fn(...args);
        return result;
      } catch (error) {
        console.error(`🛡️ SAFE EXECUTE caught error in ${context}:`, error.message);
        
        // Log error but don't crash
        ErrorBoundary.logError(context, error);
        
        // Return safe fallback value
        return fallbackValue;
      }
    };
  }

  // Safe database operation wrapper
  static safeDatabaseOperation(operation, fallbackValue = null) {
    return ErrorBoundary.safeExecute(operation, fallbackValue, 'database');
  }

  // Safe API call wrapper
  static safeApiCall(apiCall, fallbackValue = null) {
    return ErrorBoundary.safeExecute(apiCall, fallbackValue, 'api');
  }

  // Safe route handler wrapper
  static safeRoute(handler) {
    return async (req, res, next) => {
      try {
        await handler(req, res, next);
      } catch (error) {
        console.error('🛡️ ROUTE ERROR caught:', error.message);
        
        // Log error
        ErrorBoundary.logError('route', error);
        
        // Send safe error response instead of crashing
        if (!res.headersSent) {
          res.status(500).json({ 
            success: false,
            message: 'An error occurred, but the app is still running',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
          });
        }
      }
    };
  }

  // Logging system
  static logError(context, error) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      context,
      message: error.message,
      stack: error.stack,
      severity: 'error'
    };
    
    // Log to console
    console.error(`[${timestamp}] ERROR in ${context}:`, error.message);
    
    // In production, you could send to logging service
    // Example: await sendToLoggingService(logEntry);
  }

  static logCriticalError(type, error) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      type,
      message: error.message || error,
      stack: error.stack,
      severity: 'critical'
    };
    
    console.error(`[${timestamp}] CRITICAL ${type}:`, error.message || error);
    
    // In production, send immediate alert
    // Example: await sendCriticalAlert(logEntry);
  }

  // Health check system
  static getHealthStatus() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    };
  }
}

module.exports = { ErrorBoundary };
