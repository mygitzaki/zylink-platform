console.log('🚀 SERVER STARTING - VERSION WITH IMPACT DATE FORMAT FIX - 2025-08-20T14:00:00.000Z');

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { buildSecurityMiddleware } = require('./src/middleware/security');
const cookieParser = require('cookie-parser');

// 🛡️ SAFETY SYSTEMS - Prevent crashes
const { ErrorBoundary } = require('./src/services/errorBoundary');
const { healthMonitor } = require('./src/services/healthMonitor');
const { 
  requestTimeout, 
  requestLogger, 
  memoryMonitor, 
  rateLimiter, 
  preventShutdown 
} = require('./src/middleware/safetyMiddleware');

dotenv.config();

// Initialize safety systems
new ErrorBoundary();
preventShutdown();

const app = express();
const port = Number(process.env.PORT) || 4000;

// Trust proxy for Railway deployment
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Simplified CORS configuration - single, clear implementation
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  console.log(`🌐 CORS Request: ${req.method} ${req.path} from origin: ${origin}`);
  
  // Allow Vercel domains, localhost, and custom domains
  if (origin && (
    origin.includes('vercel.app') || 
    origin.includes('localhost') ||
    origin.includes('zylink-platform.vercel.app') ||
    origin.includes('zylike.com')
  )) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Vary', 'Origin');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      console.log('🔄 Handling OPTIONS preflight');
      return res.status(200).end();
    }
  }
  
  next();
});

// 🛡️ Safety middleware (before everything else)
app.use(requestTimeout(30000)); // 30 second timeout
app.use(requestLogger);
app.use(memoryMonitor);

// Logging and parsers
app.use(morgan('dev'));
app.use(express.json());

// Security middlewares
app.use(...buildSecurityMiddleware());
app.use(cookieParser());

// Apply custom rate limiter
app.use(rateLimiter());

// Serve the docs directory statically but only allow GET/HEAD
app.use('/docs', (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).send('Method Not Allowed');
  }
  next();
});

// Try multiple possible paths for docs directory
const possibleDocsPaths = [
  path.join(__dirname, '..', 'docs'),     // Local development
  path.join(process.cwd(), 'docs'),       // Railway deployment
  path.join(__dirname, 'docs')            // Alternative structure
];

let docsPath = possibleDocsPaths[0]; // Default
for (const testPath of possibleDocsPaths) {
  try {
    const fs = require('fs');
    if (fs.existsSync(testPath)) {
      docsPath = testPath;
      console.log(`📁 Using docs path: ${docsPath}`);
      break;
    }
  } catch (err) {
    // Continue to next path
  }
}

app.use('/docs', express.static(docsPath, {
  extensions: ['html'],
  index: false,
  fallthrough: false
}));

// 🛡️ Health monitoring endpoint (first priority)
app.use('/api/health', require('./src/routes/health'));

// 🧪 Safe testing endpoint (for development safety)
app.use('/api/safe-test', require('./src/routes/safeTesting'));

// API routes (stubs per guide)
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/creator', require('./src/routes/creator'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/links', require('./src/routes/links'));
app.use('/api/webhooks', require('./src/routes/webhooks'));
app.use('/api/shortlinks', require('./src/routes/shortlinks'));
app.use('/api/analytics', require('./src/routes/analytics'));

// Redirect root to the docs html explicitly
app.get('/', (req, res) => {
  res.redirect('/docs/ZYLINK_DOCUMENTATION_SIMPLE.html');
});

// Public shortlink redirect per guide (support GET and HEAD)
async function handleShortRedirect(req, res) {
  try {
    // Lazy load getPrisma only when needed
    const { getPrisma } = require('./src/utils/prisma');
    const prisma = getPrisma();
    
    if (!prisma) {
      const { getShortLink } = require('./src/utils/memoryStore');
      const url = getShortLink(req.params.shortCode);
      if (!url) return res.status(404).send('Not found');
      return res.redirect(url);
    }
    const { shortCode } = req.params;
    const short = await prisma.shortLink.findUnique({ where: { shortCode } });
    if (!short || !short.originalUrl) return res.status(404).send('Not found');
    await prisma.shortLink.update({ where: { shortCode }, data: { clicks: { increment: 1 } } });
    return res.redirect(short.originalUrl);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }
}

app.get('/s/:shortCode', handleShortRedirect);
app.get('/:shortCode', handleShortRedirect); // Handle short links at root path for s.zylike.com
app.head('/s/:shortCode', handleShortRedirect);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Internal Server Error');
});

const server = app
  .listen(port, '0.0.0.0', () => {
    console.log(`Backend listening on http://0.0.0.0:${port}`);
    console.log('Docs available at /docs/ZYLINK_DOCUMENTATION_SIMPLE.html');
  })
  .on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Update backend/.env PORT or stop the conflicting process.`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });


