class ImpactWebService {
  constructor() {
    // Impact.com API credentials - NEW WORKING CREDENTIALS
    this.accountSid = process.env.IMPACT_ACCOUNT_SID || 'IR6HvVENfaTR3908029jXFhKg7EFcPYDe1';
    this.authToken = process.env.IMPACT_AUTH_TOKEN || 'VdKCaAEqjDjKGmwMX3e.-pehMdm3ZiDd';
    this.programId = process.env.IMPACT_PROGRAM_ID || '16662';
    this.mediaPartnerId = process.env.IMPACT_MEDIA_PARTNER_ID || '3908029';
    this.apiBaseUrl = process.env.IMPACT_API_BASE_URL || 'https://api.impact.com';
  }

  // NEW: Create tracking link via Impact.com API
  async createTrackingLink(destinationUrl, creatorId, options = {}) {
    try {
      // Try multiple API endpoint patterns based on Impact.com documentation
      const endpoints = [
        // Pattern 1: Standard Mediapartners endpoint
        `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/TrackingLinks`,
        // Pattern 2: Campaign-specific endpoint  
        `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Campaigns/${this.programId}/TrackingLinks`,
        // Pattern 3: Programs endpoint
        `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Programs/${this.programId}/TrackingLinks`
      ];

      for (const url of endpoints) {
        try {
          // Method 1: POST with JSON body
          let response = await fetch(url, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')
            },
            body: JSON.stringify({
              TargetUrl: destinationUrl,
              MediaPartnerId: this.mediaPartnerId,
              CampaignId: this.programId,
              SubId1: creatorId || 'default',
              ...(options.subId2 && { SubId2: options.subId2 }),
              ...(options.subId3 && { SubId3: options.subId3 })
            })
          });

          if (response.ok) {
            const data = await response.json();
            return {
              success: true,
              trackingUrl: data.TrackingURL || data.TrackingUrl || data.trackingUrl,
              originalUrl: destinationUrl,
              apiEndpoint: url
            };
          }

          // Method 2: GET with query parameters
          const params = new URLSearchParams({
            TargetUrl: destinationUrl,
            MediaPartnerId: this.mediaPartnerId,
            CampaignId: this.programId,
            SubId1: creatorId || 'default',
            ...(options.subId2 && { SubId2: options.subId2 }),
            ...(options.subId3 && { SubId3: options.subId3 })
          });

          response = await fetch(`${url}?${params.toString()}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')
            }
          });

          if (response.ok) {
            const data = await response.json();
            return {
              success: true,
              trackingUrl: data.TrackingURL || data.TrackingUrl || data.trackingUrl,
              originalUrl: destinationUrl,
              apiEndpoint: url
            };
          }

        } catch (endpointError) {
          console.log(`Endpoint ${url} failed:`, endpointError.message);
          continue;
        }
      }

      throw new Error('All API endpoint patterns failed');

    } catch (error) {
      console.error('Impact.com API Error:', error.message);
      
      // Fallback to manual link generation if API fails
      return {
        success: false,
        trackingUrl: this.generateWorkingLinkFormat(null, creatorId, destinationUrl),
        originalUrl: destinationUrl,
        fallback: true,
        error: error.message
      };
    }
  }

  // FALLBACK: Generate working link format (as backup)
  generateWorkingLinkFormat(campaignId, subId, destinationUrl) {
    const baseUrl = `https://goto.walmart.com/c/${this.mediaPartnerId}/${this.accountSid}/${this.programId}`;
    const params = new URLSearchParams({
      sourceid: `imp_${Date.now()}`,
      veh: 'aff',
      u: destinationUrl,
      subId1: subId || 'default'
    });
    return `${baseUrl}?${params.toString()}`;
  }

  // Validate URL format
  isValidUrl(urlString) {
    try {
      const url = new URL(urlString);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }

  // Test API connectivity and permissions
  async testApiAccess() {
    try {
      // Test basic account access first
      const accountUrl = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}`;
      const response = await fetch(accountUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')
        }
      });

      if (!response.ok) {
        throw new Error(`Account access failed: ${response.status} ${await response.text()}`);
      }

      const accountData = await response.json();
      console.log('✅ Impact.com Account Access Successful:', accountData.Name || 'Unknown');

      // Test campaigns access
      const campaignsUrl = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Campaigns`;
      const campaignsResponse = await fetch(campaignsUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')
        }
      });

      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json();
        console.log('✅ Campaigns Access Available:', campaignsData.Campaigns?.length || 0, 'campaigns');
      }

      return {
        accountAccess: true,
        campaignsAccess: campaignsResponse.ok,
        accountInfo: accountData
      };

    } catch (error) {
      console.error('❌ Impact.com API Test Failed:', error.message);
      return {
        accountAccess: false,
        error: error.message
      };
    }
  }

  // NEW: Safe method to fetch real click data from Impact.com API
  async fetchClickDataFromImpact() {
    try {
      console.log('🔍 Fetching real click data from Impact.com API...');
      
      // Use ReportExport endpoint for comprehensive data (as per Impact.com documentation)
      const url = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/ReportExport/mp_io_history`;
      
      // Try multiple date formats that Impact.com might accept
      const formatImpactDate = (date) => {
        // Try different formats in order of likelihood
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear();
        
        // Format 1: MM-DD-YYYY (with hyphens)
        const format1 = `${month}-${day}-${year}`;
        // Format 2: MM/DD/YYYY (with slashes)
        const format2 = `${month}/${day}/${year}`;
        // Format 3: YYYY-MM-DD (ISO format)
        const format3 = `${year}-${month}-${day}`;
        // Format 4: MM/DD/YY (short year)
        const format4 = `${month}/${day}/${year.toString().slice(-2)}`;
        
        console.log('🔍 Trying date formats:', { format1, format2, format3, format4 });
        
        // Start with format 1 (MM-DD-YYYY) as it's commonly accepted
        return format1;
      };
      
      // Calculate date range (max 32 days as per Impact.com docs)
      const endDate = new Date();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
      
      // Try different date formats if the first one fails
      const dateFormats = [
        (date) => `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}-${date.getFullYear()}`, // MM-DD-YYYY
        (date) => `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`, // MM/DD/YYYY
        (date) => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`, // YYYY-MM-DD
        (date) => `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`, // MM/DD/YY
      ];
      
      let lastError = null;
      
      // Try each date format until one works
      for (let i = 0; i < dateFormats.length; i++) {
        try {
          const currentFormat = dateFormats[i];
          const params = new URLSearchParams({
            SUBAID: this.programId, // Required: Program ID
            StartDate: currentFormat(startDate), // Try current format
            EndDate: currentFormat(endDate), // Try current format
            ResultFormat: 'JSON' // Get JSON response
          });
          
          console.log(`🔍 Trying date format ${i + 1}:`, {
            startDate: currentFormat(startDate),
            endDate: currentFormat(endDate),
            format: i === 0 ? 'MM-DD-YYYY' : i === 1 ? 'MM/DD/YYYY' : i === 2 ? 'YYYY-MM-DD' : 'MM/DD/YY'
          });
          
          const response = await fetch(`${url}?${params}`, {
            method: 'GET',
            headers: {
              'Authorization': 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64'),
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            console.log(`✅ Date format ${i + 1} worked!`);
            const data = await response.json();
            return await this.processReportExportData(data);
          } else {
            const errorText = await response.text();
            lastError = `Format ${i + 1} failed: ${errorText}`;
            console.log(`❌ Date format ${i + 1} failed:`, errorText);
            continue; // Try next format
          }
        } catch (error) {
          lastError = `Format ${i + 1} error: ${error.message}`;
          console.log(`❌ Date format ${i + 1} error:`, error.message);
          continue; // Try next format
        }
      }
      
      // If all date formats failed, throw error and fall back to Actions endpoint
      console.log('❌ All date formats failed, falling back to Actions endpoint');
      throw new Error(`All date formats failed: ${lastError}`);
    } catch (error) {
      console.error('❌ Error fetching Impact.com click data from ReportExport:', error.message);
      
      // Fallback to Actions endpoint if ReportExport fails
      console.log('🔄 Falling back to Actions endpoint...');
      try {
        return await this.fetchClickDataFromActionsFallback();
      } catch (fallbackError) {
        console.error('❌ Fallback to Actions endpoint also failed:', fallbackError.message);
        throw error; // Throw original error
      }
    }
  }

  // Process ReportExport data
  async processReportExportData(data) {
    try {
      console.log('📊 Processing ReportExport data:', {
        status: data.Status,
        hasData: !!data.Data,
        hasResults: !!data.Results,
        dataLength: data.Data?.length || 0,
        resultsLength: data.Results?.length || 0,
        totalResults: data.TotalResults,
        keys: Object.keys(data)
      });
      
      // ReportExport endpoint returns different structure
      if (data.Status === 'QUEUED') {
        console.log('📋 ReportExport job queued, falling back to Actions endpoint for immediate data');
        return await this.fetchClickDataFromActionsFallback();
      }
      
      // If we get direct data (some endpoints return immediate results)
      const reportData = data.Data || data.Results || [];
      
      console.log(`✅ Fetched ${reportData.length} records from Impact.com ReportExport`);
      
      // Process click data safely
      const clickData = {
        totalClicks: reportData.length,
        totalResults: data.TotalResults || reportData.length,
        actions: reportData.map(record => ({
          id: record.Id || record.SubId1 || 'unknown',
          type: 'CLICK', // ReportExport focuses on performance data
          status: 'ACTIVE',
          timestamp: record.Date || new Date().toISOString(),
          mediaPartnerId: this.mediaPartnerId,
          campaignId: record.Program || 'unknown',
          subId1: record.SubId1, // Creator ID
          amount: parseFloat(record.ActionEarnings || record.TotalEarnings || 0),
          clicks: parseInt(record.Clicks || 0),
          actions: parseInt(record.Actions || 0)
        })),
        summary: {
          byCampaign: {},
          byCreator: {},
          byDate: {},
          byActionType: { 'CLICK': reportData.length },
          byStatus: { 'ACTIVE': reportData.length }
        }
      };

      // Safe aggregation without modifying original data
      reportData.forEach(record => {
        const campaignId = record.Program || 'unknown';
        const creatorId = record.SubId1 || 'unknown';
        const date = record.Date ? record.Date.split('T')[0] : 'unknown';
        
        // Count by campaign
        clickData.summary.byCampaign[campaignId] = (clickData.summary.byCampaign[campaignId] || 0) + 1;
        
        // Count by creator
        clickData.summary.byCreator[creatorId] = (clickData.summary.byCreator[creatorId] || 0) + 1;
        
        // Count by date
        clickData.summary.byDate[date] = (clickData.summary.byDate[date] || 0) + 1;
      });

      return clickData;
    } catch (error) {
      console.error('❌ Error processing ReportExport data:', error.message);
      throw error;
    }
  }

  // Fallback method using Actions endpoint
  async fetchClickDataFromActionsFallback() {
    try {
      console.log('🔍 Using Actions endpoint fallback...');
      
      const url = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Actions`;
      
      const params = new URLSearchParams({
        PageSize: '5000', // Get more data
        // Remove ActionType filter to get ALL actions (clicks, sales, etc.)
        // This will give us comprehensive data
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64'),
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Actions API Error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const actions = data.Actions || [];
      
      console.log(`✅ Fallback: Fetched ${actions.length} click actions from Actions endpoint`);
      
      return {
        totalClicks: actions.length,
        totalResults: data.TotalResults || actions.length,
        actions: actions.map(action => ({
          id: action.Id || action.ActionId,
          type: action.ActionType,
          status: action.ActionStatus,
          timestamp: action.ActionDate || action.CreatedDate,
          mediaPartnerId: action.MediaPartnerId,
          campaignId: action.CampaignId,
          subId1: action.SubId1,
          amount: action.Amount || 0
        })),
        summary: {
          byCampaign: {},
          byCreator: {},
          byDate: {},
          byActionType: { 'CLICK': actions.length },
          byStatus: { 'ACTIVE': actions.length }
        }
      };
    } catch (error) {
      console.error('❌ Fallback Actions endpoint failed:', error.message);
      throw error;
    }
  }
}

module.exports = { ImpactWebService };







