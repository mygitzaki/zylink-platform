// Smart Cache Utility for Impact.com Data
// Balances data freshness with performance and API rate limits

const crypto = require('crypto');

class SmartCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    
    // Cache configuration
    this.config = {
      // Different TTL for different data types
      earnings: 5 * 60 * 1000,        // 5 minutes for earnings data
      analytics: 10 * 60 * 1000,      // 10 minutes for analytics data
      sales: 3 * 60 * 1000,           // 3 minutes for sales history
      performance: 15 * 60 * 1000,    // 15 minutes for performance data
      default: 5 * 60 * 1000          // 5 minutes default
    };
    
    // Cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // Cleanup every minute
    
    console.log('[SmartCache] Initialized with TTL config:', this.config);
  }
  
  /**
   * Generate cache key from parameters
   * @param {string} type - Data type (earnings, analytics, sales, etc.)
   * @param {string} creatorId - Creator ID
   * @param {Object} params - Additional parameters
   * @returns {string} Cache key
   */
  generateKey(type, creatorId, params = {}) {
    const keyData = {
      type,
      creatorId,
      ...params
    };
    
    // Sort keys for consistent hashing
    const sortedKeys = Object.keys(keyData).sort();
    const sortedData = sortedKeys.reduce((obj, key) => {
      obj[key] = keyData[key];
      return obj;
    }, {});
    
    const keyString = JSON.stringify(sortedData);
    const hash = crypto.createHash('md5').update(keyString).digest('hex');
    
    return `${type}_${creatorId}_${hash}`;
  }
  
  /**
   * Get data from cache if valid
   * @param {string} type - Data type
   * @param {string} creatorId - Creator ID
   * @param {Object} params - Additional parameters
   * @returns {Object|null} Cached data or null if expired/missing
   */
  get(type, creatorId, params = {}) {
    const key = this.generateKey(type, creatorId, params);
    const now = Date.now();
    const timestamp = this.timestamps.get(key);
    const ttl = this.config[type] || this.config.default;
    
    if (!timestamp || (now - timestamp) > ttl) {
      // Cache miss or expired
      if (timestamp) {
        console.log(`[SmartCache] Cache expired for ${type}:${creatorId} (age: ${now - timestamp}ms, ttl: ${ttl}ms)`);
        this.delete(key);
      }
      return null;
    }
    
    const data = this.cache.get(key);
    if (data) {
      console.log(`[SmartCache] Cache hit for ${type}:${creatorId} (age: ${now - timestamp}ms)`);
      return data;
    }
    
    return null;
  }
  
  /**
   * Set data in cache
   * @param {string} type - Data type
   * @param {string} creatorId - Creator ID
   * @param {Object} params - Additional parameters
   * @param {*} data - Data to cache
   */
  set(type, creatorId, params = {}, data) {
    // SAFETY: Validate inputs
    if (!type || !creatorId) {
      console.error(`[SmartCache] SAFETY: Missing required parameters - type: ${type}, creatorId: ${creatorId}`);
      return;
    }
    
    if (data === undefined || data === null) {
      console.warn(`[SmartCache] SAFETY: Attempting to cache null/undefined data for ${type}:${creatorId}`);
      return;
    }
    
    try {
      const key = this.generateKey(type, creatorId, params);
      const now = Date.now();
      
      // SAFETY: Check cache size limit (prevent memory exhaustion)
      if (this.cache.size >= 10000) {
        console.warn(`[SmartCache] SAFETY: Cache size limit reached (${this.cache.size}), forcing cleanup`);
        this.cleanup();
      }
      
      // SAFETY: Check data size (prevent huge objects)
      const dataString = JSON.stringify(data);
      if (dataString.length > 1024 * 1024) { // 1MB limit
        console.warn(`[SmartCache] SAFETY: Data too large for ${type}:${creatorId} (${dataString.length} bytes), skipping cache`);
        return;
      }
      
      this.cache.set(key, data);
      this.timestamps.set(key, now);
      
      const ttl = this.config[type] || this.config.default;
      console.log(`[SmartCache] Cached ${type}:${creatorId} (ttl: ${ttl}ms, size: ${dataString.length} bytes)`);
    } catch (error) {
      console.error(`[SmartCache] SAFETY: Error caching ${type}:${creatorId}: ${error.message}`);
    }
  }
  
  /**
   * Delete specific cache entry
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }
  
  /**
   * Clear all cache entries for a creator
   * @param {string} creatorId - Creator ID
   */
  clearCreator(creatorId) {
    let cleared = 0;
    
    for (const [key] of this.cache) {
      if (key.includes(`_${creatorId}_`)) {
        this.delete(key);
        cleared++;
      }
    }
    
    console.log(`[SmartCache] Cleared ${cleared} entries for creator ${creatorId}`);
  }
  
  /**
   * Clear all cache entries of a specific type
   * @param {string} type - Data type
   */
  clearType(type) {
    let cleared = 0;
    
    for (const [key] of this.cache) {
      if (key.startsWith(`${type}_`)) {
        this.delete(key);
        cleared++;
      }
    }
    
    console.log(`[SmartCache] Cleared ${cleared} entries of type ${type}`);
  }
  
  /**
   * Clean up expired cache entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, timestamp] of this.timestamps) {
      // Extract type from key to get correct TTL
      const type = key.split('_')[0];
      const ttl = this.config[type] || this.config.default;
      
      if ((now - timestamp) > ttl) {
        this.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[SmartCache] Cleaned up ${cleaned} expired entries`);
    }
  }
  
  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const now = Date.now();
    const stats = {
      totalEntries: this.cache.size,
      byType: {},
      memoryUsage: 0
    };
    
    // Calculate stats by type
    for (const [key, data] of this.cache) {
      const type = key.split('_')[0];
      if (!stats.byType[type]) {
        stats.byType[type] = { count: 0, size: 0 };
      }
      
      stats.byType[type].count++;
      const dataSize = JSON.stringify(data).length;
      stats.byType[type].size += dataSize;
      stats.memoryUsage += dataSize;
    }
    
    return stats;
  }
  
  /**
   * Destroy cache and cleanup interval
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
    this.timestamps.clear();
    console.log('[SmartCache] Destroyed');
  }
}

// Global cache instance
const globalCache = new SmartCache();

/**
 * Wrapper function for caching Impact.com API calls
 * @param {string} type - Data type
 * @param {string} creatorId - Creator ID
 * @param {Object} params - Parameters for cache key
 * @param {Function} fetchFunction - Function to fetch data if cache miss
 * @returns {Promise} Cached or fresh data
 */
async function withCache(type, creatorId, params, fetchFunction) {
  // SAFETY: Validate inputs
  if (!type || !creatorId || typeof fetchFunction !== 'function') {
    console.error(`[SmartCache] SAFETY: Invalid parameters - type: ${type}, creatorId: ${creatorId}, fetchFunction: ${typeof fetchFunction}`);
    throw new Error('Invalid parameters for withCache');
  }
  
  try {
    // Try cache first
    const cached = globalCache.get(type, creatorId, params);
    if (cached) {
      return {
        ...cached,
        _cached: true,
        _cacheAge: Date.now() - globalCache.timestamps.get(globalCache.generateKey(type, creatorId, params))
      };
    }
    
    // Cache miss - fetch fresh data
    console.log(`[SmartCache] Cache miss for ${type}:${creatorId}, fetching fresh data...`);
    
    // SAFETY: Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Cache fetch timeout')), 30000); // 30 second timeout
    });
    
    const fetchPromise = fetchFunction();
    const freshData = await Promise.race([fetchPromise, timeoutPromise]);
    
    // SAFETY: Validate response
    if (freshData === undefined || freshData === null) {
      console.warn(`[SmartCache] SAFETY: Fetch function returned null/undefined for ${type}:${creatorId}`);
      return {
        error: 'No data returned',
        _cached: false,
        _fetchTime: Date.now()
      };
    }
    
    // Cache the result (with safety checks in set method)
    globalCache.set(type, creatorId, params, freshData);
    
    return {
      ...freshData,
      _cached: false,
      _fetchTime: Date.now()
    };
  } catch (error) {
    console.error(`[SmartCache] SAFETY: Error in withCache for ${type}:${creatorId}:`, error.message);
    
    // SAFETY: Return safe fallback data
    return {
      error: error.message,
      _cached: false,
      _fetchError: true,
      _fetchTime: Date.now()
    };
  }
}

module.exports = {
  SmartCache,
  globalCache,
  withCache
};
