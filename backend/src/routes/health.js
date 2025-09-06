// Health Check Routes - Monitor app status
const express = require('express');
const { healthMonitor } = require('../services/healthMonitor');
const { ErrorBoundary } = require('../services/errorBoundary');
const { safeRoute } = require('../middleware/safetyMiddleware');
const { getPrisma } = require('../utils/prisma');

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
    const accountSid = process.env.IMPACT_ACCOUNT_SID;
    const authToken = process.env.IMPACT_AUTH_TOKEN;
    const apiBase = process.env.IMPACT_API_BASE_URL || 'https://api.impact.com';
    
    if (!accountSid || !authToken) {
      systemInfo.impact_api.error = 'Missing environment variables';
      systemInfo.impact_api.last_check = new Date().toISOString();
    } else {
      const response = await fetch(`${apiBase}/Mediapartners/${accountSid}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
        }
      });
      systemInfo.impact_api.accessible = response.ok;
      systemInfo.impact_api.status_code = response.status;
      systemInfo.impact_api.last_check = new Date().toISOString();
    }
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

// Payment health check endpoint
router.get('/payment', async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(503).json({ 
        status: 'unhealthy', 
        message: 'Database not configured',
        timestamp: new Date().toISOString()
      });
    }

    // Test PaymentAccount table access
    const tableCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'PaymentAccount'
      ) as exists;
    `;

    // Test accountType column access
    const columnCheck = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'PaymentAccount' AND column_name = 'accountType';
    `;

    // Test basic PaymentAccount query
    const accountCount = await prisma.paymentAccount.count();
    
    // Test include query (like admin endpoint uses)
    const sampleAccount = await prisma.paymentAccount.findFirst({
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      status: 'healthy',
      checks: {
        table_exists: tableCheck[0].exists,
        column_exists: columnCheck.length > 0,
        account_count: accountCount,
        sample_query: sampleAccount ? 'success' : 'no_data',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Payment health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: {
        name: error.name,
        message: error.message,
        code: error.code
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;


