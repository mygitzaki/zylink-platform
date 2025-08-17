// Safe Development Framework - Test every new feature safely
const { ErrorBoundary } = require('./errorBoundary');
const { getPrisma } = require('../utils/prisma');

class SafeDevelopment {
  constructor() {
    this.testResults = new Map();
  }

  // Test any new service before integrating it
  async testNewService(serviceName, testFunction, description) {
    console.log(`🧪 SAFETY TEST: ${serviceName} - ${description}`);
    
    const testId = `${serviceName}_${Date.now()}`;
    const startTime = Date.now();
    
    try {
      // Run test in isolated environment
      const result = await ErrorBoundary.safeExecute(
        testFunction, 
        { success: false, error: 'Test failed safely' }, 
        `test-${serviceName}`
      )();
      
      const duration = Date.now() - startTime;
      
      this.testResults.set(testId, {
        serviceName,
        description,
        success: result.success !== false,
        result,
        duration,
        timestamp: new Date().toISOString(),
        error: result.error || null
      });
      
      if (result.success !== false) {
        console.log(`✅ SAFETY TEST PASSED: ${serviceName} (${duration}ms)`);
        return { safe: true, result, testId };
      } else {
        console.log(`❌ SAFETY TEST FAILED: ${serviceName} - ${result.error || 'Unknown error'}`);
        return { safe: false, result, testId };
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.testResults.set(testId, {
        serviceName,
        description,
        success: false,
        result: null,
        duration,
        timestamp: new Date().toISOString(),
        error: error.message
      });
      
      console.log(`🚨 SAFETY TEST CRASHED: ${serviceName} - ${error.message}`);
      return { safe: false, error: error.message, testId };
    }
  }

  // Test database operations safely
  async testDatabaseOperation(operationName, operation) {
    return this.testNewService(
      `db-${operationName}`,
      async () => {
        const prisma = getPrisma();
        if (!prisma) {
          throw new Error('Database not available');
        }
        
        const result = await operation(prisma);
        return { success: true, data: result };
      },
      `Database operation: ${operationName}`
    );
  }

  // Test API calls safely
  async testApiCall(apiName, apiCall) {
    return this.testNewService(
      `api-${apiName}`,
      async () => {
        const result = await apiCall();
        return { success: true, data: result };
      },
      `API call: ${apiName}`
    );
  }

  // Test new endpoint safely
  async testEndpoint(method, path, testData = {}) {
    return this.testNewService(
      `endpoint-${method}-${path.replace(/[\/]/g, '-')}`,
      async () => {
        const response = await fetch(`http://localhost:4000${path}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(testData.headers || {})
          },
          ...(method !== 'GET' && testData.body ? { body: JSON.stringify(testData.body) } : {})
        });
        
        const responseData = await response.text();
        
        return {
          success: response.ok,
          status: response.status,
          data: responseData,
          headers: Object.fromEntries(response.headers.entries())
        };
      },
      `Endpoint test: ${method} ${path}`
    );
  }

  // Pre-flight safety check for any new feature
  async preFlightCheck(featureName, checks) {
    console.log(`🛡️ PRE-FLIGHT SAFETY CHECK: ${featureName}`);
    console.log(`Running ${checks.length} safety tests...`);
    
    const results = [];
    let allPassed = true;
    
    for (const check of checks) {
      const result = await this.testNewService(
        `${featureName}-${check.name}`,
        check.test,
        check.description
      );
      
      results.push({
        name: check.name,
        description: check.description,
        ...result
      });
      
      if (!result.safe) {
        allPassed = false;
      }
    }
    
    if (allPassed) {
      console.log(`🎉 PRE-FLIGHT CHECK PASSED: ${featureName} is SAFE to implement`);
    } else {
      console.log(`🚨 PRE-FLIGHT CHECK FAILED: ${featureName} has safety issues`);
    }
    
    return {
      featureName,
      safe: allPassed,
      results,
      timestamp: new Date().toISOString()
    };
  }

  // Get test history
  getTestHistory() {
    return Array.from(this.testResults.entries()).map(([id, result]) => ({
      id,
      ...result
    }));
  }

  // Memory-safe test for large operations
  async testWithMemoryLimit(testName, testFunction, maxMemoryMB = 100) {
    const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    
    console.log(`🧠 MEMORY-SAFE TEST: ${testName} (max: ${maxMemoryMB}MB)`);
    
    const result = await this.testNewService(testName, testFunction, `Memory-limited test (${maxMemoryMB}MB)`);
    
    const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    const memoryUsed = finalMemory - initialMemory;
    
    if (memoryUsed > maxMemoryMB) {
      console.log(`⚠️ MEMORY WARNING: ${testName} used ${memoryUsed.toFixed(2)}MB (limit: ${maxMemoryMB}MB)`);
      return { ...result, memoryWarning: true, memoryUsed };
    }
    
    console.log(`✅ MEMORY OK: ${testName} used ${memoryUsed.toFixed(2)}MB`);
    return { ...result, memoryUsed };
  }

  // Stress test for new features
  async stressTest(testName, testFunction, iterations = 10) {
    console.log(`💪 STRESS TEST: ${testName} (${iterations} iterations)`);
    
    const results = [];
    let failures = 0;
    
    for (let i = 0; i < iterations; i++) {
      const result = await this.testNewService(
        `${testName}-stress-${i}`,
        testFunction,
        `Stress test iteration ${i + 1}/${iterations}`
      );
      
      results.push(result);
      if (!result.safe) failures++;
    }
    
    const successRate = ((iterations - failures) / iterations) * 100;
    
    if (successRate >= 90) {
      console.log(`✅ STRESS TEST PASSED: ${testName} (${successRate.toFixed(1)}% success rate)`);
    } else {
      console.log(`❌ STRESS TEST FAILED: ${testName} (${successRate.toFixed(1)}% success rate)`);
    }
    
    return {
      testName,
      iterations,
      failures,
      successRate,
      safe: successRate >= 90,
      results
    };
  }
}

// Create singleton instance
const safeDevelopment = new SafeDevelopment();

module.exports = { SafeDevelopment, safeDevelopment };


