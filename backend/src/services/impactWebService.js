const crypto = require('crypto');

class ImpactWebService {
  constructor() {
    // Impact.com API credentials
    this.accountSid = process.env.IMPACT_ACCOUNT_SID || 'IR6HvVENfaTR3908029jXFhKg7EFcPYDe1';
    this.authToken = process.env.IMPACT_AUTH_TOKEN || 'VdKCaAEqjDjKGmwMX3e.-pehMdm3ZiDd';
    this.programId = process.env.IMPACT_PROGRAM_ID || '16662';
    // Media partner (account) id e.g. 3908029
    this.mediaPartnerId = process.env.IMPACT_MEDIA_PARTNER_ID || '3908029';
    // Media partner property id (AdId) e.g. 1398372
    this.mediaPartnerPropertyId = process.env.IMPACT_MEDIA_PARTNER_PROPERTY_ID || process.env.IMPACT_AD_ID || '1398372';
    this.apiBaseUrl = process.env.IMPACT_API_BASE_URL || 'https://api.impact.com';
    // Feature flag: include MediaPartnerPropertyId in TrackingLinks request
    this.includeMediaPropertyId = String(process.env.IMPACT_SEND_MEDIA_PROPERTY_ID || process.env.IMPACT_INCLUDE_MEDIA_PROPERTY_ID || 'false').toLowerCase() === 'true';
    // Feature flag: control deep link sanitization (default OFF per request)
    this.sanitizeDeepLink = String(process.env.IMPACT_SANITIZE_DEEPLINK || 'false').toLowerCase() === 'true';
    // Optional default sharedid (can be overridden per-request)
    this.defaultSharedId = process.env.IMPACT_DEFAULT_SHAREDID || '';
    // Feature flag: obfuscate subId1 with HMAC to avoid exposing raw IDs
    this.useObfuscatedSubId1 = String(process.env.IMPACT_USE_OBFUSCATED_SUBID1 || 'false').toLowerCase() === 'true';
    this.subId1Salt = process.env.IMPACT_SUBID1_SALT || '';
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

      const url = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Programs/${this.programId}/TrackingLinks?${qp.toString()}`;
      
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
      
      // Use fallback method if API fails
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

  // Get platform analytics
  async getPlatformAnalytics() {
    try {
      console.log('📊 Fetching platform analytics from Impact.com...');
      
      const url = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Actions`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${this.authToken}`,
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
        console.log('❌ Failed to fetch analytics from Impact.com');
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

  // Test API connectivity
  async testConnection() {
    try {
      console.log('🔍 Testing Impact.com API connection...');
      
      const url = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Programs`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${this.authToken}`,
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