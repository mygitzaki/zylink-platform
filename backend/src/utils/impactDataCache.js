// Smart Impact.com Data Cache
// Prevents duplicate API calls and rate limiting issues

class ImpactDataCache {
  constructor() {
    this.cache = new Map();
    this.TTL = 5 * 60 * 1000; // 5 minutes
  }

  // Generate cache key for creator and date range
  generateKey(creatorId, startDate, endDate) {
    return `${creatorId}:${startDate}:${endDate}`;
  }

  // Store Impact.com data
  set(creatorId, startDate, endDate, data) {
    const key = this.generateKey(creatorId, startDate, endDate);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Get cached Impact.com data
  get(creatorId, startDate, endDate) {
    const key = this.generateKey(creatorId, startDate, endDate);
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if data is still fresh
    const age = Date.now() - cached.timestamp;
    if (age > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  // Clean expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.TTL) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Global cache instance
const impactCache = new ImpactDataCache();

// Cleanup expired entries every 10 minutes
setInterval(() => {
  impactCache.cleanup();
}, 10 * 60 * 1000);

module.exports = { impactCache };
