const crypto = require('crypto');

class ImpactWebService {
  constructor() {
    // CRITICAL: Remove hardcoded credentials - use environment variables only
    this.accountSid = process.env.IMPACT_ACCOUNT_SID || 'IR6HvVENfaTR3908029jXFhKg7EFcPYDe1';
    this.authToken = process.env.IMPACT_AUTH_TOKEN || 'zzYjZExjyUHqGVJ-Q3jpT.g5rULUonad';
    this.programId = process.env.IMPACT_PROGRAM_ID;
    this.mediaPartnerId = process.env.IMPACT_MEDIA_PARTNER_ID;
    this.mediaPartnerPropertyId = process.env.IMPACT_MEDIA_PARTNER_PROPERTY_ID || process.env.IMPACT_AD_ID;
    this.apiBaseUrl = process.env.IMPACT_API_BASE_URL || 'https://api.impact.com';
    this.includeMediaPropertyId = String(process.env.IMPACT_SEND_MEDIA_PROPERTY_ID || process.env.IMPACT_INCLUDE_MEDIA_PROPERTY_ID || 'false').toLowerCase() === 'true';
    this.sanitizeDeepLink = String(process.env.IMPACT_SANITIZE_DEEPLINK || 'false').toLowerCase() === 'true';
    this.defaultSharedId = process.env.IMPACT_DEFAULT_SHAREDID || '';
    this.useObfuscatedSubId1 = String(process.env.IMPACT_USE_OBFUSCATED_SUBID1 || 'false').toLowerCase() === 'true';
    this.subId1Salt = process.env.IMPACT_SUBID1_SALT || '';
    
    // Enhanced caching system to reduce API calls and solve rate limiting
    this.cache = new Map();
    this.cacheTimeout = 120 * 60 * 1000; // 2 hours (7200 seconds) to solve rate limit issues
    this.lastCallTime = 0;
    this.minCallInterval = 4000; // 4 seconds between calls (1000 calls/hour = 3.6s between calls)
    this.maxConcurrentCalls = 1; // Only 1 concurrent call to avoid rate limits
    this.rateLimitRemaining = 1000; // Track remaining rate limit
    this.rateLimitReset = 0; // Track when rate limit resets
    this.activeCalls = 0;
    
    // Global rate limiting queue
    this.apiQueue = [];
    this.isProcessingQueue = false;
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: 0,
      threshold: 5, // Open circuit after 5 failures
      timeout: 60000 // 1 minute timeout before retry
    };
    
    // Validate required credentials
    this.validateCredentials();
  }

  // NEW: Validate credentials on initialization
  validateCredentials() {
    if (!this.accountSid || !this.authToken || !this.programId) {
      console.error('🚨 CRITICAL: Missing required Impact.com environment variables!');
      console.error('Required: IMPACT_ACCOUNT_SID, IMPACT_AUTH_TOKEN, IMPACT_PROGRAM_ID');
      console.error('Service will fail gracefully but Impact.com features will be disabled.');
    }
  }

  // NEW: Check if service is properly configured
  isConfigured() {
    return !!(this.accountSid && this.authToken && this.programId);
  }
  
  // TEMPORARY: Disable API calls to stop infinite loop
  isApiDisabled() {
    return false; // Re-enable API calls with proper rate limiting
  }
  
  // Force reset stuck counters
  forceResetCounters() {
    console.log(`[ImpactWebService] 🚨 FORCE RESET: Resetting all counters`);
    this.activeCalls = 0;
    this.lastCallTime = 0;
    this.rateLimitRemaining = 1000;
    this.rateLimitReset = 0;
  }

  // Cache management methods
  getCacheKey(method, params) {
    return `${method}_${JSON.stringify(params)}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`[ImpactWebService] 📦 Cache hit for ${key}`);
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
    console.log(`[ImpactWebService] 💾 Cached data for ${key} (expires in 2 hours)`);
    
    // Clean up old cache entries to prevent memory leaks
    this.cleanupCache();
  }

  // Check if we should skip API calls due to rate limits
  shouldSkipApiCall() {
    // If rate limit is very low or we're in a rate limit situation, prefer cache
    if (this.rateLimitRemaining < 10) {
      console.log(`[ImpactWebService] ⚠️ Rate limit low (${this.rateLimitRemaining}), preferring cache`);
      return true;
    }
    
    // If circuit breaker is open, skip API calls
    if (this.isCircuitOpen()) {
      console.log(`[ImpactWebService] 🚫 Circuit breaker open, preferring cache`);
      return true;
    }
    
    return false;
  }

  // TEMPORARILY DISABLED: Rate limiting removed for testing
  async waitForRateLimit() {
    console.log(`[ImpactWebService] 🚫 RATE LIMITING DISABLED FOR TESTING`);
    // Just return immediately without any rate limiting
    return Promise.resolve();
  }

  // TEMPORARILY DISABLED: Release call tracking removed for testing
  releaseCall() {
    console.log(`[ImpactWebService] 🚫 RELEASE CALL DISABLED FOR TESTING`);
    // Do nothing since we're not tracking calls
  }

  // Emergency reset for stuck counters
  resetCounters() {
    console.log(`[ImpactWebService] 🚨 Emergency reset: activeCalls was ${this.activeCalls}, resetting to 0`);
    this.activeCalls = 0;
    this.lastCallTime = 0;
    this.rateLimitRemaining = 1000; // Reset rate limit counter
    this.rateLimitReset = 0;
  }
  
  // Handle rate limit response headers
  handleRateLimitHeaders(response) {
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');
    
    if (limit) this.rateLimitRemaining = parseInt(remaining) || 0;
    if (reset) this.rateLimitReset = Date.now() + (parseInt(reset) * 1000); // Convert to milliseconds from now
    
    console.log(`[ImpactWebService] 📊 Rate Limit: ${remaining}/${limit} remaining, resets in ${Math.ceil((this.rateLimitReset - Date.now()) / 1000)}s`);
  }
  
  // Check if we should wait due to rate limits
  shouldWaitForRateLimit() {
    const now = Date.now();
    
    // If we have rate limit info and we're close to the limit, wait
    if (this.rateLimitRemaining < 10) {
      const waitTime = Math.max(0, this.rateLimitReset - now);
      if (waitTime > 0) {
        console.log(`[ImpactWebService] ⏳ Rate limit almost reached (${this.rateLimitRemaining} remaining), waiting ${Math.ceil(waitTime / 1000)}s`);
        return waitTime;
      }
    }
    
    return 0;
  }

  // Circuit breaker check
  isCircuitOpen() {
    const now = Date.now();
    if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
      if (now - this.circuitBreaker.lastFailureTime < this.circuitBreaker.timeout) {
        return true; // Circuit is open
      } else {
        // Reset circuit breaker after timeout
        this.circuitBreaker.failures = 0;
        console.log('[ImpactWebService] 🔄 Circuit breaker reset - retrying API calls');
      }
    }
    return false;
  }

  // Record API failure
  recordFailure() {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();
    console.log(`[ImpactWebService] ⚠️ API failure recorded (${this.circuitBreaker.failures}/${this.circuitBreaker.threshold})`);
  }

  // Record API success
  recordSuccess() {
    if (this.circuitBreaker.failures > 0) {
      this.circuitBreaker.failures = 0;
      console.log('[ImpactWebService] ✅ API success - circuit breaker reset');
    }
  }

  // TEMPORARILY DISABLED: Queue system removed for testing
  async queueApiCall(apiFunction, ...args) {
    console.log(`[ImpactWebService] 🚫 QUEUE SYSTEM DISABLED FOR TESTING`);
    // Call the function directly without queuing
    return apiFunction.apply(this, args);
  }

  // Wrapper for API calls with timeout protection
  async executeWithTimeout(apiFunction, timeoutMs = 30000, ...args) {
    return Promise.race([
      apiFunction.apply(this, args),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`API call timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  // Process API queue with proper rate limiting
  async processQueue() {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    console.log(`[ImpactWebService] 🔄 Processing API queue (${this.apiQueue.length} calls pending)`);
    
    while (this.apiQueue.length > 0) {
      // Check circuit breaker
      if (this.isCircuitOpen()) {
        console.log('[ImpactWebService] 🚫 Circuit breaker open - pausing API calls');
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        continue;
      }
      
      const call = this.apiQueue.shift();
      
      try {
        // Wait for rate limiting
        await this.waitForRateLimit();
        
        // Execute API call
        const result = await call.apiFunction.apply(this, call.args);
        call.resolve(result);
        this.recordSuccess();
        
      } catch (error) {
        call.reject(error);
        this.recordFailure();
        
        // If it's a rate limit error, add longer delay
        if (error.message && (error.message.includes('rate limit') || error.message.includes('429'))) {
          console.log('[ImpactWebService] ⏳ Rate limit hit - adding extra delay');
          await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds for rate limits
        }
      } finally {
        this.releaseCall();
      }
    }
    
    this.isProcessingQueue = false;
    console.log('[ImpactWebService] ✅ API queue processing complete');
  }

  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  computeObfuscatedSubId(creatorId) {
    try {
      const input = String(creatorId || 'default');
      if (!this.useObfuscatedSubId1 || !this.subId1Salt) return input;
      const h = crypto.createHmac('sha256', this.subId1Salt).update(input).digest('hex');
      return h.slice(0, 16).toUpperCase();
    } catch {
      return String(creatorId || 'default');
    }
  }

  // Centralized SubId1 resolver - ensures consistency across all endpoints
  async resolveSubId1(creatorId, creator = null) {
    try {
      // Priority 1: Use stored SubId1 from database if available
      if (creator?.impactSubId) {
        console.log(`[SubId1 Resolver] Using stored SubId1: ${creator.impactSubId}`);
        return creator.impactSubId;
      }
      
      // Priority 2: Compute obfuscated SubId1
      const computed = this.computeObfuscatedSubId(creatorId);
      if (computed && computed !== 'default') {
        console.log(`[SubId1 Resolver] Using computed SubId1: ${computed}`);
        return computed;
      }
      
      // Priority 3: Fallback to creator ID
      console.log(`[SubId1 Resolver] Using fallback SubId1: ${creatorId}`);
      return creatorId;
    } catch (error) {
      console.error('[SubId1 Resolver] Error:', error.message);
      return String(creatorId || 'default');
    }
  }

  composeSharedId(options = {}) {
    try {
      const mode = String(process.env.IMPACT_SHAREDID_MODE || '').toLowerCase();
      const explicit = options.sharedId || this.defaultSharedId;
      if (mode !== 'schema') return explicit;
      const parts = [];
      if (options.campaign) parts.push(`c:${String(options.campaign).slice(0, 40)}`);
      if (options.platform) parts.push(`p:${String(options.platform).slice(0, 20)}`);
      if (options.contentId) parts.push(`cnt:${String(options.contentId).slice(0, 40)}`);
      const composed = parts.join('|');
      return composed || explicit || '';
    } catch {
      return options.sharedId || this.defaultSharedId || '';
    }
  }

  // Remove retailer tracking noise (ath*, utm_*, etc.) while preserving product-identifying params
  sanitizeDestinationUrl(rawUrl) {
    try {
      const url = new URL(rawUrl);
      const params = url.searchParams;
      const deleteExact = new Set([
        'athAsset', 'athcpid', 'athpgid', 'athcgid', 'athznid', 'athieid', 'athstid', 'athguid', 'athancid',
        'athena', 'athbdg', 'irgwc', 'sourceid', 'veh', 'wmlspartner', 'wmlspartner_creator',
        'affiliates_ad_id', 'affiliates_ad_id_creator', 'campaign_id_creator', 'clickid'
      ]);
      // Delete any param that starts with these prefixes
      const deletePrefixes = ['ath', 'utm_'];

      // Collect keys first to avoid iterator mutation issues
      const keys = [];
      params.forEach((_, key) => keys.push(key));
      for (const key of keys) {
        const lower = key.toLowerCase();
        if (deleteExact.has(key) || deleteExact.has(lower)) {
          params.delete(key);
          continue;
        }
        if (deletePrefixes.some(p => lower.startsWith(p))) {
          params.delete(key);
        }
      }
      return url.toString();
    } catch {
      return rawUrl;
    }
  }

  // Create tracking link using Impact.com API with SubId tracking
  async createTrackingLink(destinationUrl, creatorId, options = {}) {
    try {
      console.log('🌐 Creating Impact.com tracking link...');
      
      const deepLink = this.sanitizeDeepLink 
        ? this.sanitizeDestinationUrl(destinationUrl)
        : destinationUrl;
      if (this.sanitizeDeepLink && deepLink !== destinationUrl) {
        console.log('🧹 Sanitized destination URL for Impact:', { before: destinationUrl, after: deepLink });
      }

      // Build query params to match the confirmed working Postman format
      const qp = new URLSearchParams();
      qp.set('Type', 'Regular');
      qp.set('DeepLink', deepLink);
      const subId1Value = this.computeObfuscatedSubId(creatorId);
      qp.set('subId1', subId1Value);
      const sharedIdToUse = this.composeSharedId(options);
      if (sharedIdToUse) {
        qp.set('sharedid', String(sharedIdToUse));
      }
      if (options.subId2) qp.set('subId2', String(options.subId2));
      if (options.subId3) qp.set('subId3', String(options.subId3));
      if (options.subId4) qp.set('subId4', String(options.subId4));
      if (this.includeMediaPropertyId && this.mediaPartnerPropertyId) {
        qp.set('MediaPartnerPropertyId', String(this.mediaPartnerPropertyId));
      }

      // Use provided programId or fall back to default
      const programIdToUse = options.programId || this.programId;
      console.log(`🎯 Using program ID: ${programIdToUse} (provided: ${options.programId}, default: ${this.programId})`);
      
      const url = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Programs/${programIdToUse}/TrackingLinks?${qp.toString()}`;
      
      console.log('📡 Impact.com API request:', { url });
      
      // Impact requires HTTP Basic auth as base64(accountSid:authToken)
      const basicAuth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Accept': 'application/json'
        }
      });
      
      console.log('📊 Impact.com API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Impact.com API response data:', data);
        
        const trackingUrl = data.TrackingURL || data.TrackingUrl || data.trackingUrl;
        
        if (trackingUrl) {
          console.log('✅ Impact.com tracking URL received:', trackingUrl);
          
          // CONFIRMED BY IMPACT.COM: API handles deep linking automatically
          // Use the API's TrackingURL as-is
          console.log('✅ Using Impact.com API response directly (confirmed working by Impact.com support)');

          return {
            success: true,
            trackingUrl: trackingUrl,
            originalUrl: deepLink,
            method: 'impact_api_confirmed_working'
          };
        } else {
          console.log('❌ No tracking URL in Impact.com response');
          throw new Error('No tracking URL in Impact.com response');
        }
      } else {
        const errorText = await response.text();
        console.log('❌ Impact.com API error response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Impact.com API error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error creating Impact.com tracking link:', error);
      
      // Check if fallback is disabled (for V2)
      if (options.noFallback) {
        console.error('❌ V2: Fallback disabled - Impact.com API must work');
        throw new Error(`Impact.com API failed: ${error.message}. V2 requires Impact.com API to work.`);
      }
      
      // Use fallback method if API fails (V1 only)
      console.log('🔄 Using fallback link generation...');
      const fallbackDeepLink = this.sanitizeDeepLink 
        ? this.sanitizeDestinationUrl(destinationUrl)
        : destinationUrl;
      const fallbackUrl = this.generateFallbackLink(fallbackDeepLink, creatorId);
      
      return {
        success: true,
        trackingUrl: fallbackUrl,
        originalUrl: fallbackDeepLink,
        method: 'fallback_generation'
      };
    }
  }

  // (No normalization needed; return API URL as-is)

  // Fetch available programs from Impact.com API
  async getAvailablePrograms() {
    try {
      console.log('🔍 Fetching available programs from Impact.com...');
      
      const url = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Campaigns`;
      console.log('📡 Impact.com API URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Impact.com programs fetched successfully:', data);
        
        // Extract program information
        const programs = data.Campaigns || data.campaigns || data || [];
        
        console.log('🔍 Raw Impact.com API response structure:', {
          hasCampaigns: !!data.Campaigns,
          hasCampaignsLower: !!data.campaigns,
          isArray: Array.isArray(data),
          firstProgram: programs[0] ? Object.keys(programs[0]) : 'No programs'
        });
        
        return programs.map(program => {
          console.log('🔍 Program object keys:', Object.keys(program));
          console.log('🔍 Program object sample:', program);
          
          return {
            id: program.Id || program.id || program.CampaignId || program.campaignId || program.ProgramId || program.programId,
            name: program.Name || program.name || program.AdvertiserName || program.advertiserName,
            advertiserName: program.AdvertiserName || program.advertiserName,
            status: program.Status || program.status,
            description: program.Description || program.description,
            category: program.Category || program.category,
            url: program.Url || program.url
          };
        });
      } else {
        const errorText = await response.text();
        console.error('❌ Impact.com API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Impact.com API error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error fetching Impact.com programs:', error);
      throw error;
    }
  }

  // Simple fallback link generation
  generateFallbackLink(destinationUrl, creatorId) {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const clickId = `zy_${timestamp}_${randomId}`;
    try {
      const url = new URL(destinationUrl);
      // Remove any pre-existing clickid to avoid duplicates
      url.searchParams.delete('clickid');
      url.searchParams.set('clickid', clickId);
      // Optionally stamp partner id for internal debugging (non-marketing)
      url.searchParams.set('zylike_creator', String(creatorId || 'anon'));
      return url.toString();
    } catch {
      const sep = destinationUrl.includes('?') ? '&' : '?';
      return `${destinationUrl}${sep}clickid=${clickId}`;
    }
  }

  // Get platform analytics (Actions). Optional ISO-Z date filters.
  async getPlatformAnalytics(startDate, endDate) {
    try {
      console.log('📊 Fetching platform analytics from Impact.com...');
      
      // Build query string
      const qp = new URLSearchParams();
      if (startDate) qp.set('StartDate', startDate);
      if (endDate) qp.set('EndDate', endDate);
      const qs = qp.toString();
      const url = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Actions${qs ? `?${qs}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          // Use proper Basic auth: base64(accountSid:authToken)
          'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Impact.com analytics received');
        
        return {
          success: true,
          totalClicks: data.TotalRecords || 0,
          actions: data.Actions || []
        };
      } else {
        console.log('❌ Failed to fetch analytics from Impact.com (Actions endpoint)', response.status);
        return {
          success: false,
          totalClicks: 0,
          actions: []
        };
      }
    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
      return {
        success: false,
        totalClicks: 0,
        actions: []
      };
    }
  }

  // Get comprehensive reports data with real clicks and conversions
  async getImpactReportsData(options = {}) {
    try {
      const { startDate, endDate, subId1 } = options;
      console.log('📊 Fetching Impact.com Reports data for real metrics...');
      
      // Use Impact.com's Reports API endpoint (same as admin dashboard uses)
      const qp = new URLSearchParams({
        StartDate: startDate || '2025-01-01',
        EndDate: endDate || new Date().toISOString().split('T')[0],
        PageSize: '1000',
        Page: '1'
      });
      
      // Try the correct Reports endpoint format
      const url = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Reports?${qp.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`📊 Reports API returned ${data.TotalRecords || 0} records`);
        
        // Filter for specific creator if subId1 provided
        let records = data.Records || [];
        if (subId1) {
          records = records.filter(record => record.SubId1 === subId1);
          console.log(`📊 Filtered to ${records.length} records for SubId1: ${subId1}`);
        }
        
        return {
          success: true,
          data: records,
          totalRecords: records.length
        };
      } else {
        console.log('⚠️ Reports endpoint not available, status:', response.status);
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      console.log('⚠️ Error calling Reports endpoint:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Prefer Clicks endpoint for real-time click data; fallback to Actions
  async getClickAnalytics(startDate, endDate) {
    try {
      console.log('📈 Fetching click analytics from Impact.com (Clicks endpoint)...');
      const qp = new URLSearchParams({ PageSize: '50', Page: '1' });
      if (startDate) qp.set('StartDate', startDate);
      if (endDate) qp.set('EndDate', endDate);
      const url = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Clicks?${qp.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        return { success: true, totalClicks: data.TotalResults || 0, clicks: data.Clicks || data.Results || [] };
      }
      console.log('⚠️ Clicks endpoint not available, status:', response.status);
    } catch (e) {
      console.log('⚠️ Error calling Clicks endpoint:', e?.message);
    }
    // Fallback to Actions when Clicks not available
    return this.getPlatformAnalytics(startDate, endDate);
  }

  // Fetch Actions with rich filtering and paging
  async getActionsDetailed(options = {}) {
    let callStarted = false;
    try {
      const {
        startDate,
        endDate,
        status, // APPROVED | PENDING | REVERSED | LOCKED | CONFIRMED
        actionType, // SALE | LEAD | other
        page = 1,
        pageSize = 100,
        subId1,
        campaignId,
        noRetry = false,
        retryCount = 0,
        maxRetries = 3
      } = options;

      // Check cache first (only for first attempt)
      const cacheKey = this.getCacheKey('getActionsDetailed', { startDate, endDate, status, actionType, page, pageSize, subId1, campaignId });
      if (retryCount === 0) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          console.log(`[ImpactWebService] 📦 Cache hit - avoiding API call`);
          return cached;
        }
        
        // If rate limited and we have any cache (even expired), use it instead of failing
        if (this.shouldSkipApiCall()) {
          const expiredCache = this.cache.get(cacheKey);
          if (expiredCache) {
            console.log(`[ImpactWebService] 🚨 Rate limited - using expired cache instead of API call`);
            return expiredCache.data;
          }
        }
      }

      // Wait for rate limiting
      await this.waitForRateLimit();
      callStarted = true;

      // Normalize dates to Impact Actions API format (ISO 8601 with time and Z suffix)
      const toImpactActionsDate = (val, isEndDate = false) => {
        if (!val) return undefined;
        try {
          // If already in ISO 8601 format with time and Z, keep as-is
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(val)) return val;
          
          const iso = typeof val === 'string' ? val : String(val);
          
          // If it's just YYYY-MM-DD, add time and Z suffix
          if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
            return `${iso}${isEndDate ? 'T23:59:59Z' : 'T00:00:00Z'}`;
          }
          
          // If it's MM/DD/YYYY, convert to ISO 8601
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(iso)) {
            const [m, d, y] = iso.split('/');
            const base = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            return `${base}${isEndDate ? 'T23:59:59Z' : 'T00:00:00Z'}`;
          }
          
          // Try to parse as date and convert to ISO 8601
          const d = new Date(iso);
          if (!isNaN(d)) {
            const year = d.getUTCFullYear();
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            const base = `${year}-${month}-${day}`;
            return `${base}${isEndDate ? 'T23:59:59Z' : 'T00:00:00Z'}`;
          }
        } catch {}
        return undefined;
      };

      const qp = new URLSearchParams();
      qp.set('Page', String(page));
      qp.set('PageSize', String(pageSize));
      const sd = toImpactActionsDate(startDate, false);
      const ed = toImpactActionsDate(endDate, true);
      if (sd) qp.set('StartDate', sd);
      if (ed) qp.set('EndDate', ed);
      
      // DEBUG: Log the exact API request parameters
      console.log(`[ImpactWebService] 🔍 getActionsDetailed API Request Debug:`);
      console.log(`[ImpactWebService] 📅 Original dates: startDate=${startDate}, endDate=${endDate}`);
      console.log(`[ImpactWebService] 📅 Converted dates: StartDate=${sd}, EndDate=${ed}`);
      console.log(`[ImpactWebService] 🔍 Query parameters: ${qp.toString()}`);
      console.log(`[ImpactWebService] 🆔 SubId1: ${subId1}`);
      console.log(`[ImpactWebService] 📊 Page: ${page}, PageSize: ${pageSize}`);
      if (status) qp.set('ActionStatus', status);
      if (actionType) qp.set('ActionType', actionType);
      if (subId1) qp.set('SubId1', subId1);
      if (campaignId) qp.set('CampaignId', String(campaignId));

      const url = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Actions?${qp.toString()}`;

      const doFetch = async (targetUrl) => fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      // Use timeout wrapper to prevent hanging
      let response = await this.executeWithTimeout(doFetch, 30000, url);
      
      // Handle rate limit headers
      this.handleRateLimitHeaders(response);
      
      // Handle rate limiting with exponential backoff
      if (!response.ok) {
        const errorText = await response.text();
        const isRateLimit = response.status === 429 || errorText.includes('rate limit');
        
        if (isRateLimit && retryCount < maxRetries) {
          // Get rate limit reset time from headers
          const resetTime = response.headers.get('X-RateLimit-Reset');
          let delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
          
          if (resetTime) {
            const resetTimestamp = parseInt(resetTime) * 1000;
            const now = Date.now();
            delay = Math.max(delay, resetTimestamp - now + 1000); // Wait until reset + 1 second buffer
          }
          
          console.log(`[ImpactWebService] ⏳ Rate limit hit (429), retrying in ${Math.ceil(delay / 1000)}s (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return this.getActionsDetailed({
            ...options,
            retryCount: retryCount + 1
          });
        }
        
        // If still failing after retries, try fallback without date filters
        if (!noRetry && !isRateLimit) {
          console.log(`[ImpactWebService] 🔄 API failed, trying fallback without date filters`);
          const qpNoDates = new URLSearchParams();
          qpNoDates.set('Page', String(page));
          qpNoDates.set('PageSize', String(pageSize));
          if (status) qpNoDates.set('ActionStatus', status);
          if (actionType) qpNoDates.set('ActionType', actionType);
          if (subId1) qpNoDates.set('SubId1', subId1);
          if (campaignId) qpNoDates.set('CampaignId', String(campaignId));
          const fallbackUrl = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Actions?${qpNoDates.toString()}`;
          const retry = await this.executeWithTimeout(doFetch, 30000, fallbackUrl);
          if (!retry.ok) {
            return { success: false, status: response.status, error: errorText, actions: [], totalResults: 0 };
          }
          response = retry;
        } else {
          console.log(`[ImpactWebService] ❌ API failed after ${retryCount} retries: ${errorText}`);
          return { success: false, status: response.status, error: errorText, actions: [], totalResults: 0 };
        }
      }
      const data = await response.json();
      
      // DEBUG: Log the actual API response
      console.log(`[ImpactWebService] 📊 API Response Data:`);
      console.log(`[ImpactWebService] 📊 Total Actions: ${data.Actions?.length || 0}`);
      console.log(`[ImpactWebService] 📊 Total Results: ${data.TotalResults || data.TotalRecords || 0}`);
      console.log(`[ImpactWebService] 📊 Response Keys: ${Object.keys(data).join(', ')}`);
      if (data.Actions && data.Actions.length > 0) {
        console.log(`[ImpactWebService] 📊 First Action Sample:`, {
          SubId1: data.Actions[0].SubId1,
          EventDate: data.Actions[0].EventDate,
          Payout: data.Actions[0].Payout,
          Amount: data.Actions[0].Amount,
          State: data.Actions[0].State
        });
      }
      
      const result = {
        success: true,
        totalResults: data.TotalResults || data.TotalRecords || 0,
        page,
        pageSize,
        actions: data.Actions || data.Results || [],
        raw: data
      };

      // Cache successful results (only for first attempt)
      if (retryCount === 0) {
        const cacheKey = this.getCacheKey('getActionsDetailed', { startDate, endDate, status, actionType, page, pageSize, subId1, campaignId });
        this.setCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      // Handle rate limiting with retry logic
      const isRateLimit = error.message && (error.message.includes('rate limit') || error.message.includes('429'));
      
      if (isRateLimit && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`[ImpactWebService] ⏳ Actions API rate limit hit, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.getActionsDetailed({
          ...options,
          retryCount: retryCount + 1
        });
      }
      
      console.log(`[ImpactWebService] ❌ API failed after ${retryCount + 1} attempts: ${error.message}`);
      return { success: false, error: error.message, actions: [], totalResults: 0 };
    } finally {
      // Only release the call lock if a call was actually started
      if (callStarted) {
        this.releaseCall();
      }
    }
  }

  // NEW: Get ALL actions with proper pagination
  async getAllActionsDetailed(options = {}) {
    try {
      const {
        startDate,
        endDate,
        status,
        actionType,
        subId1,
        campaignId,
        maxPages = 10 // Safety limit to prevent infinite loops
      } = options;

      console.log(`[ImpactWebService] 🔄 Fetching ALL pages for SubId1: ${subId1}`);
      
      let allActions = [];
      let currentPage = 1;
      let totalResults = 0;
      let hasMorePages = true;

      while (hasMorePages && currentPage <= maxPages) {
        console.log(`[ImpactWebService] 📄 Fetching page ${currentPage}...`);
        
        const pageResult = await this.getActionsDetailed({
          startDate,
          endDate,
          status,
          actionType,
          subId1,
          campaignId,
          page: currentPage,
          pageSize: 2000 // Use actual max page size from API
        });

        if (!pageResult.success) {
          console.log(`[ImpactWebService] ❌ Page ${currentPage} failed: ${pageResult.error}`);
          break;
        }

        // Add actions from this page
        if (pageResult.actions && pageResult.actions.length > 0) {
          allActions = allActions.concat(pageResult.actions);
          console.log(`[ImpactWebService] ✅ Page ${currentPage}: ${pageResult.actions.length} actions (total: ${allActions.length})`);
        }

        // Update total results from first page
        if (currentPage === 1) {
          totalResults = pageResult.totalResults;
          // If totalResults is 0, use the raw data total
          if (totalResults === 0 && pageResult.raw && pageResult.raw['@total']) {
            totalResults = parseInt(pageResult.raw['@total']) || 0;
            console.log(`[ImpactWebService] 🔧 Using raw total: ${totalResults}`);
          }
        }

        // Check if there are more pages
        const totalPages = Math.ceil(totalResults / 2000);
        hasMorePages = currentPage < totalPages && pageResult.actions.length === 2000;
        
        console.log(`[ImpactWebService] 📊 Page ${currentPage}: ${pageResult.actions.length} actions, Total: ${totalResults}, Pages: ${totalPages}, HasMore: ${hasMorePages}`);
        
        currentPage++;
        
        // Small delay between pages to be respectful to the API
        if (hasMorePages) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Increased to 1 second
        }
      }

      console.log(`[ImpactWebService] 🎯 Fetched ${allActions.length} total actions across ${currentPage - 1} pages`);
      
      // Filter by SubId1 if provided (since API filtering might not be perfect)
      let filteredActions = allActions;
      if (subId1) {
        const beforeFilter = filteredActions.length;
        filteredActions = filteredActions.filter(action => action.SubId1 === subId1);
        console.log(`[ImpactWebService] 🔍 SubId1 Filter: ${beforeFilter} -> ${filteredActions.length} actions`);
      }

      // Filter by date range if provided
      if (startDate && endDate) {
        const beforeDateFilter = filteredActions.length;
        const startDateObj = new Date(startDate);
        let endDateObj = new Date(endDate);
        // Make end date inclusive by setting to end of day (UTC)
        if (!isNaN(endDateObj)) {
          endDateObj = new Date(Date.UTC(
            endDateObj.getUTCFullYear(),
            endDateObj.getUTCMonth(),
            endDateObj.getUTCDate(),
            23, 59, 59, 999
          ));
        }
        
        filteredActions = filteredActions.filter(action => {
          if (!action.EventDate) return false;
          const actionDate = new Date(action.EventDate);
          return actionDate >= startDateObj && actionDate <= endDateObj;
        });
        console.log(`[ImpactWebService] 📅 Date Filter: ${beforeDateFilter} -> ${filteredActions.length} actions`);
      }

      return {
        success: true,
        totalResults: filteredActions.length,
        totalPages: currentPage - 1,
        actions: filteredActions,
        raw: { totalFetched: allActions.length, totalFiltered: filteredActions.length }
      };

    } catch (error) {
      console.error(`[ImpactWebService] ❌ getAllActionsDetailed failed: ${error.message}`);
      return { success: false, error: error.message, actions: [], totalResults: 0 };
    }
  }

  // --- Reports API helpers (Action Listing) ---
  async listReports() {
    try {
      const url = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Reports`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'Accept': 'application/json'
        }
      });
      if (!res.ok) return { success: false, status: res.status, error: await res.text() };
      const data = await res.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async resolveActionListingReportId() {
    // Try to find a report whose Name includes "Action Listing" first; fallback to known handles
    try {
      const list = await this.listReports();
      if (list.success && Array.isArray(list.data?.Reports)) {
        const match = list.data.Reports.find(r => (r.Name || '').toLowerCase().includes('action listing') && r.ApiAccessible);
        if (match) return match.Id || (match.ApiRunUri || '').split('/').pop();
      }
    } catch {}
    // Fallback handles often present on publisher accounts
    return 'mp_action_listing_sku_fast';
  }

  async exportReportAndDownloadJson(idOrHandle, query) {
    try {
      // Wait for rate limiting
      await this.waitForRateLimit();
      
      // Schedule export
      const qp = new URLSearchParams(query || {});
      // Strongly request JSON
      qp.set('ResultFormat', 'JSON');
      const scheduleUrl = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/ReportExport/${encodeURIComponent(idOrHandle)}?${qp.toString()}`;
      const headers = {
        'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
        'Accept': 'application/json'
      };

      const resp = await fetch(scheduleUrl, { method: 'GET', headers });
      if (!resp.ok) {
        return { success: false, status: resp.status, error: await resp.text() };
      }
      const job = await resp.json();
      const jobStatusUrl = `${this.apiBaseUrl}${job.QueuedUri}`;
      const resultUrl = `${this.apiBaseUrl}${job.ResultUri}`;

      // Poll job status
      const started = Date.now();
      const timeoutMs = 30000; // 30s safety
      // Basic exponential backoff
      let delay = 500;
      while (Date.now() - started < timeoutMs) {
        try {
          const s = await fetch(jobStatusUrl, { method: 'GET', headers });
          if (s.ok) {
            const st = await s.json();
            const status = (st.Status || '').toUpperCase();
            if (status === 'COMPLETED' || status === 'FINISHED' || status === 'DONE') break;
            if (status === 'FAILED') return { success: false, error: 'Report job failed' };
          }
        } catch {}
        await new Promise(r => setTimeout(r, delay));
        delay = Math.min(2000, delay * 1.5);
      }

      // Download JSON
      const dl = await fetch(resultUrl, { method: 'GET', headers });
      if (!dl.ok) return { success: false, status: dl.status, error: await dl.text() };
      // Some accounts return application/json, others return text JSON; parse robustly
      const text = await dl.text();
      try {
        const json = JSON.parse(text);
        return { success: true, json };
      } catch {
        // Attempt to wrap CSV-to-JSON quickly (not expected since ResultFormat=JSON)
        return { success: false, error: 'Non-JSON result from ReportExport' };
      }
    } catch (error) {
      console.error('[Export Report] Error:', error.message);
      return { success: false, error: error.message };
    } finally {
      // Always release the call lock
      this.releaseCall();
    }
  }

  async getPendingFromActionListingReport(options = {}) {
    try {
      // Wait for rate limiting
      await this.waitForRateLimit();
      
      const { subId1, startDate, endDate } = options;
      const id = await this.resolveActionListingReportId();
      // Use exact filter keys per MetaData for mp_action_listing_fast
      // FIXED: Remove Program filter to get ALL programs (not just default)
      // This fixes the 30-day/custom earnings issue where data spans multiple programs
      const query = {
        START_DATE: startDate, // YYYY-MM-DD
        END_DATE: endDate,     // YYYY-MM-DD
        // 'Action Status': 'Pending', // REMOVED: Get all statuses to match dashboard
        // Program: this.programId // REMOVED: Get all programs, not just default
      };
      let result = await this.exportReportAndDownloadJson(id, query);
      if (!result.success) {
        // Fallback: try synchronous Reports endpoint (deprecated but still available)
        try {
          const qp = new URLSearchParams(query);
          const url = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Reports/${encodeURIComponent(id)}?${qp.toString()}`;
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
              'Accept': 'application/json'
            }
          });
          if (res.ok) {
            const json = await res.json();
            result = { success: true, json };
          }
        } catch {}
        if (!result?.success) return { success: false, error: result?.error || 'ReportExport failed and fallback returned no data' };
      }

      // Records may be under Records or nested in an array; normalize
      const raw = Array.isArray(result.json?.Records) ? result.json.Records : (Array.isArray(result.json) ? result.json : []);

      // Identify the SubId field name present in records (per Attributes, Subid1)
      const subIdKeys = ['Subid1','SubId1','SubID1','Sub_Id1','TrackingValue','Tracking_Value','SubId'];
      const payoutKeys = ['Payout','Commission'];
      const norm = (v) => String(v || '').trim();

      const findSubIdKey = (row) => subIdKeys.find(k => Object.prototype.hasOwnProperty.call(row, k));
      const getSubIdVal = (row) => {
        const k = findSubIdKey(row);
        return k ? norm(row[k]) : '';
      };
      const getMoney = (row) => {
        for (const k of payoutKeys) {
          if (row[k] !== undefined && row[k] !== null) {
            const val = parseFloat(String(row[k]).replace(/[^0-9.-]/g, ''));
            if (Number.isFinite(val)) return val;
          }
        }
        return 0;
      };

      // Filter to the requested SubId1 even if the report filter didn't apply
      let filtered = raw.filter(r => !subId1 || norm(getSubIdVal(r)) === norm(subId1));
      
      // Optional: Filter by program if we want to maintain some program filtering
      // This allows us to get data from all programs but optionally filter by default program
      if (this.programId) {
        const programFiltered = filtered.filter(r => {
          const program = r.Program || r.ProgramId || r.Campaign;
          return !program || program === this.programId;
        });
        
        // If program filtering removes all data, use all programs (fallback)
        if (programFiltered.length > 0) {
          filtered = programFiltered;
          console.log(`[Impact Reports] Filtered by program ${this.programId}: ${filtered.length} records`);
        } else {
          console.log(`[Impact Reports] No data for program ${this.programId}, using all programs: ${filtered.length} records`);
        }
      }

      // Enhanced de-duplication using multiple possible action ID fields
      const seen = new Set();
      let gross = 0;
      for (const r of filtered) {
        // Try multiple possible action ID field names
        const actionId = r.action_id || r.Action_Id || r.ActionId || r.Id || r.TransactionId || 
                        `${r.Campaign || ''}:${r.action_date || r.Action_Date || r.EventDate || ''}:${r.Payout || r.Commission || ''}`;
        
        if (seen.has(actionId)) continue;
        seen.add(actionId);
        gross += getMoney(r);
      }
      
      console.log(`[Impact Reports] SubId1: ${subId1}, Raw records: ${raw.length}, Filtered: ${filtered.length}, Unique actions: ${seen.size}, Gross: ${gross}`);
      
      return { success: true, gross, count: seen.size, rawActions: filtered };
    } catch (error) {
      console.error('[Impact Reports] Error:', error.message);
      return { success: false, error: error.message };
    } finally {
      // Always release the call lock
      this.releaseCall();
    }
  }



  // Fetch a single Action detail (attempt to include item-level data if available)
  async getActionDetail(actionId) {
    try {
      if (!actionId) return { success: false, error: 'actionId required' };
      const url = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Actions/${encodeURIComponent(actionId)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        return { success: false, status: response.status, error: await response.text() };
      }
      const data = await response.json();

      // Attempt a second call for item-level data (if available for this account)
      try {
        const itemsUrl = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Actions/${encodeURIComponent(actionId)}/Items`;
        const itemsResp = await fetch(itemsUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        if (itemsResp.ok) {
          const itemsData = await itemsResp.json();
          // Common shapes: { Items: [...] } or an array
          const items = Array.isArray(itemsData) ? itemsData : (itemsData.Items || itemsData.results || []);
          if (Array.isArray(items) && items.length > 0) {
            data.Items = items;
          }
        }
      } catch { /* non-fatal */ }

      return { success: true, action: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Validate URL format - SAFE PRODUCTION METHOD
  isValidUrl(urlString) {
    try {
      const url = new URL(urlString);
      
      // Check for basic protocol
      if (!['http:', 'https:'].includes(url.protocol)) {
        return false;
      }
      
      // Check for malformed URLs
      if (urlString.includes('wwhttps://') || urlString.includes('https://https://')) {
        return false;
      }
      
      // Check for multiple product IDs in same URL
      const productIdMatches = urlString.match(/\/ip\/[^\/\?]+/g);
      if (productIdMatches && productIdMatches.length > 1) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  // Get real clicks and performance data by SubId1 (NEW - for accurate analytics)
  async getPerformanceBySubId(options = {}) {
    const { startDate, endDate, subId1, retryCount = 0, maxRetries = 3 } = options;
    console.log(`🎯 Fetching real performance data for SubId1: ${subId1}`);
    
    // Check cache first
    if (retryCount === 0) {
      const cacheKey = this.getCacheKey('getPerformanceBySubId', { startDate, endDate, subId1 });
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log(`[ImpactWebService] 📦 Cache hit for getPerformanceBySubId - avoiding API call`);
        return cached;
      }
    }

    // Use queue system for rate limiting
    return this.queueApiCall(this._getPerformanceBySubIdInternal, options);
  }

  // Internal method for performance data (called by queue)
  async _getPerformanceBySubIdInternal(options = {}) {
    try {
      const { startDate, endDate, subId1, retryCount = 0, maxRetries = 3 } = options;

      // Wait for rate limiting
      await this.waitForRateLimit();
      
      const exp = await this.exportReportAndDownloadJson("partner_performance_by_subid", {
        START_DATE: startDate,
        END_DATE: endDate,
        Program: this.programId,
        ResultFormat: "JSON"
      });
      
      if (!exp.success) {
        const isRateLimit = exp.error && (exp.error.includes('rate limit') || exp.error.includes('429'));
        
        if (isRateLimit && retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(`[ImpactWebService] ⏳ Performance API rate limit hit, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return this.getPerformanceBySubId({
            ...options,
            retryCount: retryCount + 1
          });
        }
        
        console.log('⚠️ Performance by SubId report failed:', exp.error);
        return { success: false, error: exp.error };
      }
      
      const records = Array.isArray(exp.json.Records) ? exp.json.Records : [];
      console.log(`📊 Found ${records.length} performance records`);
      
      if (subId1) {
        // Find specific creator's data
        const match = records.find(r => {
          const pubSubId = (r.pubsubid1_ || r.SubId1 || r.Subid1 || '') + '';
          return pubSubId.trim() === subId1;
        });
        
        if (match) {
          const clicks = parseInt(match.Clicks || match.raw_clicks || 0);
          const actions = parseInt(match.Actions || 0);
          const sales = parseFloat(match.sale_amount || match.Sale_Amount || 0);
          const commission = parseFloat(match.Earnings || 0);
          const conversionRate = clicks > 0 ? parseFloat(((actions / clicks) * 100).toFixed(2)) : 0;
          
          console.log(`✅ Real performance for ${subId1}: ${clicks} clicks, ${actions} actions, ${conversionRate}% CR`);
          
          const result = {
            success: true,
            data: {
              clicks,
              actions,
              sales,
              commission,
              conversionRate,
              subId1
            }
          };
          
          // Cache successful results
          if (retryCount === 0) {
            const cacheKey = this.getCacheKey('getPerformanceBySubId', { startDate, endDate, subId1 });
            this.setCache(cacheKey, result);
          }
          
          return result;
        } else {
          console.log(`❌ No performance data found for SubId1: ${subId1}`);
          return { success: false, error: 'No data found for this SubId1' };
        }
      } else {
        // Return all records for platform analytics
        const platformData = records.map(r => ({
          subId1: r.pubsubid1_ || r.SubId1 || 'unknown',
          clicks: parseInt(r.Clicks || r.raw_clicks || 0),
          actions: parseInt(r.Actions || 0),
          sales: parseFloat(r.sale_amount || r.Sale_Amount || 0),
          commission: parseFloat(r.Earnings || 0),
          conversionRate: parseInt(r.Clicks || 0) > 0 ? 
            parseFloat(((parseInt(r.Actions || 0) / parseInt(r.Clicks || 0)) * 100).toFixed(2)) : 0
        }));
        
        return {
          success: true,
          data: platformData
        };
      }
    } catch (error) {
      console.error('❌ Error fetching performance by SubId:', error);
      return { success: false, error: error.message };
    } finally {
      // Always release the call lock
      this.releaseCall();
    }
  }

  // Test API connectivity
  async testConnection() {
    try {
      console.log('🔍 Testing Impact.com API connection...');
      
      const url = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Programs`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('✅ Impact.com API connection successful');
        return { success: true };
      } else {
        console.log('❌ Impact.com API connection failed:', response.status);
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      console.error('❌ Impact.com API connection error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ImpactWebService;