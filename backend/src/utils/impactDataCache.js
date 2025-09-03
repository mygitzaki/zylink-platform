/**
 * Impact.com Data Cache Utility
 * 
 * Caches Impact.com API responses to avoid duplicate calls
 * between earnings-summary and sales-history endpoints
 */

class ImpactDataCache {
  constructor() {
    this.cache = new Map();
    this.maxAge = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Generate cache key
   */
  getKey(creatorId, startDate, endDate) {
    return `${creatorId}:${startDate}:${endDate}`;
  }

  /**
   * Get cached data
   */
  get(creatorId, startDate, endDate) {
    const key = this.getKey(creatorId, startDate, endDate);
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if data is still fresh
    const age = Date.now() - cached.timestamp;
    if (age > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached data
   */
  set(creatorId, startDate, endDate, data) {
    const key = this.getKey(creatorId, startDate, endDate);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Clean up old entries
    this.cleanup();
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }
}

// Export singleton instance
module.exports = {
  impactCache: new ImpactDataCache()
};