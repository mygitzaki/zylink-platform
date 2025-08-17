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
}

module.exports = { ImpactWebService };







