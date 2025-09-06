class SimpleApiOptimizer {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.lastCallTime = 0;
    this.minInterval = 3000; // 3 seconds between calls
  }

  getCacheKey(method, params) {
    return `${method}_${JSON.stringify(params)}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`[ApiOptimizer] 📦 Cache hit - avoiding API call`);
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    console.log(`[ApiOptimizer] 💾 Cached data for ${key}`);
  }

  async waitForDelay() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    
    if (timeSinceLastCall < this.minInterval) {
      const delay = this.minInterval - timeSinceLastCall;
      console.log(`[ApiOptimizer] ⏳ Waiting ${delay}ms to prevent rate limits`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastCallTime = Date.now();
  }

  // Get or create cached request
  async getOrCreateRequest(key, requestFn) {
    // Check cache first
    const cached = this.getFromCache(key);
    if (cached) {
      return cached;
    }

    // Wait for appropriate delay
    await this.waitForDelay();

    // Execute request
    const result = await requestFn();

    // Cache successful results
    if (result && result.success !== false) {
      this.setCache(key, result);
    }

    return result;
  }
}

module.exports = SimpleApiOptimizer;
