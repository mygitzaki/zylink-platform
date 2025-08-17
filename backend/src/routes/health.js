// Health Check Routes - Monitor app status
const express = require('express');
const { healthMonitor } = require('../services/healthMonitor');
const { ErrorBoundary } = require('../services/errorBoundary');
const { safeRoute } = require('../middleware/safetyMiddleware');

const router = express.Router();

// Basic health check
router.get('/', safeRoute(async (req, res) => {
  const health = healthMonitor.getOverallHealth();
  
  res.status(health.status === 'healthy' ? 200 : 503).json({
    success: true,
    ...health
  });
}));

// Detailed system status
router.get('/detailed', safeRoute(async (req, res) => {
  const { getPrisma } = require('../utils/prisma');
  
  const systemInfo = {
    server: {
      status: 'running',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    },
    database: {
      connected: false,
      responsive: false
    },
    impact_api: {
      accessible: false,
      last_check: null
    },
    safety: {
      error_boundary: 'active',
      health_monitoring: 'active',
      request_protection: 'active'
    }
  };

  // Check database
  try {
    const prisma = getPrisma();
    if (prisma) {
      await prisma.$queryRaw`SELECT 1`;
      systemInfo.database.connected = true;
      systemInfo.database.responsive = true;
    }
  } catch (error) {
    systemInfo.database.error = error.message;
  }

  // Check Impact.com API
  try {
    const response = await fetch('https://api.impact.com/Mediapartners/IR6HvVENfaTR3908029jXFhKg7EFcPYDe1', {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from('IR6HvVENfaTR3908029jXFhKg7EFcPYDe1:VdKCaAEqjDjKGmwMX3e.-pehMdm3ZiDd').toString('base64')
      }
    });
    systemInfo.impact_api.accessible = response.ok;
    systemInfo.impact_api.status_code = response.status;
    systemInfo.impact_api.last_check = new Date().toISOString();
  } catch (error) {
    systemInfo.impact_api.error = error.message;
    systemInfo.impact_api.last_check = new Date().toISOString();
  }

  res.json({
    success: true,
    system: systemInfo,
    health: healthMonitor.getOverallHealth()
  });
}));

// Test error handling
router.get('/test-error', safeRoute(async (req, res) => {
  // Intentionally throw error to test safety system
  throw new Error('This is a test error - the app should NOT crash');
}));

// Test database error
router.get('/test-db-error', safeRoute(async (req, res) => {
  const { getPrisma } = require('../utils/prisma');
  const prisma = getPrisma();
  
  // Intentionally bad query
  await prisma.$queryRaw`SELECT * FROM non_existent_table`;
  
  res.json({ message: 'This should not be reached' });
}));

// Memory usage endpoint
router.get('/memory', safeRoute(async (req, res) => {
  const usage = process.memoryUsage();
  
  res.json({
    success: true,
    memory: {
      rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`,
      arrayBuffers: `${(usage.arrayBuffers / 1024 / 1024).toFixed(2)} MB`
    },
    uptime: `${(process.uptime() / 60).toFixed(2)} minutes`,
    timestamp: new Date().toISOString()
  });
}));

module.exports = router;


