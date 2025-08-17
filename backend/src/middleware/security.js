const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

function buildSecurityMiddleware() {
  const limiter = rateLimit({ windowMs: 60 * 1000, max: 100 });
  
  // Allow multiple origins for development
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175'
  ];
  
  const corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  };
  
  return [helmet(), cors(corsOptions), limiter];
}

module.exports = { buildSecurityMiddleware };


