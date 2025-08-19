console.log('🚀 SIMPLE SERVER STARTING -', new Date().toISOString());

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 4000;

// Basic CORS for Railway
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log(`🌐 Request: ${req.method} ${req.path} from origin: ${origin}`);
  
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Basic middleware
app.use(express.json());

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  res.json({ message: 'Login endpoint working', timestamp: new Date().toISOString() });
});

// Root redirect
app.get('/', (req, res) => {
  res.json({ message: 'Zylink Backend is running!', timestamp: new Date().toISOString() });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Simple server listening on http://0.0.0.0:${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Port: ${port}`);
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
