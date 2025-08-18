const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

function buildSecurityMiddleware() {
  const limiter = rateLimit({ windowMs: 60 * 1000, max: 100 });
  
  // Allow multiple origins for development and production
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    // Production Vercel domains
    'https://zylink-platform.vercel.app',
    'https://zylink-platform-iuey5dep4-muhammad-zakaryas-projects.vercel.app',
    // Allow all Vercel preview deployments - fixed regex
    /^https:\/\/zylink-platform-[a-zA-Z0-9-]+\.vercel\.app$/,
    // Allow all variations of this specific deployment
    /^https:\/\/zylink-platform-.*muhammad-zakaryas-projects\.vercel\.app$/
  ];
  
  const corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check string origins
      if (allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return allowed === origin;
        } else if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return false;
      })) {
        callback(null, true);
      } else {
        console.log(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  };
  
  return [helmet(), cors(corsOptions), limiter];
}

module.exports = { buildSecurityMiddleware };


