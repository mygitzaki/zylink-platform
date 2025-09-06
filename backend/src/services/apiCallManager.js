class ApiCallManager {
  constructor() {
    this.callHistory = new Map();
    this.requestQueue = new Map();
    this.lastCallTime = 0;
    this.minInterval = 3000; // 3 seconds between calls
    this.maxCallsPerMinute = 10; // Max 10 calls per minute
    this.maxCallsPerHour = 100; // Max 100 calls per hour
  }

  // Check if we can make an API call without hitting rate limits
  canMakeCall() {
    const now = Date.now();
    const oneMinuteAgo = now - (60 * 1000);
    const oneHourAgo = now - (60 * 60 * 1000);

    // Clean old call history
    this.cleanupCallHistory(now);

    // Count calls in last minute
    const recentCalls = Array.from(this.callHistory.values())
      .filter(timestamp => timestamp > oneMinuteAgo).length;

    // Count calls in last hour
    const hourlyCalls = Array.from(this.callHistory.values())
      .filter(timestamp => timestamp > oneHourAgo).length;

    if (recentCalls >= this.maxCallsPerMinute) {
      console.log(`[ApiCallManager] ⏳ Rate limit: ${recentCalls}/${this.maxCallsPerMinute} calls in last minute`);
      return false;
    }

    if (hourlyCalls >= this.maxCallsPerHour) {
      console.log(`[ApiCallManager] ⏳ Rate limit: ${hourlyCalls}/${this.maxCallsPerHour} calls in last hour`);
      return false;
    }

    return true;
  }

  // Record an API call
  recordCall() {
    const now = Date.now();
    this.callHistory.set(now, now);
    this.lastCallTime = now;
  }

  // Get delay needed before next call
  getDelayNeeded() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    
    if (timeSinceLastCall < this.minInterval) {
      return this.minInterval - timeSinceLastCall;
    }
    
    return 0;
  }

  // Wait for appropriate delay
  async waitForDelay() {
    const delay = this.getDelayNeeded();
    if (delay > 0) {
      console.log(`[ApiCallManager] ⏳ Waiting ${delay}ms before next API call`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Clean up old call history
  cleanupCallHistory(now) {
    const oneHourAgo = now - (60 * 60 * 1000);
    for (const [timestamp] of this.callHistory) {
      if (timestamp < oneHourAgo) {
        this.callHistory.delete(timestamp);
      }
    }
  }

  // Get or create a queued request to prevent duplicates
  async getOrCreateRequest(key, requestFn) {
    if (this.requestQueue.has(key)) {
      console.log(`[ApiCallManager] 🔄 Request already in progress for ${key}, waiting...`);
      return this.requestQueue.get(key);
    }

    const requestPromise = this.executeWithRateLimit(requestFn);
    this.requestQueue.set(key, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.requestQueue.delete(key);
    }
  }

  // Execute request with rate limiting
  async executeWithRateLimit(requestFn) {
    // Wait for appropriate delay
    await this.waitForDelay();

    // Check if we can make the call
    if (!this.canMakeCall()) {
      const delay = 60000; // Wait 1 minute if rate limited
      console.log(`[ApiCallManager] ⏳ Rate limited, waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Record the call
    this.recordCall();

    // Execute the request
    return await requestFn();
  }

  // Get current stats
  getStats() {
    const now = Date.now();
    const oneMinuteAgo = now - (60 * 1000);
    const oneHourAgo = now - (60 * 60 * 1000);

    const recentCalls = Array.from(this.callHistory.values())
      .filter(timestamp => timestamp > oneMinuteAgo).length;
    
    const hourlyCalls = Array.from(this.callHistory.values())
      .filter(timestamp => timestamp > oneHourAgo).length;

    return {
      recentCalls,
      hourlyCalls,
      maxPerMinute: this.maxCallsPerMinute,
      maxPerHour: this.maxCallsPerHour,
      canMakeCall: this.canMakeCall()
    };
  }
}

module.exports = ApiCallManager;
