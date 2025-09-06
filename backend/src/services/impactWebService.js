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

      // Normalize dates to Impact Actions API format (ISO 8601 with time and Z suffix)
      const toImpactActionsDate = (val) => {
        if (!val) return undefined;
        try {
          // If already in ISO 8601 format with time and Z, keep as-is
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(val)) return val;
          
          const iso = typeof val === 'string' ? val : String(val);
          
          // If it's just YYYY-MM-DD, add time and Z suffix
          if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
            return `${iso}T00:00:00Z`;
          }
          
          // If it's MM/DD/YYYY, convert to ISO 8601
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(iso)) {
            const [m, d, y] = iso.split('/');
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00Z`;
          }
          
          // Try to parse as date and convert to ISO 8601
          const d = new Date(iso);
          if (!isNaN(d)) {
            const year = d.getUTCFullYear();
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day}T00:00:00Z`;
          }
        } catch {}
        return undefined;
      };

      const qp = new URLSearchParams();
      qp.set('Page', String(page));
      qp.set('PageSize', String(pageSize));
      const sd = toImpactActionsDate(startDate);
      const ed = toImpactActionsDate(endDate);
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
}

module.exports = ImpactWebService;