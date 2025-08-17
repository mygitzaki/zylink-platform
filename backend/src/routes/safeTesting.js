// Basic Safe Testing Routes - Test new features safely before implementation
const express = require('express');
const { ErrorBoundary } = require('../services/errorBoundary');

const router = express.Router();

// Simple safety wrapper function
const safeTest = (testFn) => {
  return async (req, res) => {
    try {
      const result = await testFn(req, res);
      if (!res.headersSent) {
        res.json({ success: true, result });
      }
    } catch (error) {
      console.error('🛡️ Safe test error:', error.message);
      if (!res.headersSent) {
        res.json({ 
          success: false, 
          error: error.message,
          message: 'Test failed safely - app is still running'
        });
      }
    }
  };
};

// Basic health test
router.get('/health', safeTest(async (req, res) => {
  return {
    status: 'safety-system-online',
    timestamp: new Date().toISOString(),
    message: 'Safe testing framework is operational'
  };
}));

// Test Impact.com API connectivity safely
router.post('/test-impact-api', safeTest(async (req, res) => {
  console.log('🧪 TESTING: Impact.com API connectivity');
  
  const response = await fetch('https://api.impact.com/Mediapartners/IR6HvVENfaTR3908029jXFhKg7EFcPYDe1', {
    method: 'GET',
    headers: {
      'Authorization': 'Basic ' + Buffer.from('IR6HvVENfaTR3908029jXFhKg7EFcPYDe1:VdKCaAEqjDjKGmwMX3e.-pehMdm3ZiDd').toString('base64')
    }
  });
  
  if (!response.ok) {
    throw new Error(`Impact API Error: ${response.status}`);
  }
  
  return {
    apiStatus: 'connected',
    statusCode: response.status,
    message: 'Impact.com API is accessible',
    safe: true
  };
}));

// Test earnings API safely
router.post('/test-earnings-api', safeTest(async (req, res) => {
  console.log('🧪 TESTING: Impact.com Earnings API');
  
  const response = await fetch('https://api.impact.com/Mediapartners/IR6HvVENfaTR3908029jXFhKg7EFcPYDe1/Actions', {
    method: 'GET',
    headers: {
      'Authorization': 'Basic ' + Buffer.from('IR6HvVENfaTR3908029jXFhKg7EFcPYDe1:VdKCaAEqjDjKGmwMX3e.-pehMdm3ZiDd').toString('base64')
    }
  });
  
  if (!response.ok) {
    throw new Error(`Earnings API Error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return {
    earningsAccess: 'success',
    statusCode: response.status,
    earningsCount: data.Actions?.length || 0,
    hasRealEarnings: (data.Actions?.length || 0) > 0,
    message: 'Earnings API is working',
    safe: true
  };
}));

// Test database operations safely
router.post('/test-database', safeTest(async (req, res) => {
  console.log('🧪 TESTING: Database operations');
  
  const { getPrisma } = require('../utils/prisma');
  const prisma = getPrisma();
  
  if (!prisma) {
    throw new Error('Database not available');
  }
  
  // Test read operation
  const creatorCount = await prisma.creator.count();
  const earningsCount = await prisma.earning.count();
  
  return {
    databaseStatus: 'connected',
    creatorCount,
    earningsCount,
    message: 'Database is operational',
    safe: true
  };
}));

// Comprehensive pre-flight check
router.post('/pre-flight-check', safeTest(async (req, res) => {
  console.log('🛡️ RUNNING: Comprehensive pre-flight safety check');
  
  const results = {
    impact_api: { status: 'unknown', safe: false },
    earnings_api: { status: 'unknown', safe: false },
    database: { status: 'unknown', safe: false },
    memory: { status: 'unknown', safe: false }
  };
  
  // Test Impact.com API
  try {
    const apiResponse = await fetch('https://api.impact.com/Mediapartners/IR6HvVENfaTR3908029jXFhKg7EFcPYDe1', {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from('IR6HvVENfaTR3908029jXFhKg7EFcPYDe1:VdKCaAEqjDjKGmwMX3e.-pehMdm3ZiDd').toString('base64')
      }
    });
    results.impact_api = { status: 'connected', safe: apiResponse.ok, statusCode: apiResponse.status };
  } catch (error) {
    results.impact_api = { status: 'error', safe: false, error: error.message };
  }
  
  // Test Earnings API
  try {
    const earningsResponse = await fetch('https://api.impact.com/Mediapartners/IR6HvVENfaTR3908029jXFhKg7EFcPYDe1/Actions', {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from('IR6HvVENfaTR3908029jXFhKg7EFcPYDe1:VdKCaAEqjDjKGmwMX3e.-pehMdm3ZiDd').toString('base64')
      }
    });
    const earningsData = await earningsResponse.json();
    results.earnings_api = { 
      status: 'connected', 
      safe: earningsResponse.ok, 
      earningsCount: earningsData.Actions?.length || 0 
    };
  } catch (error) {
    results.earnings_api = { status: 'error', safe: false, error: error.message };
  }
  
  // Test Database
  try {
    const { getPrisma } = require('../utils/prisma');
    const prisma = getPrisma();
    if (prisma) {
      await prisma.$queryRaw`SELECT 1`;
      results.database = { status: 'connected', safe: true };
    } else {
      results.database = { status: 'unavailable', safe: false };
    }
  } catch (error) {
    results.database = { status: 'error', safe: false, error: error.message };
  }
  
  // Test Memory
  const memoryUsage = process.memoryUsage();
  const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
  results.memory = { 
    status: 'checked', 
    safe: memoryMB < 200, 
    memoryUsed: `${memoryMB.toFixed(2)}MB` 
  };
  
  const allSafe = Object.values(results).every(r => r.safe);
  
  return {
    overallStatus: allSafe ? 'SAFE_TO_PROCEED' : 'SAFETY_ISSUES_DETECTED',
    safe: allSafe,
    checks: results,
    recommendation: allSafe 
      ? '✅ All systems are safe - ready to implement earnings sync'
      : '⚠️ Safety issues detected - do not proceed until resolved',
    timestamp: new Date().toISOString()
  };
}));

module.exports = router;