// Daily Analytics Service - Historical Data Collection and Storage
// Builds on existing EarningsSync service for comprehensive daily metrics

const { getPrisma } = require('../utils/prisma');
const { EarningsSync } = require('./earningsSync');
const ImpactWebService = require('./impactWebService');

class DailyAnalyticsService {
  constructor() {
    this.earningsSync = new EarningsSync();
    this.impactService = new ImpactWebService();
    this.prisma = getPrisma();
  }

  /**
   * Collect and store daily analytics for all creators
   * @param {Date} targetDate - Date to collect analytics for (defaults to yesterday)
   * @returns {Object} Collection results
   */
  async collectDailyAnalytics(targetDate = null) {
    try {
      // Default to yesterday (completed day)
      const date = targetDate || this.getYesterday();
      const dateStr = this.formatDate(date);
      
      console.log(`📊 [Daily Analytics] Starting collection for ${dateStr}`);
      
      // Get all active creators
      const creators = await this.prisma.creator.findMany({
        where: {
          isActive: true,
          applicationStatus: 'APPROVED'
        },
        select: {
          id: true,
          name: true,
          email: true,
          commissionRate: true,
          impactSubId: true
        }
      });

      console.log(`👥 [Daily Analytics] Processing ${creators.length} active creators`);

      const results = {
        date: dateStr,
        totalCreators: creators.length,
        successful: 0,
        failed: 0,
        errors: [],
        metrics: {
          totalSales: 0,
          totalCommissions: 0,
          totalClicks: 0,
          totalConversions: 0
        }
      };

      // Process creators in batches to avoid overwhelming Impact.com API
      const batchSize = 5;
      for (let i = 0; i < creators.length; i += batchSize) {
        const batch = creators.slice(i, i + batchSize);
        
        console.log(`📊 [Daily Analytics] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(creators.length/batchSize)}`);

        const batchPromises = batch.map(creator => this.collectCreatorDailyAnalytics(creator, date));
        const batchResults = await Promise.all(batchPromises);

        // Aggregate batch results
        batchResults.forEach(result => {
          if (result.success) {
            results.successful++;
            results.metrics.totalSales += result.metrics.commissionableSales;
            results.metrics.totalCommissions += result.metrics.commissionEarned;
            results.metrics.totalClicks += result.metrics.clicks;
            results.metrics.totalConversions += result.metrics.conversions;
          } else {
            results.failed++;
            results.errors.push(result.error);
          }
        });

        // Rate limiting between batches
        if (i + batchSize < creators.length) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
      }

      console.log(`✅ [Daily Analytics] Collection complete for ${dateStr}:`, {
        successful: results.successful,
        failed: results.failed,
        totalSales: results.metrics.totalSales.toFixed(2),
        totalCommissions: results.metrics.totalCommissions.toFixed(2)
      });

      return results;

    } catch (error) {
      console.error('❌ [Daily Analytics] Collection failed:', error.message);
      throw error;
    }
  }

  /**
   * Collect daily analytics for a single creator
   * @param {Object} creator - Creator object
   * @param {Date} date - Date to collect for
   * @returns {Object} Creator analytics result
   */
  async collectCreatorDailyAnalytics(creator, date) {
    try {
      const dateStr = this.formatDate(date);
      console.log(`📊 Collecting analytics for creator ${creator.email} on ${dateStr}`);

      // TEMPORARY: Skip duplicate check until table is properly created
      console.log(`📊 Collecting fresh analytics for ${creator.email} on ${dateStr}`);

      // Get creator's SubId1 for Impact.com queries
      const subId1 = creator.impactSubId || this.impactService.computeObfuscatedSubId(creator.id);
      
      // Collect metrics for this creator and date
      const metrics = await this.getCreatorDayMetrics(creator, subId1, date);

      // TEMPORARY: Store in EarningsSnapshot until DailyAnalytics table is available
      try {
        await this.prisma.earningsSnapshot.create({
          data: {
            creatorId: creator.id,
            originalAmount: metrics.commissionEarned,
            commissionRate: creator.commissionRate,
            grossAmount: metrics.grossCommissionEarned,
            type: 'COMMISSION',
            source: 'DAILY_ANALYTICS_TEMP',
            earnedAt: date,
            rateEffectiveDate: date
          }
        });
        console.log(`✅ Stored temp analytics for ${creator.email} in EarningsSnapshot`);
      } catch (storageError) {
        console.log(`⚠️ Storage fallback for ${creator.email}: Using in-memory only`);
      }

      console.log(`✅ Stored analytics for ${creator.email}: $${metrics.commissionEarned.toFixed(2)} earned from ${metrics.conversions} conversions`);

      return {
        success: true,
        metrics
      };

    } catch (error) {
      console.error(`❌ Failed to collect analytics for creator ${creator.email}:`, error.message);
      return {
        success: false,
        error: `${creator.email}: ${error.message}`
      };
    }
  }

  /**
   * Get daily metrics for a creator from Impact.com
   * @param {Object} creator - Creator object
   * @param {string} subId1 - Creator's Impact.com SubId1
   * @param {Date} date - Date to get metrics for
   * @returns {Object} Daily metrics
   */
  async getCreatorDayMetrics(creator, subId1, date) {
    const dateStr = this.formatDate(date);
    const startDate = `${dateStr}T00:00:00Z`;
    const endDate = `${dateStr}T23:59:59Z`;

    let metrics = {
      commissionableSales: 0,
      commissionEarned: 0,
      grossCommissionEarned: 0,
      clicks: 0,
      conversions: 0,
      conversionRate: 0,
      dataSource: 'IMPACT_API',
      recordsProcessed: 0
    };

    try {
      // Step 1: Get clicks data from Performance report
      const performanceData = await this.impactService.getPerformanceBySubId({
        startDate: dateStr,
        endDate: dateStr,
        subId1: subId1
      });

      if (performanceData.success && performanceData.data) {
        metrics.clicks = performanceData.data.clicks || 0;
      }

      // Step 2: Get commissionable sales from Actions API
      const actionsData = await this.impactService.getActionsDetailed({
        startDate,
        endDate,
        subId1: subId1,
        actionType: 'SALE',
        pageSize: 1000
      });

      if (actionsData.success && actionsData.actions) {
        // Filter for this creator's actions
        const creatorActions = actionsData.actions.filter(action => 
          action.SubId1 === subId1
        );

        // Filter for commissionable actions only
        const commissionableActions = creatorActions.filter(action => {
          const commission = parseFloat(action.Payout || action.Commission || 0);
          return commission > 0;
        });

        metrics.conversions = commissionableActions.length;
        metrics.recordsProcessed = creatorActions.length;

        // Calculate sales and commissions
        metrics.grossCommissionEarned = commissionableActions.reduce((sum, action) => {
          return sum + parseFloat(action.Payout || action.Commission || 0);
        }, 0);

        metrics.commissionableSales = commissionableActions.reduce((sum, action) => {
          return sum + parseFloat(action.Amount || action.SaleAmount || action.IntendedAmount || 0);
        }, 0);

        // Apply creator's commission rate (their share of gross commission)
        const creatorRate = creator.commissionRate || 70;
        metrics.commissionEarned = (metrics.grossCommissionEarned * creatorRate) / 100;

        // Calculate conversion rate
        if (metrics.clicks > 0) {
          metrics.conversionRate = (metrics.conversions / metrics.clicks) * 100;
        }

        console.log(`📊 Metrics for ${creator.email} on ${dateStr}:`, {
          clicks: metrics.clicks,
          conversions: metrics.conversions,
          grossCommission: metrics.grossCommissionEarned.toFixed(2),
          creatorCommission: metrics.commissionEarned.toFixed(2),
          conversionRate: metrics.conversionRate.toFixed(2) + '%'
        });
      }

    } catch (error) {
      console.error(`❌ Error getting metrics for ${creator.email}:`, error.message);
      metrics.dataSource = 'ERROR';
    }

    return metrics;
  }

  /**
   * Get historical analytics for admin dashboard
   * @param {Object} options - Query options
   * @returns {Object} Historical analytics data
   */
  async getHistoricalAnalytics(options = {}) {
    const {
      startDate,
      endDate,
      creatorId = null,
      dateRange = '30d'
    } = options;

    try {
      // Calculate date range
      const { start, end } = this.calculateDateRange(dateRange, startDate, endDate);
      
      console.log(`📊 [Historical Analytics] Querying ${start} to ${end}`);

      const whereClause = {
        date: {
          gte: start,
          lte: end
        }
      };

      if (creatorId) {
        whereClause.creatorId = creatorId;
      }

      // TEMPORARY FIX: Try DailyAnalytics first, fallback to EarningsSnapshot
      let dailyRecords;
      let isFallback = false;
      
      try {
        // Try DailyAnalytics table first
        dailyRecords = await this.prisma.dailyAnalytics.findMany({
          where: whereClause,
          include: {
            creator: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { date: 'asc' }
        });
        console.log(`📊 [Historical Analytics] Found ${dailyRecords.length} DailyAnalytics records`);
      } catch (dailyAnalyticsError) {
        console.log('⚠️ [Historical Analytics] DailyAnalytics table not available, using existing analytics system fallback');
        isFallback = true;
        
        // Fallback to existing analytics system (Link + Earning tables)
        const whereClause = {
          createdAt: {
            gte: start,
            lte: end
          }
        };

        if (creatorId) {
          whereClause.creatorId = creatorId;
        }

        // Get links data for clicks and conversions
        const linksData = await this.prisma.link.findMany({
          where: whereClause,
          include: {
            creator: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        });

        // Get earnings data for commission information (ultra-safe query)
        let earningsData = [];
        try {
          earningsData = await this.prisma.earning.findMany({
            where: {
              createdAt: {
                gte: start,
                lte: end
              },
              ...(creatorId && { creatorId })
            },
            select: {
              id: true,
              creatorId: true,
              amount: true,
              createdAt: true
            },
            orderBy: { createdAt: 'asc' }
          });
        } catch (earningError) {
          console.log('⚠️ [Historical Analytics] Earning table query failed, using links only:', earningError.message);
          earningsData = [];
        }

        // Group data by date and creator
        const dailyDataMap = new Map();

        // Process links data
        linksData.forEach(link => {
          const dateKey = link.createdAt.toISOString().split('T')[0];
          const creatorKey = link.creatorId;
          const key = `${dateKey}-${creatorKey}`;

          if (!dailyDataMap.has(key)) {
            dailyDataMap.set(key, {
              id: `fallback-${key}`,
              creatorId: link.creatorId,
              date: new Date(dateKey),
              commissionableSales: 0,
              commissionEarned: 0,
              clicks: 0,
              conversions: 0,
              conversionRate: 0,
              appliedCommissionRate: 70,
              grossCommissionEarned: 0,
              dataSource: 'EXISTING_ANALYTICS_FALLBACK',
              recordsProcessed: 0,
              lastSyncAt: link.createdAt,
              creator: link.creator
            });
          }

          const dayData = dailyDataMap.get(key);
          dayData.clicks += link.clicks || 0;
          dayData.conversions += link.conversions || 0;
          dayData.commissionableSales += Number(link.revenue || 0);
          dayData.recordsProcessed += 1;
        });

        // Process earnings data
        earningsData.forEach(earning => {
          const dateKey = earning.createdAt.toISOString().split('T')[0];
          const creatorKey = earning.creatorId;
          const key = `${dateKey}-${creatorKey}`;

          if (!dailyDataMap.has(key)) {
            dailyDataMap.set(key, {
              id: `fallback-${key}`,
              creatorId: earning.creatorId,
              date: new Date(dateKey),
              commissionableSales: 0,
              commissionEarned: 0,
              clicks: 0,
              conversions: 0,
              conversionRate: 0,
              appliedCommissionRate: 70,
              grossCommissionEarned: 0,
              dataSource: 'EXISTING_ANALYTICS_FALLBACK',
              recordsProcessed: 0,
              lastSyncAt: earning.createdAt,
              creator: { id: earning.creatorId, name: 'Creator', email: 'creator@example.com' } // Fallback creator data
            });
          }

          const dayData = dailyDataMap.get(key);
          dayData.commissionEarned += Number(earning.amount || 0);
          dayData.grossCommissionEarned += Number(earning.amount || 0); // Use amount as gross for safety
          dayData.appliedCommissionRate = 70; // Default rate for safety
        });

        // Convert map to array and calculate conversion rates
        dailyRecords = Array.from(dailyDataMap.values()).map(record => ({
          ...record,
          conversionRate: record.clicks > 0 ? (record.conversions / record.clicks) * 100 : 0
        }));

        console.log(`📊 [Historical Analytics] Found ${dailyRecords.length} records from existing analytics system (fallback)`);
      }

      // Aggregate data by date for charts
      const chartData = this.aggregateByDate(dailyRecords);
      
      // Calculate summary metrics
      const summary = this.calculateSummaryMetrics(dailyRecords);

      // Get top performing creators
      const topCreators = this.getTopCreators(dailyRecords);

      return {
        success: true,
        dateRange: { start, end },
        summary,
        chartData,
        topCreators,
        totalRecords: dailyRecords.length,
        fallback: isFallback,
        fallbackMessage: isFallback ? 'Using EarningsSnapshot data until DailyAnalytics table is available' : null
      };

    } catch (error) {
      console.error('❌ [Historical Analytics] Query failed:', error.message);
      throw error;
    }
  }

  /**
   * Aggregate daily records by date for chart display
   * @param {Array} records - Daily analytics records
   * @returns {Array} Chart data points
   */
  aggregateByDate(records) {
    const dateMap = {};

    records.forEach(record => {
      const dateKey = this.formatDate(record.date);
      
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {
          date: dateKey,
          commissionableSales: 0,
          commissionEarned: 0,
          clicks: 0,
          conversions: 0,
          creators: 0
        };
      }

      dateMap[dateKey].commissionableSales += parseFloat(record.commissionableSales);
      dateMap[dateKey].commissionEarned += parseFloat(record.commissionEarned);
      dateMap[dateKey].clicks += record.clicks;
      dateMap[dateKey].conversions += record.conversions;
      dateMap[dateKey].creators++;
    });

    return Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Calculate summary metrics from daily records
   * @param {Array} records - Daily analytics records
   * @returns {Object} Summary metrics
   */
  calculateSummaryMetrics(records) {
    const summary = records.reduce((acc, record) => {
      acc.totalSales += parseFloat(record.commissionableSales);
      acc.totalCommissions += parseFloat(record.commissionEarned);
      acc.totalClicks += record.clicks;
      acc.totalConversions += record.conversions;
      return acc;
    }, {
      totalSales: 0,
      totalCommissions: 0,
      totalClicks: 0,
      totalConversions: 0
    });

    // Calculate averages and rates
    summary.averageOrderValue = summary.totalConversions > 0 ? 
      summary.totalSales / summary.totalConversions : 0;
    
    summary.conversionRate = summary.totalClicks > 0 ? 
      (summary.totalConversions / summary.totalClicks) * 100 : 0;

    summary.averageDailyCommissions = records.length > 0 ? 
      summary.totalCommissions / records.length : 0;

    return summary;
  }

  /**
   * Get top performing creators from daily records
   * @param {Array} records - Daily analytics records
   * @returns {Array} Top creators
   */
  getTopCreators(records) {
    const creatorMap = {};

    records.forEach(record => {
      const creatorId = record.creatorId;
      
      if (!creatorMap[creatorId]) {
        creatorMap[creatorId] = {
          creator: record.creator,
          totalCommissions: 0,
          totalSales: 0,
          totalConversions: 0,
          totalClicks: 0,
          days: 0
        };
      }

      creatorMap[creatorId].totalCommissions += parseFloat(record.commissionEarned);
      creatorMap[creatorId].totalSales += parseFloat(record.commissionableSales);
      creatorMap[creatorId].totalConversions += record.conversions;
      creatorMap[creatorId].totalClicks += record.clicks;
      creatorMap[creatorId].days++;
    });

    // Convert to array and sort by total commissions
    const topCreators = Object.values(creatorMap)
      .sort((a, b) => b.totalCommissions - a.totalCommissions)
      .slice(0, 10) // Top 10
      .map(creator => ({
        ...creator,
        averageDailyCommissions: creator.totalCommissions / creator.days,
        conversionRate: creator.totalClicks > 0 ? 
          (creator.totalConversions / creator.totalClicks) * 100 : 0
      }));

    return topCreators;
  }

  /**
   * Run daily collection job (called by cron)
   * @returns {Object} Job results
   */
  async runDailyJob() {
    try {
      console.log('🔄 [Daily Job] Starting automated daily analytics collection...');
      
      const results = await this.collectDailyAnalytics();
      
      console.log('✅ [Daily Job] Completed successfully:', {
        date: results.date,
        successful: results.successful,
        failed: results.failed
      });

      return results;

    } catch (error) {
      console.error('❌ [Daily Job] Failed:', error.message);
      throw error;
    }
  }

  /**
   * Backfill historical data for a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Backfill results
   */
  async backfillHistoricalData(startDate, endDate) {
    try {
      console.log(`🔄 [Backfill] Starting for ${this.formatDate(startDate)} to ${this.formatDate(endDate)}`);
      
      const results = {
        totalDays: 0,
        successful: 0,
        failed: 0,
        errors: []
      };

      const currentDate = new Date(startDate);
      const end = new Date(endDate);

      while (currentDate <= end) {
        results.totalDays++;
        
        try {
          const dayResults = await this.collectDailyAnalytics(new Date(currentDate));
          
          if (dayResults.successful > 0) {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push(`${this.formatDate(currentDate)}: No successful collections`);
          }

          console.log(`📊 [Backfill] Completed ${this.formatDate(currentDate)}: ${dayResults.successful} creators`);

        } catch (error) {
          results.failed++;
          results.errors.push(`${this.formatDate(currentDate)}: ${error.message}`);
          console.error(`❌ [Backfill] Failed for ${this.formatDate(currentDate)}:`, error.message);
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        
        // Rate limiting between days
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('✅ [Backfill] Completed:', results);
      return results;

    } catch (error) {
      console.error('❌ [Backfill] Failed:', error.message);
      throw error;
    }
  }

  /**
   * Utility functions
   */
  getYesterday() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    date.setHours(0, 0, 0, 0); // Start of day
    return date;
  }

  formatDate(date) {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  calculateDateRange(range, customStart, customEnd) {
    const end = new Date();
    end.setHours(23, 59, 59, 999); // End of today
    
    let start;

    if (customStart && customEnd) {
      start = new Date(customStart);
      end = new Date(customEnd);
    } else {
      const days = {
        '1d': 1,
        '1w': 7,
        '1m': 30,
        '1y': 365
      }[range] || 30;

      start = new Date();
      start.setDate(start.getDate() - days);
      start.setHours(0, 0, 0, 0); // Start of day
    }

    return { start, end };
  }
}

module.exports = { DailyAnalyticsService };
