// Impact.com Earnings Sync Service
// Fetches real earnings data from Impact.com API and syncs with local database

const { getPrisma } = require('../utils/prisma');

class EarningsSync {
  constructor() {
    // CRITICAL: Remove hardcoded credentials - use environment variables only
    this.accountSid = process.env.IMPACT_ACCOUNT_SID;
    this.authToken = process.env.IMPACT_AUTH_TOKEN;
    this.apiBaseUrl = process.env.IMPACT_API_BASE_URL || 'https://api.impact.com';
    
    // Validate required credentials
    this.validateCredentials();
  }

  // NEW: Validate credentials on initialization
  validateCredentials() {
    if (!this.accountSid || !this.authToken) {
      console.error('🚨 CRITICAL: Missing required Impact.com environment variables!');
      console.error('Required: IMPACT_ACCOUNT_SID, IMPACT_AUTH_TOKEN');
      console.error('Service will fail gracefully but Impact.com features will be disabled.');
    }
  }

  // NEW: Check if service is properly configured
  isConfigured() {
    return !!(this.accountSid && this.authToken);
  }

  // Get earnings data from Impact.com API
  async fetchEarningsFromImpact(options = {}) {
    const {
      startDate = this.getDefaultStartDate(),
      endDate = new Date(),
      page = 1,
      pageSize = this.config.batchSize
    } = options;

    try {
      // Format dates for Impact.com API (they expect MM/DD/YYYY format)
      const formatImpactDate = (date) => {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      };

      const formattedStartDate = formatImpactDate(startDate);
      const formattedEndDate = formatImpactDate(endDate);
      
      console.log(`📈 Fetching ALL earnings from Impact.com (no date filters)`);
      
      // Impact.com Actions endpoint - contains earnings/commission data
      const url = `${this.apiBaseUrl}/Mediapartners/${this.accountSid}/Actions`;
      // Start with no date filters to get all data first
      const params = new URLSearchParams({
        PageSize: pageSize.toString(),
        Page: page.toString(),
        ActionStatus: 'APPROVED', // Only get approved commissions
        ActionType: 'SALE' // Focus on sales commissions
      });
      
      // TODO: Add date filtering back once we determine the correct format
      // StartDate: formattedStartDate,
      // EndDate: formattedEndDate,

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Impact API Error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      console.log(`✅ Fetched ${data.Actions?.length || 0} earnings records from Impact.com`);
      
      return {
        earnings: data.Actions || [],
        totalPages: Math.ceil((data.TotalResults || 0) / pageSize),
        currentPage: page,
        totalResults: data.TotalResults || 0
      };

    } catch (error) {
      console.error('❌ Error fetching earnings from Impact.com:', error.message);
      throw error;
    }
  }

  // Transform Impact.com earnings data to our database format
  transformEarningsData(impactEarnings, creatorMap = {}) {
    if (!Array.isArray(impactEarnings)) {
      return [];
    }

    return impactEarnings.map(earning => {
      // Extract key information from Impact.com response
      const transactionId = earning.Id || earning.TransactionId || earning.ActionId;
      const amount = parseFloat(earning.Amount || earning.Commission || earning.Payout || 0);
      const date = earning.EventDate || earning.CreatedDate || earning.LockingDate;
      const merchantName = earning.CampaignName || earning.AdvertiserName || 'Unknown';
      const customerInfo = earning.CustomerInfo || {};
      
      // Try to match to creator based on tracking parameters
      const creatorId = this.extractCreatorFromTracking(earning, creatorMap);
      
      return {
        impactTransactionId: transactionId,
        amount: amount,
        type: this.determineEarningType(earning),
        status: this.mapImpactStatus(earning.Status),
        merchantName: merchantName,
        originalData: earning, // Store full Impact.com data for reference
        createdAt: date ? new Date(date) : new Date(),
        creatorId: creatorId
      };
    }).filter(earning => earning.amount > 0 && earning.creatorId); // Only valid earnings with creators
  }

  // Extract creator ID from Impact.com tracking data
  extractCreatorFromTracking(earning, creatorMap) {
    // Try different methods to identify the creator
    const trackingData = earning.TrackingValue || earning.SubId || earning.ClickId || '';
    const customerInfo = earning.CustomerInfo || {};
    
    // Method 1: Direct creator ID in tracking
    if (creatorMap[trackingData]) {
      return creatorMap[trackingData];
    }
    
    // Method 2: Extract from SubId patterns (e.g., "creator_123", "user_456")
    const creatorMatch = trackingData.match(/creator[_-](\w+)|user[_-](\w+)/i);
    if (creatorMatch) {
      const extractedId = creatorMatch[1] || creatorMatch[2];
      if (creatorMap[extractedId]) {
        return creatorMap[extractedId];
      }
    }
    
    // Method 3: Use customer email to find creator
    if (customerInfo.email && creatorMap[customerInfo.email]) {
      return creatorMap[customerInfo.email];
    }
    
    // Default: Return null if no creator can be identified
    return null;
  }

  // Determine earning type based on Impact.com data
  determineEarningType(earning) {
    const actionType = (earning.ActionType || '').toUpperCase();
    const eventType = (earning.EventType || '').toUpperCase();
    // Only return valid enum values for our schema
    if (actionType.includes('SALE') || eventType.includes('SALE')) {
      return 'COMMISSION';
    }
    // Map unsupported types into COMMISSION to avoid schema errors
    return 'COMMISSION';
  }

  // Map Impact.com status to our payment status
  mapImpactStatus(impactStatus) {
    const status = (impactStatus || '').toUpperCase();
    
    switch (status) {
      case 'APPROVED':
      case 'CONFIRMED':
        return 'COMPLETED';
      case 'PENDING':
      case 'LOCKED':
        return 'PENDING';
      case 'REJECTED':
      case 'REVERSED':
        return 'CANCELLED';
      default:
        return 'PENDING';
    }
  }

  // Build creator mapping for efficient lookups
  async buildCreatorMap() {
    const prisma = getPrisma();
    const creators = await prisma.creator.findMany({
      select: {
        id: true,
        email: true,
        referralCode: true
      }
    });

    const map = {};
    creators.forEach(creator => {
      // Map by email
      map[creator.email] = creator.id;
      // Map by referral code
      if (creator.referralCode) {
        map[creator.referralCode] = creator.id;
      }
      // Map by ID (for direct tracking)
      map[creator.id] = creator.id;
    });

    return map;
  }

  // Sync earnings to database (main sync function)
  async syncEarningsToDatabase(options = {}) {
    const startTime = Date.now();
    console.log('🔄 Starting earnings sync from Impact.com...');
    
    try {
      const prisma = getPrisma();
      
      // Build creator mapping
      const creatorMap = await this.buildCreatorMap();
      console.log(`📋 Built creator mapping for ${Object.keys(creatorMap).length} entries`);
      
      // Track sync statistics
      const stats = {
        fetched: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 0
      };
      
      let page = 1;
      let hasMorePages = true;
      
      while (hasMorePages) {
        try {
          // Fetch earnings from Impact.com
          const earningsData = await this.fetchEarningsFromImpact({
            ...options,
            page
          });
          
          stats.fetched += earningsData.earnings.length;
          
          if (earningsData.earnings.length === 0) {
            hasMorePages = false;
            break;
          }
          
          // Transform earnings data
          const transformedEarnings = this.transformEarningsData(earningsData.earnings, creatorMap);
          console.log(`🔄 Processing ${transformedEarnings.length} valid earnings (page ${page})`);
          
          // Process each earning
          for (const earning of transformedEarnings) {
            try {
              await this.upsertEarning(earning, prisma);
              stats.created++;
            } catch (error) {
              console.error(`❌ Error processing earning ${earning.impactTransactionId}:`, error.message);
              stats.errors++;
            }
          }
          
          // Check if we have more pages
          hasMorePages = page < earningsData.totalPages;
          page++;
          
          // Add delay between pages to avoid rate limiting
          if (hasMorePages) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (error) {
          console.error(`❌ Error on page ${page}:`, error.message);
          stats.errors++;
          break;
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Earnings sync completed in ${duration}ms`);
      console.log(`📊 Stats: ${stats.fetched} fetched, ${stats.created} created, ${stats.errors} errors`);
      
      return {
        success: true,
        stats,
        duration
      };
      
    } catch (error) {
      console.error('❌ Earnings sync failed:', error.message);
      throw error;
    }
  }

  // Upsert single earning to database
  async upsertEarning(earning, prisma) {
    // Check if earning already exists
    const existing = await prisma.earning.findFirst({
      where: {
        impactTransactionId: earning.impactTransactionId
      }
    });

    if (existing) {
      // Update existing earning
      return await prisma.earning.update({
        where: { id: existing.id },
        data: {
          amount: earning.amount,
          status: earning.status,
          type: earning.type
        }
      });
    } else {
      // Create new earning
      return await prisma.earning.create({
        data: {
          creatorId: earning.creatorId,
          amount: earning.amount,
          type: earning.type,
          status: earning.status,
          impactTransactionId: earning.impactTransactionId,
          createdAt: earning.createdAt
        }
      });
    }
  }

  // Get default start date (30 days ago)
  getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - this.config.syncWindowDays);
    return date;
  }

  // Calculate total earnings for a creator
  async getCreatorEarnings(creatorId, options = {}) {
    const prisma = getPrisma();
    const {
      startDate,
      endDate,
      status = 'COMPLETED'
    } = options;

    const whereClause = {
      creatorId,
      status
    };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const earnings = await prisma.earning.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    const totalAmount = earnings.reduce((sum, earning) => sum + parseFloat(earning.amount), 0);

    return {
      earnings,
      totalAmount,
      count: earnings.length
    };
  }

  // Get earnings summary for all creators
  async getEarningsSummary(options = {}) {
    const prisma = getPrisma();
    const {
      startDate,
      endDate,
      limit = 50
    } = options;

    const whereClause = {};
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    // Get earnings by creator
    const earnings = await prisma.earning.groupBy({
      by: ['creatorId', 'status'],
      where: whereClause,
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    // Get creator details
    const creatorIds = [...new Set(earnings.map(e => e.creatorId))];
    const creators = await prisma.creator.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, email: true, name: true }
    });

    const creatorMap = {};
    creators.forEach(creator => {
      creatorMap[creator.id] = creator;
    });

    // Combine data
    const summary = earnings.map(earning => ({
      creator: creatorMap[earning.creatorId],
      status: earning.status,
      totalAmount: parseFloat(earning._sum.amount || 0),
      count: earning._count.id
    }));

    return summary;
  }

  // Test API connectivity
  async testConnection() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/Mediapartners/${this.accountSid}`, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API Test Failed: ${response.status}`);
      }

      const data = await response.json();
      return {
        connected: true,
        accountInfo: data,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = { EarningsSync };
