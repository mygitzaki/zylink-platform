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
            const trackingUrl = data.TrackingURL || data.TrackingUrl || data.trackingUrl;
            
            // Check if the tracking URL contains template variables (broken)
            if (trackingUrl && (trackingUrl.includes('{clickid}') || trackingUrl.includes('{irpid}') || trackingUrl.includes('{iradid}') || trackingUrl.includes('{ircid}'))) {
              console.log('⚠️ Impact.com returned template URL with variables, using fallback');
              return {
                success: false,
                trackingUrl: this.generateWorkingLinkFormat(null, creatorId, destinationUrl),
                originalUrl: destinationUrl,
                fallback: true,
                error: 'Impact.com returned template URL instead of actual tracking URL'
              };
            }
            
            return {
              success: true,
              trackingUrl: trackingUrl,
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
            const trackingUrl = data.TrackingURL || data.TrackingUrl || data.trackingUrl;
            
            // Check if the tracking URL contains template variables (broken)
            if (trackingUrl && (trackingUrl.includes('{clickid}') || trackingUrl.includes('{irpid}') || trackingUrl.includes('{iradid}') || trackingUrl.includes('{ircid}'))) {
              console.log('⚠️ Impact.com returned template URL with variables, using fallback');
              return {
                success: false,
                trackingUrl: this.generateWorkingLinkFormat(null, creatorId, destinationUrl),
                originalUrl: destinationUrl,
                fallback: true,
                error: 'Impact.com returned template URL instead of actual tracking URL'
              };
            }
            
            return {
              success: true,
              trackingUrl: trackingUrl,
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
    // Generate unique tracking identifiers
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const clickId = `imp_${timestamp}_${randomId}`;
    
    // Use direct Walmart affiliate format as fallback
    const params = new URLSearchParams({
      irgwc: '1',
      veh: 'aff',
      wmlspartner_creator: `imp_${this.mediaPartnerId}`,
      affiliates_ad_id_creator: this.mediaPartnerId,
      campaign_id_creator: this.programId,
      clickid: clickId,
      sourceid: clickId,
      subId1: subId || 'default'
    });
    
    // Append the destination URL as a parameter
    const finalUrl = `${destinationUrl}${destinationUrl.includes('?') ? '&' : '?'}${params.toString()}`;
    
    console.log('🔧 Fallback link generated:', {
      original: destinationUrl,
      final: finalUrl,
      clickId,
      params: Object.fromEntries(params)
    });
    
    return finalUrl;
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
      
      // Use Actions endpoint directly - it works perfectly without date filters
      // and gives us comprehensive data immediately
      const url = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Actions`;
      
      const params = new URLSearchParams({
        PageSize: '5000' // Get comprehensive data
      });

      console.log('🔍 Using Actions endpoint (no date filters needed):', {
        url: `${url}?${params}`,
        params: Object.fromEntries(params)
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64'),
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Actions API error response:', errorText);
        throw new Error(`Actions API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const actions = data.Actions || [];
      
      console.log(`✅ Successfully fetched ${actions.length} actions from Impact.com Actions endpoint`);
      
      // Process the comprehensive data
      const clickData = {
        totalClicks: actions.length,
        totalResults: data['@total'] || actions.length,
        actions: actions.map(action => ({
          id: action.Id,
          type: action.ActionTrackerName || 'ACTION',
          status: action.State,
          timestamp: action.ReferringDate || action.EventDate,
          mediaPartnerId: this.mediaPartnerId,
          campaignId: action.CampaignId,
          campaignName: action.CampaignName,
          subId1: action.SubId1,
          amount: parseFloat(action.Amount || 0),
          payout: parseFloat(action.Payout || 0),
          customerLocation: `${action.CustomerCity}, ${action.CustomerRegion}`,
          referringDomain: action.ReferringDomain
        })),
        summary: {
          byCampaign: {},
          byCreator: {},
          byDate: {},
          byActionType: {},
          byStatus: {}
        }
      };

      // Safe aggregation
      actions.forEach(action => {
        const campaignId = action.CampaignId || 'unknown';
        const creatorId = action.SubId1 || 'unknown';
        const date = action.ReferringDate ? action.ReferringDate.split('T')[0] : 'unknown';
        const actionType = action.ActionTrackerName || 'unknown';
        const status = action.State || 'unknown';
        
        // Count by campaign
        clickData.summary.byCampaign[campaignId] = (clickData.summary.byCampaign[campaignId] || 0) + 1;
        
        // Count by creator
        clickData.summary.byCreator[creatorId] = (clickData.summary.byCreator[creatorId] || 0) + 1;
        
        // Count by date
        clickData.summary.byDate[date] = (clickData.summary.byDate[date] || 0) + 1;
        
        // Count by action type
        clickData.summary.byActionType[actionType] = (clickData.summary.byActionType[actionType] || 0) + 1;
        
        // Count by status
        clickData.summary.byStatus[status] = (clickData.summary.byStatus[status] || 0) + 1;
      });

      return clickData;
    } catch (error) {
      console.error('❌ Error fetching Impact.com click data:', error.message);
      throw error;
    }
  }

  // These methods are no longer needed since we're using Actions endpoint directly
}

module.exports = { ImpactWebService };







