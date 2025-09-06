const ImpactWebService = require('./impactWebService');
const SimpleApiOptimizer = require('./simpleApiOptimizer');

class OptimizedImpactService extends ImpactWebService {
  constructor() {
    super();
    this.optimizer = new SimpleApiOptimizer();
  }

  // Optimized getActionsDetailed with caching and rate limiting
  async getActionsDetailed(options = {}) {
    const cacheKey = this.optimizer.getCacheKey('getActionsDetailed', options);
    
    return await this.optimizer.getOrCreateRequest(cacheKey, async () => {
      return await super.getActionsDetailed(options);
    });
  }

  // Optimized getPerformanceBySubId with caching and rate limiting
  async getPerformanceBySubId(options = {}) {
    const cacheKey = this.optimizer.getCacheKey('getPerformanceBySubId', options);
    
    return await this.optimizer.getOrCreateRequest(cacheKey, async () => {
      return await super.getPerformanceBySubId(options);
    });
  }

  // Get cache stats
  getCacheStats() {
    return {
      cacheSize: this.optimizer.cache.size,
      cacheTimeout: this.optimizer.cacheTimeout,
      minInterval: this.optimizer.minInterval
    };
  }
}

module.exports = OptimizedImpactService;
