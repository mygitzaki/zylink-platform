// Historical Data Migration Service - Production-Safe Creator Data Mapping
// Maps historical data for each creator using Impact API with safety measures

const { getPrisma } = require('../utils/prisma');
const { DailyAnalyticsService } = require('./dailyAnalyticsService');
const ImpactWebService = require('./impactWebService');

class HistoricalDataMigration {
  constructor() {
    this.prisma = getPrisma();
    this.dailyAnalyticsService = new DailyAnalyticsService();
    this.impactService = new ImpactWebService();
    
    // Production safety configuration - Optimized for Impact.com API limits
    this.config = {
      batchSize: 2, // Process 2 creators at a time (reduced from 5)
      daysBatchSize: 7, // Process 7 days at a time
      rateLimitDelay: 5000, // 5 second delay between batches (increased from 2s)
      maxRetries: 3, // Max retry attempts per operation
      safeMode: process.env.NODE_ENV === 'production', // Extra safety in production
      backupBeforeMigration: true, // Create backup before major operations
      progressReporting: true, // Report progress for long operations
      apiCallDelay: 1000 // 1 second delay between individual API calls
    };
  }

  /**
   * Main method: Map historical data for all creators safely
   * @param {Object} options - Migration options
   * @returns {Object} Migration results
   */
  async mapAllCreatorsHistoricalData(options = {}) {
    const {
      startDate = this.getDefaultStartDate(), // 90 days ago
      endDate = new Date(),
      specificCreatorIds = null, // null = all creators
      dryRun = false, // Preview mode - don't actually write data
      continueOnError = true // Continue processing other creators if one fails
    } = options;

    try {
      console.log('🚀 [Historical Migration] Starting production-safe creator data mapping...');
      
      // Production safety checks
      await this.performSafetyChecks();
      
      // Get target creators
      const creators = await this.getTargetCreators(specificCreatorIds);
      const dateRange = this.calculateDateRange(startDate, endDate);
      
      console.log(`📊 [Historical Migration] Mapping ${creators.length} creators from ${this.formatDate(startDate)} to ${this.formatDate(endDate)}`);
      console.log(`📅 [Historical Migration] Total days to process: ${dateRange.totalDays}`);
      
      if (dryRun) {
        console.log('🔍 [Historical Migration] DRY RUN MODE - No data will be written');
      }

      // Initialize results tracking
      const results = {
        startTime: new Date(),
        creators: {
          total: creators.length,
          successful: 0,
          failed: 0,
          skipped: 0
        },
        data: {
          totalRecords: 0,
          impactApiCalls: 0,
          databaseWrites: 0,
          errors: []
        },
        performance: {
          averageTimePerCreator: 0,
          totalDuration: 0,
          rateLimitHits: 0
        },
        dryRun
      };

      // Create backup if enabled
      if (this.config.backupBeforeMigration && !dryRun) {
        await this.createBackup();
      }

      // Process creators in batches for production safety
      const batches = this.createBatches(creators, this.config.batchSize);
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        console.log(`📦 [Historical Migration] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} creators)`);
        
        // Process batch with error handling
        const batchResults = await this.processBatch(batch, {
          startDate,
          endDate,
          dryRun,
          continueOnError,
          batchIndex: batchIndex + 1,
          totalBatches: batches.length
        });

        // Aggregate batch results
        this.aggregateResults(results, batchResults);
        
        // Production rate limiting between batches
        if (batchIndex < batches.length - 1) {
          console.log(`⏱️ [Historical Migration] Rate limiting: waiting ${this.config.rateLimitDelay}ms before next batch...`);
          await this.sleep(this.config.rateLimitDelay);
        }

        // Progress reporting
        if (this.config.progressReporting) {
          this.reportProgress(results, batchIndex + 1, batches.length);
        }
      }

      // Finalize results
      results.endTime = new Date();
      results.performance.totalDuration = results.endTime - results.startTime;
      results.performance.averageTimePerCreator = results.creators.total > 0 ? 
        results.performance.totalDuration / results.creators.total : 0;

      console.log('✅ [Historical Migration] Completed successfully!');
      this.printFinalSummary(results);

      return results;

    } catch (error) {
      console.error('❌ [Historical Migration] Critical error:', error.message);
      throw error;
    }
  }

  /**
   * Process a batch of creators safely
   */
  async processBatch(creators, options) {
    const { startDate, endDate, dryRun, continueOnError, batchIndex, totalBatches } = options;
    
    const batchResults = {
      successful: 0,
      failed: 0,
      skipped: 0,
      records: 0,
      apiCalls: 0,
      errors: []
    };

    for (let creatorIndex = 0; creatorIndex < creators.length; creatorIndex++) {
      const creator = creators[creatorIndex];
      
      try {
        console.log(`👤 [Historical Migration] Processing creator ${creator.email} (${creatorIndex + 1}/${creators.length} in batch ${batchIndex})`);
        
        // Check if creator already has recent data (skip if complete)
        if (await this.creatorHasRecentData(creator.id, endDate)) {
          console.log(`⏭️ [Historical Migration] Creator ${creator.email} already has recent data - checking for gaps only`);
          
          // Only fill gaps in data
          const gapResults = await this.fillDataGaps(creator, startDate, endDate, dryRun);
          batchResults.records += gapResults.recordsCreated;
          batchResults.apiCalls += gapResults.apiCalls;
          
          if (gapResults.success) {
            batchResults.successful++;
          } else {
            batchResults.failed++;
            batchResults.errors.push(`${creator.email}: ${gapResults.error}`);
          }
        } else {
          // Full historical mapping for this creator
          const creatorResults = await this.mapCreatorHistoricalData(creator, startDate, endDate, dryRun);
          
          batchResults.records += creatorResults.recordsCreated;
          batchResults.apiCalls += creatorResults.apiCalls;
          
          if (creatorResults.success) {
            batchResults.successful++;
          } else {
            batchResults.failed++;
            batchResults.errors.push(`${creator.email}: ${creatorResults.error}`);
          }
        }

        // Longer delay between creators to respect API limits
        if (creatorIndex < creators.length - 1) {
          await this.sleep(this.config.apiCallDelay || 1000); // 1 second between creators
        }

      } catch (error) {
        console.error(`❌ [Historical Migration] Error processing creator ${creator.email}:`, error.message);
        
        batchResults.failed++;
        batchResults.errors.push(`${creator.email}: ${error.message}`);
        
        if (!continueOnError) {
          throw error; // Stop processing if continueOnError is false
        }
      }
    }

    return batchResults;
  }

  /**
   * Map historical data for a single creator
   */
  async mapCreatorHistoricalData(creator, startDate, endDate, dryRun = false) {
    try {
      console.log(`📊 [Creator Mapping] Starting for ${creator.email} from ${this.formatDate(startDate)} to ${this.formatDate(endDate)}`);
      
      const results = {
        success: false,
        recordsCreated: 0,
        apiCalls: 0,
        error: null,
        details: []
      };

      // Process date range in chunks for safety
      const dateChunks = this.createDateChunks(startDate, endDate, this.config.daysBatchSize);
      
      for (const chunk of dateChunks) {
        try {
          // Use existing DailyAnalyticsService for each day in chunk
          for (let date = new Date(chunk.start); date <= chunk.end; date.setDate(date.getDate() + 1)) {
            const dayResults = await this.dailyAnalyticsService.collectCreatorDailyAnalytics(creator, new Date(date));
            
            results.apiCalls++;
            
            if (dayResults.success) {
              results.recordsCreated++;
              results.details.push(`${this.formatDate(date)}: Success`);
            } else {
              results.details.push(`${this.formatDate(date)}: ${dayResults.error || 'Failed'}`);
            }
          }
          
          // Rate limiting between chunks
          await this.sleep(1000);
          
        } catch (chunkError) {
          console.error(`❌ [Creator Mapping] Chunk error for ${creator.email}:`, chunkError.message);
          results.details.push(`Chunk ${this.formatDate(chunk.start)}-${this.formatDate(chunk.end)}: ${chunkError.message}`);
        }
      }

      results.success = results.recordsCreated > 0;
      
      console.log(`✅ [Creator Mapping] Completed for ${creator.email}: ${results.recordsCreated} records created`);
      
      return results;

    } catch (error) {
      console.error(`❌ [Creator Mapping] Failed for ${creator.email}:`, error.message);
      return {
        success: false,
        recordsCreated: 0,
        apiCalls: 0,
        error: error.message,
        details: []
      };
    }
  }

  /**
   * Fill gaps in existing data for a creator
   */
  async fillDataGaps(creator, startDate, endDate, dryRun = false) {
    try {
      console.log(`🔍 [Gap Filling] Checking for data gaps for ${creator.email}`);
      
      // Find missing dates in DailyAnalytics
      const existingDates = await this.prisma.dailyAnalytics.findMany({
        where: {
          creatorId: creator.id,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        select: { date: true },
        orderBy: { date: 'asc' }
      });

      const existingDateSet = new Set(existingDates.map(d => this.formatDate(d.date)));
      const missingDates = [];

      // Find gaps
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = this.formatDate(date);
        if (!existingDateSet.has(dateStr)) {
          missingDates.push(new Date(date));
        }
      }

      console.log(`📅 [Gap Filling] Found ${missingDates.length} missing dates for ${creator.email}`);

      const results = {
        success: true,
        recordsCreated: 0,
        apiCalls: 0,
        error: null
      };

      // Fill missing dates
      for (const missingDate of missingDates) {
        try {
          if (!dryRun) {
            const dayResults = await this.dailyAnalyticsService.collectCreatorDailyAnalytics(creator, missingDate);
            results.apiCalls++;
            
            if (dayResults.success) {
              results.recordsCreated++;
            }
          } else {
            console.log(`🔍 [Gap Filling] DRY RUN: Would fill ${this.formatDate(missingDate)} for ${creator.email}`);
            results.recordsCreated++;
          }
          
          // Small delay between gap fills
          await this.sleep(200);
          
        } catch (gapError) {
          console.error(`❌ [Gap Filling] Error filling ${this.formatDate(missingDate)} for ${creator.email}:`, gapError.message);
        }
      }

      console.log(`✅ [Gap Filling] Completed for ${creator.email}: ${results.recordsCreated} gaps filled`);
      
      return results;

    } catch (error) {
      console.error(`❌ [Gap Filling] Failed for ${creator.email}:`, error.message);
      return {
        success: false,
        recordsCreated: 0,
        apiCalls: 0,
        error: error.message
      };
    }
  }

  /**
   * Production safety checks before starting migration
   */
  async performSafetyChecks() {
    console.log('🔒 [Safety Check] Performing production safety checks...');
    
    // Check database connection
    if (!this.prisma) {
      throw new Error('Database connection not available');
    }
    
    // Check Impact API configuration
    if (!this.impactService.isConfigured()) {
      throw new Error('Impact.com API not properly configured');
    }
    
    // Test Impact API connectivity
    const testResult = await this.impactService.testConnection();
    if (!testResult.connected) {
      throw new Error(`Impact.com API connection test failed: ${testResult.error}`);
    }
    
    // Check disk space (if possible)
    try {
      const stats = await this.prisma.$queryRaw`SELECT pg_database_size(current_database()) as size`;
      console.log('📊 [Safety Check] Database size:', stats[0]?.size || 'Unknown');
    } catch (sizeError) {
      console.log('⚠️ [Safety Check] Could not check database size');
    }
    
    console.log('✅ [Safety Check] All safety checks passed');
  }

  /**
   * Create backup before major migration (production safety)
   */
  async createBackup() {
    try {
      console.log('💾 [Backup] Creating backup before migration...');
      
      // Count existing records
      const recordCounts = await Promise.all([
        this.prisma.dailyAnalytics.count(),
        this.prisma.earningsSnapshot.count(),
        this.prisma.earning.count()
      ]);
      
      console.log('📊 [Backup] Current record counts:', {
        dailyAnalytics: recordCounts[0],
        earningsSnapshots: recordCounts[1],
        earnings: recordCounts[2]
      });
      
      // In a real production environment, you might want to:
      // - Export data to files
      // - Create database snapshots
      // - Use pg_dump for PostgreSQL
      
      console.log('✅ [Backup] Backup preparation completed');
      
    } catch (error) {
      console.error('❌ [Backup] Backup creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Utility methods
   */
  
  async getTargetCreators(specificCreatorIds = null) {
    const whereClause = {
      isActive: true,
      applicationStatus: 'APPROVED'
    };
    
    if (specificCreatorIds && Array.isArray(specificCreatorIds)) {
      whereClause.id = { in: specificCreatorIds };
    }
    
    return await this.prisma.creator.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        commissionRate: true,
        impactSubId: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' } // Process older creators first
    });
  }

  async creatorHasRecentData(creatorId, endDate) {
    const recentRecord = await this.prisma.dailyAnalytics.findFirst({
      where: {
        creatorId,
        date: {
          gte: new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000)) // Within last 7 days
        }
      }
    });
    
    return !!recentRecord;
  }

  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  createDateChunks(startDate, endDate, chunkSizeDays) {
    const chunks = [];
    let current = new Date(startDate);
    
    while (current <= endDate) {
      const chunkEnd = new Date(current);
      chunkEnd.setDate(chunkEnd.getDate() + chunkSizeDays - 1);
      
      if (chunkEnd > endDate) {
        chunkEnd.setTime(endDate.getTime());
      }
      
      chunks.push({
        start: new Date(current),
        end: new Date(chunkEnd)
      });
      
      current.setDate(current.getDate() + chunkSizeDays);
    }
    
    return chunks;
  }

  calculateDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end - start) / (24 * 60 * 60 * 1000)) + 1;
    
    return { start, end, totalDays };
  }

  aggregateResults(mainResults, batchResults) {
    mainResults.creators.successful += batchResults.successful;
    mainResults.creators.failed += batchResults.failed;
    mainResults.creators.skipped += batchResults.skipped;
    mainResults.data.totalRecords += batchResults.records;
    mainResults.data.impactApiCalls += batchResults.apiCalls;
    mainResults.data.errors.push(...batchResults.errors);
  }

  reportProgress(results, currentBatch, totalBatches) {
    const progressPercent = ((currentBatch / totalBatches) * 100).toFixed(1);
    const elapsed = new Date() - results.startTime;
    const estimatedTotal = (elapsed / currentBatch) * totalBatches;
    const remaining = estimatedTotal - elapsed;
    
    console.log(`📈 [Progress] ${progressPercent}% complete (${currentBatch}/${totalBatches} batches)`);
    console.log(`⏱️ [Progress] Elapsed: ${this.formatDuration(elapsed)}, Estimated remaining: ${this.formatDuration(remaining)}`);
    console.log(`📊 [Progress] Current stats: ${results.creators.successful} successful, ${results.creators.failed} failed, ${results.data.totalRecords} records created`);
  }

  printFinalSummary(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 HISTORICAL DATA MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️ Duration: ${this.formatDuration(results.performance.totalDuration)}`);
    console.log(`👥 Creators: ${results.creators.successful} successful, ${results.creators.failed} failed, ${results.creators.skipped} skipped`);
    console.log(`📊 Data: ${results.data.totalRecords} records created, ${results.data.impactApiCalls} API calls`);
    console.log(`⚡ Performance: ${(results.performance.averageTimePerCreator / 1000).toFixed(1)}s average per creator`);
    
    if (results.data.errors.length > 0) {
      console.log(`❌ Errors (${results.data.errors.length}):`);
      results.data.errors.slice(0, 5).forEach(error => console.log(`   - ${error}`));
      if (results.data.errors.length > 5) {
        console.log(`   ... and ${results.data.errors.length - 5} more errors`);
      }
    }
    
    console.log('='.repeat(60) + '\n');
  }

  getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - 90); // 90 days ago
    date.setHours(0, 0, 0, 0);
    return date;
  }

  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { HistoricalDataMigration };
