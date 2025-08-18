const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (origin.includes('vercel.app')) return true;
  const allowList = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'https://zylink-platform.vercel.app',
    'https://zylink-platform-iuey5dep4-muhammad-zakaryas-projects.vercel.app'
  ];
  return allowList.includes(origin) || /^https:\/\/zylink-platform.*\.vercel\.app$/.test(origin);
}

function getCorsOptions() {
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
    // Allow all Vercel deployments for this project
    /^https:\/\/zylink-platform.*\.vercel\.app$/
  ];

  return {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      console.log(`CORS check for origin: ${origin}`);

      const isAllowed = isOriginAllowed(origin);

      if (isAllowed) {
        console.log(`CORS allowing configured origin: ${origin}`);
        return callback(null, true);
      }

      console.log(`CORS blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'content-type', 'Authorization', 'authorization']
  };
}

function buildSecurityMiddleware() {
  const limiter = rateLimit({ windowMs: 60 * 1000, max: 100 });
  // We rely on applySimpleCors for CORS to avoid conflicts
  return [helmet(), limiter];
}

function applyCorsPreflight(app) {
  // No-op: handled by applySimpleCors
}

function applySimpleCors(app) {
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    // Always respond to preflight early and include ACAO
    if (req.method === 'OPTIONS') {
      res.header('X-Debug-CORS', 'preflight');
      res.header('Access-Control-Allow-Origin', origin || '*');
      res.header('Vary', 'Origin');
      res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, content-type, Authorization, authorization');
      return res.sendStatus(204);
    }

    if (isOriginAllowed(origin)) {
      res.header('X-Debug-CORS', 'runtime');
      res.header('Access-Control-Allow-Origin', origin || '*');
      res.header('Vary', 'Origin');
      res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, content-type, Authorization, authorization');
    }
    next();
  });
}

module.exports = { buildSecurityMiddleware, applyCorsPreflight, applySimpleCors };


