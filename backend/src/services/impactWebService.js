const crypto = require('crypto');

class ImpactWebService {
  constructor() {
    // CRITICAL: Remove hardcoded credentials - use environment variables only
    this.accountSid = process.env.IMPACT_ACCOUNT_SID;
    this.authToken = process.env.IMPACT_AUTH_TOKEN;
    this.programId = process.env.IMPACT_PROGRAM_ID;
    this.mediaPartnerId = process.env.IMPACT_MEDIA_PARTNER_ID;
    this.mediaPartnerPropertyId = process.env.IMPACT_MEDIA_PARTNER_PROPERTY_ID || process.env.IMPACT_AD_ID;
    this.apiBaseUrl = process.env.IMPACT_API_BASE_URL || 'https://api.impact.com';
    this.includeMediaPropertyId = String(process.env.IMPACT_SEND_MEDIA_PROPERTY_ID || process.env.IMPACT_INCLUDE_MEDIA_PROPERTY_ID || 'false').toLowerCase() === 'true';
    this.sanitizeDeepLink = String(process.env.IMPACT_SANITIZE_DEEPLINK || 'false').toLowerCase() === 'true';
    this.defaultSharedId = process.env.IMPACT_DEFAULT_SHAREDID || '';
    this.useObfuscatedSubId1 = String(process.env.IMPACT_USE_OBFUSCATED_SUBID1 || 'false').toLowerCase() === 'true';
    this.subId1Salt = process.env.IMPACT_SUBID1_SALT || '';
    
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
        noRetry = false
      } = options;

      // Normalize dates to Impact-friendly format (MM/DD/YYYY)
      const toImpactDate = (val) => {
        if (!val) return undefined;
        try {
          // If already MM/DD/YYYY, keep as-is
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;
          // If ISO-like, convert to UTC date components
          const iso = typeof val === 'string' ? val : String(val);
          const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
          if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            const [y, m, d] = datePart.split('-');
            return `${m}/${d}/${y}`;
          }
          const d = new Date(iso);
          if (!isNaN(d)) {
            const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(d.getUTCDate()).padStart(2, '0');
            const yy = d.getUTCFullYear();
            return `${mm}/${dd}/${yy}`;
          }
        } catch {}
        return undefined;
      };

      const qp = new URLSearchParams();
      qp.set('Page', String(page));
      qp.set('PageSize', String(pageSize));
      const sd = toImpactDate(startDate);
      const ed = toImpactDate(endDate);
      if (sd) qp.set('StartDate', sd);
      if (ed) qp.set('EndDate', ed);
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

      let response = await doFetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        // Retry once without date filters as a safe fallback (some programs reject ranges)
        if (noRetry) {
          return { success: false, status: response.status, error: errorText, actions: [], totalResults: 0 };
        }
        const qpNoDates = new URLSearchParams();
        qpNoDates.set('Page', String(page));
        qpNoDates.set('PageSize', String(pageSize));
        if (status) qpNoDates.set('ActionStatus', status);
        if (actionType) qpNoDates.set('ActionType', actionType);
        if (subId1) qpNoDates.set('SubId1', subId1);
        if (campaignId) qpNoDates.set('CampaignId', String(campaignId));
        const fallbackUrl = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Actions?${qpNoDates.toString()}`;
        const retry = await doFetch(fallbackUrl);
        if (!retry.ok) {
          return { success: false, status: response.status, error: errorText, actions: [], totalResults: 0 };
        }
        response = retry;
      }
      const data = await response.json();
      return {
        success: true,
        totalResults: data.TotalResults || data.TotalRecords || 0,
        page,
        pageSize,
        actions: data.Actions || data.Results || [],
        raw: data
      };
    } catch (error) {
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
  }

  async getPendingFromActionListingReport(options = {}) {
    try {
      const { subId1, startDate, endDate } = options;
      const id = await this.resolveActionListingReportId();
      // Use exact filter keys per MetaData for mp_action_listing_fast
      // TEMP DEBUG: Remove Action Status filter to get ALL actions (not just Pending)
      const query = {
        START_DATE: startDate, // YYYY-MM-DD
        END_DATE: endDate,     // YYYY-MM-DD
        // 'Action Status': 'Pending', // REMOVED: Get all statuses to match dashboard
        Program: this.programId
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
      const filtered = raw.filter(r => !subId1 || norm(getSubIdVal(r)) === norm(subId1));

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
    try {
      const { startDate, endDate, subId1 } = options;
      console.log(`🎯 Fetching real performance data for SubId1: ${subId1}`);
      
      const exp = await this.exportReportAndDownloadJson("partner_performance_by_subid", {
        START_DATE: startDate,
        END_DATE: endDate,
        Program: this.programId,
        ResultFormat: "JSON"
      });
      
      if (!exp.success) {
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
          
          return {
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
  // NEW: Enhanced method to get detailed product sales data with real product information
  async getEnhancedSalesData(options = {}) {
    try {
      const { subId1, startDate, endDate, limit = 100 } = options;
      console.log(`🛍️ Fetching enhanced sales data for SubId1: ${subId1}`);
      
      // Step 1: Try advanced action listing report for maximum detail
      let salesData = [];
      
      try {
        const advancedReport = await this.getAdvancedActionListing({
          subId1,
          startDate,
          endDate,
          includeProductDetails: true,
          limit
        });
        
        if (advancedReport.success && advancedReport.actions.length > 0) {
          salesData = advancedReport.actions;
          console.log(`🛍️ Got ${salesData.length} sales from advanced action listing`);
        }
      } catch (error) {
        console.log(`🛍️ Advanced action listing failed: ${error.message}`);
      }
      
      // Step 2: Fallback to detailed actions API if advanced report fails
      if (salesData.length === 0) {
        const detailedActions = await this.getActionsDetailed({
          startDate: startDate + 'T00:00:00Z',
          endDate: endDate + 'T23:59:59Z',
          subId1,
          actionType: 'SALE',
          pageSize: limit
        });
        
        if (detailedActions.success && detailedActions.actions) {
          salesData = detailedActions.actions.filter(action => {
            const actionSubId1 = action.SubId1 || action.Subid1 || '';
            const commission = parseFloat(action.Payout || action.Commission || 0);
            return actionSubId1 === subId1 && commission > 0;
          });
          console.log(`🛍️ Got ${salesData.length} sales from detailed actions API`);
        }
      }
      
      // Step 3: CRITICAL - Double-check creator isolation before processing
      const creatorIsolatedSales = salesData.filter(sale => {
        const saleSubId1 = sale.SubId1 || sale.Subid1 || sale.SubID1 || sale.TrackingValue || '';
        const matches = saleSubId1.toString().trim() === subId1.toString().trim();
        if (!matches) {
          console.error(`🚨 SECURITY: Blocking sale with wrong SubId1: ${saleSubId1} (expected: ${subId1})`);
        }
        return matches;
      });
      
      if (creatorIsolatedSales.length !== salesData.length) {
        console.error(`🚨 SECURITY: Filtered ${salesData.length - creatorIsolatedSales.length} sales that didn't belong to creator ${subId1}`);
      }
      
      // Step 4: Process and enhance each sale with product information
      const enhancedSales = [];
      
      for (const sale of creatorIsolatedSales) {
        const enhancedSale = await this.enhanceSaleWithProductData(sale);
        if (enhancedSale) {
          enhancedSales.push(enhancedSale);
        }
      }
      
      console.log(`🛍️ Enhanced ${enhancedSales.length} sales with product data`);
      
      return {
        success: true,
        sales: enhancedSales,
        totalSales: enhancedSales.reduce((sum, sale) => sum + sale.orderValue, 0),
        totalCommission: enhancedSales.reduce((sum, sale) => sum + sale.grossCommission, 0)
      };
      
    } catch (error) {
      console.error('❌ Enhanced sales data error:', error);
      return {
        success: false,
        sales: [],
        totalSales: 0,
        totalCommission: 0,
        error: error.message
      };
    }
  }

  // NEW: Get advanced action listing with detailed product information
  async getAdvancedActionListing(options = {}) {
    try {
      const { subId1, startDate, endDate, includeProductDetails = true, limit = 100 } = options;
      
      // Use the comprehensive action listing report with all available fields
      const query = {
        START_DATE: startDate,
        END_DATE: endDate,
        Program: this.programId,
        ResultFormat: 'JSON',
        PageSize: limit.toString(),
        // Include additional fields for product information
        INCLUDE_PRODUCT_DETAILS: includeProductDetails ? '1' : '0',
        INCLUDE_TRACKING_URLS: '1',
        INCLUDE_CUSTOMER_INFO: '0', // Privacy compliance
        ACTION_STATUS: 'APPROVED,PENDING' // Get both approved and pending
      };
      
      // Add SubId1 filter if provided
      if (subId1) {
        query.SUBID1 = subId1;
      }
      
      const reportId = await this.resolveActionListingReportId();
      const result = await this.exportReportAndDownloadJson(reportId, query);
      
      if (!result.success) {
        return { success: false, actions: [], error: result.error };
      }
      
      const records = Array.isArray(result.json?.Records) ? result.json.Records : [];
      console.log(`📊 Advanced action listing returned ${records.length} records`);
      
      // CRITICAL FIX: Filter by SubId1 FIRST to ensure creator isolation
      let creatorFilteredRecords = records;
      if (subId1) {
        creatorFilteredRecords = records.filter(record => {
          const recordSubId1 = record.SubId1 || record.Subid1 || record.SubID1 || record.TrackingValue || '';
          const matches = recordSubId1.toString().trim() === subId1.toString().trim();
          if (!matches) {
            console.log(`🚫 Filtering out record with SubId1: ${recordSubId1} (expected: ${subId1})`);
          }
          return matches;
        });
        console.log(`🎯 Creator filter: ${records.length} total → ${creatorFilteredRecords.length} for creator ${subId1}`);
      }
      
      // Filter for commissionable actions only (after creator filtering)
      const commissionableActions = creatorFilteredRecords.filter(record => {
        const commission = parseFloat(record.Payout || record.Commission || 0);
        return commission > 0;
      });
      
      return {
        success: true,
        actions: commissionableActions,
        totalRecords: records.length
      };
      
    } catch (error) {
      console.error('❌ Advanced action listing error:', error);
      return {
        success: false,
        actions: [],
        error: error.message
      };
    }
  }

  // NEW: Enhance individual sale with detailed product information
  async enhanceSaleWithProductData(saleAction) {
    try {
      const actionId = saleAction.Id;
      const grossCommission = parseFloat(saleAction.Payout || saleAction.Commission || 0);
      const orderValue = parseFloat(saleAction.Amount || saleAction.SaleAmount || saleAction.IntendedAmount || 0);
      
      // Extract product information with enhanced logic
      let productName = this.extractProductName(saleAction);
      let productUrl = await this.extractProductUrl(saleAction);
      let productCategory = this.extractProductCategory(saleAction);
      let productSku = this.extractProductSku(saleAction);
      
      // Mask brand names as requested
      productName = this.maskBrandNames(productName);
      
      // Get sale date
      const saleDate = saleAction.EventDate || saleAction.CreationDate || saleAction.ClickDate || new Date().toISOString();
      
      return {
        actionId,
        product: productName,
        productUrl,
        productCategory,
        productSku,
        orderValue,
        grossCommission,
        date: saleDate,
        status: saleAction.State || saleAction.Status || 'Pending',
        campaignName: this.maskBrandNames(saleAction.CampaignName || 'Walmart'),
        // Additional metadata for debugging and security validation
        _debug: {
          originalProductName: saleAction.ProductName || saleAction.Product,
          availableFields: Object.keys(saleAction),
          subId1: saleAction.SubId1 || saleAction.Subid1 || saleAction.SubID1 || saleAction.TrackingValue || 'unknown'
        }
      };
      
    } catch (error) {
      console.error(`❌ Error enhancing sale ${saleAction.Id}:`, error);
      return null;
    }
  }

  // NEW: Extract product name with fallback logic
  extractProductName(action) {
    // Try multiple fields that might contain product names
    const productFields = [
      'ProductName', 'Product', 'ItemName', 'ItemDescription', 
      'ProductTitle', 'ProductDescription', 'Sku', 'ProductSku'
    ];
    
    for (const field of productFields) {
      if (action[field] && typeof action[field] === 'string' && action[field].trim()) {
        let productName = action[field].trim();
        
        // Clean up common prefixes/suffixes
        productName = productName.replace(/^(Walmart\.com - |Walmart - |Product: )/i, '');
        productName = productName.replace(/ - Walmart\.com$/i, '');
        
        // Truncate if too long
        if (productName.length > 60) {
          productName = productName.substring(0, 57) + '...';
        }
        
        return productName;
      }
    }
    
    // Fallback to campaign or generic name
    if (action.CampaignName && !action.CampaignName.toLowerCase().includes('walmart')) {
      return action.CampaignName;
    }
    
    return 'Product Sale';
  }

  // NEW: Extract product URL with advanced logic
  async extractProductUrl(action) {
    // Try multiple URL fields from Impact.com data
    const urlFields = [
      'TargetUrl', 'ProductUrl', 'LandingPageUrl', 'DestinationUrl',
      'Url', 'ProductLink', 'AffiliateUrl', 'TrackingUrl', 'ActionUrl',
      'ClickUrl', 'ReferrerUrl', 'OriginalUrl'
    ];
    
    for (const field of urlFields) {
      if (action[field] && typeof action[field] === 'string') {
        let url = action[field];
        
        // Try to extract Walmart product URL
        const extractedUrl = this.extractWalmartProductUrl(url);
        if (extractedUrl) {
          return extractedUrl;
        }
      }
    }
    
    return null;
  }

  // NEW: Extract Walmart product URL from various tracking URLs
  extractWalmartProductUrl(trackingUrl) {
    try {
      // Method 1: Look for 'u=' parameter (URL encoded destination)
      if (trackingUrl.includes('u=')) {
        const urlObj = new URL(trackingUrl);
        const encodedUrl = urlObj.searchParams.get('u');
        if (encodedUrl) {
          const decodedUrl = decodeURIComponent(encodedUrl);
          if (decodedUrl.includes('walmart.com/ip/')) {
            return decodedUrl;
          }
        }
      }
      
      // Method 2: Direct Walmart URL
      if (trackingUrl.includes('walmart.com/ip/')) {
        return trackingUrl;
      }
      
      // Method 3: Look for other common URL parameters
      const urlObj = new URL(trackingUrl);
      const params = ['url', 'destination', 'target', 'redirect', 'link'];
      
      for (const param of params) {
        const value = urlObj.searchParams.get(param);
        if (value && value.includes('walmart.com/ip/')) {
          return decodeURIComponent(value);
        }
      }
      
    } catch (error) {
      // Invalid URL, return null
    }
    
    return null;
  }

  // NEW: Extract product category
  extractProductCategory(action) {
    const categoryFields = ['Category', 'ProductCategory', 'ItemCategory', 'Department'];
    
    for (const field of categoryFields) {
      if (action[field] && typeof action[field] === 'string') {
        return action[field].trim();
      }
    }
    
    return null;
  }

  // NEW: Extract product SKU
  extractProductSku(action) {
    const skuFields = ['Sku', 'ProductSku', 'ItemSku', 'ProductId', 'ItemId'];
    
    for (const field of skuFields) {
      if (action[field] && typeof action[field] === 'string') {
        return action[field].trim();
      }
    }
    
    return null;
  }

  // NEW: Mask brand names as requested
  maskBrandNames(text) {
    if (!text || typeof text !== 'string') return text;
    
    let masked = text;
    
    // Replace WalmartCreator.com references
    masked = masked.replace(/walmartcreator\.com/gi, 'Walmart');
    masked = masked.replace(/walmart creator/gi, 'Walmart');
    
    // Remove Impact.com mentions
    masked = masked.replace(/impact\.com/gi, '');
    masked = masked.replace(/impact/gi, '');
    
    // Clean up extra spaces
    masked = masked.replace(/\s+/g, ' ').trim();
    
    return masked;
  }
}

module.exports = ImpactWebService;