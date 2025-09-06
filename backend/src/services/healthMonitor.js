// Health Monitor Service - Continuously monitors app health
const { getPrisma } = require('../utils/prisma');
const { ErrorBoundary } = require('./errorBoundary');

class HealthMonitor {
  constructor() {
    this.healthChecks = new Map();
    this.startMonitoring();
  }

  // Register a health check
  registerCheck(name, checkFunction, intervalMs = 60000) {
    this.healthChecks.set(name, {
      name,
      check: ErrorBoundary.safeExecute(checkFunction, false, `health-${name}`),
      interval: intervalMs,
      lastCheck: null,
      status: 'unknown',
      lastError: null
    });

    // Run check periodically
    setInterval(async () => {
      await this.runCheck(name);
    }, intervalMs);

    // Run initial check
    setTimeout(() => this.runCheck(name), 1000);
  }

  async runCheck(name) {
    const check = this.healthChecks.get(name);
    if (!check) return;

    try {
      const result = await check.check();
      check.status = result ? 'healthy' : 'unhealthy';
      check.lastCheck = new Date().toISOString();
      check.lastError = null;
      
      if (!result) {
        console.warn(`⚠️ Health check ${name} failed`);
      }
    } catch (error) {
      check.status = 'error';
      check.lastCheck = new Date().toISOString();
      check.lastError = error.message;
      
      console.error(`❌ Health check ${name} error:`, error.message);
    }
  }

  // Get overall health status
  getOverallHealth() {
    const checks = Array.from(this.healthChecks.values());
    const healthy = checks.filter(c => c.status === 'healthy').length;
    const total = checks.length;
    
    return {
      status: healthy === total ? 'healthy' : 'degraded',
      healthy,
      total,
      checks: checks.map(c => ({
        name: c.name,
        status: c.status,
        lastCheck: c.lastCheck,
        lastError: c.lastError
      })),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  // Start monitoring critical systems
  startMonitoring() {
    // Database connectivity check
    this.registerCheck('database', async () => {
      const prisma = getPrisma();
      if (!prisma) return false;
      
      try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
      } catch (error) {
        return false;
      }
    }, 30000); // Check every 30 seconds

    // Memory usage check
    this.registerCheck('memory', async () => {
      const usage = process.memoryUsage();
      const maxMemoryMB = 512; // Adjust based on your server
      const currentMemoryMB = usage.heapUsed / 1024 / 1024;
      
      return currentMemoryMB < maxMemoryMB;
    }, 60000); // Check every minute

    // Impact.com API connectivity check (uses env credentials)
    this.registerCheck('impact-api', async () => {
      try {
        const accountSid = process.env.IMPACT_ACCOUNT_SID;
        const authToken = process.env.IMPACT_AUTH_TOKEN;
        const apiBase = process.env.IMPACT_API_BASE_URL || 'https://api.impact.com';
        
        if (!accountSid || !authToken) {
          console.log('⚠️ Health check impact-api failed: Missing environment variables');
          return false;
        }
        
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const response = await fetch(`${apiBase}/Mediapartners/${accountSid}`, {
          method: 'GET',
          headers: { 'Authorization': `Basic ${auth}` }
        });
        
        if (!response.ok) {
          console.log(`⚠️ Health check impact-api failed: HTTP ${response.status}`);
          return false;
        }
        
        console.log('✅ Health check impact-api passed');
        return true;
      } catch (error) {
        console.log(`⚠️ Health check impact-api failed: ${error.message}`);
        return false;
      }
    }, 300000); // Check every 5 minutes

    // Server responsiveness check
    this.registerCheck('server-response', async () => {
      const start = Date.now();
      await new Promise(resolve => setTimeout(resolve, 1));
      const responseTime = Date.now() - start;
      
      return responseTime < 100; // Should respond within 100ms
    }, 30000);
  }
}

// Create singleton instance
const healthMonitor = new HealthMonitor();

module.exports = { HealthMonitor, healthMonitor };


