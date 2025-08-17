// Safety Middleware - Protects all routes from crashing
const { ErrorBoundary } = require('../services/errorBoundary');

// Request timeout middleware
const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        console.warn(`⏰ Request timeout: ${req.method} ${req.path}`);
        res.status(408).json({ 
          success: false, 
          message: 'Request timeout - but app is still running' 
        });
      }
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));
    
    next();
  };
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log(`📝 [${timestamp}] ${req.method} ${req.path} - Started`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusEmoji = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅';
    
    console.log(`${statusEmoji} [${timestamp}] ${req.method} ${req.path} - ${status} (${duration}ms)`);
  });
  
  next();
};

// Memory monitoring middleware
const memoryMonitor = (req, res, next) => {
  const usage = process.memoryUsage();
  const memoryMB = usage.heapUsed / 1024 / 1024;
  
  if (memoryMB > 400) { // Warning threshold
    console.warn(`🧠 High memory usage: ${memoryMB.toFixed(2)}MB`);
  }
  
  next();
};

// Rate limiting middleware (prevents overload)
const rateLimiter = () => {
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100; // Max requests per minute
    
    if (!requests.has(ip)) {
      requests.set(ip, []);
    }
    
    const userRequests = requests.get(ip);
    
    // Clean old requests
    const recentRequests = userRequests.filter(time => now - time < windowMs);
    requests.set(ip, recentRequests);
    
    if (recentRequests.length >= maxRequests) {
      console.warn(`🚦 Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({
        success: false,
        message: 'Too many requests - please slow down'
      });
    }
    
    recentRequests.push(now);
    next();
  };
};

// Database connection checker
const dbHealthCheck = (req, res, next) => {
  const { getPrisma } = require('../utils/prisma');
  const prisma = getPrisma();
  
  if (!prisma) {
    console.error('❌ Database not available');
    return res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable - please try again'
    });
  }
  
  next();
};

// Comprehensive safety wrapper for routes
const safeRoute = (handler) => {
  return ErrorBoundary.safeRoute(async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      console.error(`🛡️ Route error in ${req.method} ${req.path}:`, error.message);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'An error occurred, but the system is stable',
          path: req.path,
          method: req.method,
          timestamp: new Date().toISOString()
        });
      }
    }
  });
};

// Emergency shutdown prevention
const preventShutdown = () => {
  ['SIGTERM', 'SIGINT'].forEach(signal => {
    process.on(signal, () => {
      console.log(`🛑 Received ${signal} - but preventing shutdown for safety`);
      console.log('💡 Use "pkill -f node" if you really want to stop the server');
    });
  });
};

module.exports = {
  requestTimeout,
  requestLogger,
  memoryMonitor,
  rateLimiter,
  dbHealthCheck,
  safeRoute,
  preventShutdown
};


