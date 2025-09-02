// Cron Service - Automated Daily Tasks
// Handles scheduled jobs for data collection and maintenance

const { DailyAnalyticsService } = require('./dailyAnalyticsService');

class CronService {
  constructor() {
    this.dailyAnalytics = new DailyAnalyticsService();
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ [Cron] Service already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 [Cron] Starting scheduled jobs...');

    // Daily analytics collection - Run at 2 AM every day
    this.scheduleDailyAnalytics();

    console.log('✅ [Cron] All jobs scheduled successfully');
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    console.log('🛑 [Cron] Stopping all scheduled jobs...');
    
    this.jobs.forEach((interval, jobName) => {
      clearInterval(interval);
      console.log(`✅ [Cron] Stopped job: ${jobName}`);
    });

    this.jobs.clear();
    this.isRunning = false;
    console.log('✅ [Cron] All jobs stopped');
  }

  /**
   * Schedule daily analytics collection
   */
  scheduleDailyAnalytics() {
    // Calculate time until next 2 AM
    const now = new Date();
    const next2AM = new Date();
    next2AM.setHours(2, 0, 0, 0); // 2:00 AM
    
    // If it's already past 2 AM today, schedule for tomorrow
    if (now > next2AM) {
      next2AM.setDate(next2AM.getDate() + 1);
    }

    const msUntil2AM = next2AM.getTime() - now.getTime();
    
    console.log(`⏰ [Cron] Daily analytics scheduled for ${next2AM.toISOString()} (in ${Math.round(msUntil2AM / 1000 / 60)} minutes)`);

    // Initial timeout to reach 2 AM
    setTimeout(() => {
      // Run immediately when we reach 2 AM
      this.runDailyAnalyticsJob();
      
      // Then schedule to run every 24 hours
      const dailyInterval = setInterval(() => {
        this.runDailyAnalyticsJob();
      }, 24 * 60 * 60 * 1000); // 24 hours

      this.jobs.set('daily-analytics', dailyInterval);
      console.log('✅ [Cron] Daily analytics job scheduled (every 24 hours at 2 AM)');
      
    }, msUntil2AM);
  }

  /**
   * Run the daily analytics collection job
   */
  async runDailyAnalyticsJob() {
    try {
      console.log('🔄 [Cron Job] Starting daily analytics collection...');
      
      const results = await this.dailyAnalytics.runDailyJob();
      
      console.log('✅ [Cron Job] Daily analytics completed:', {
        date: results.date,
        successful: results.successful,
        failed: results.failed,
        totalCommissions: results.metrics.totalCommissions.toFixed(2)
      });

      // Log any failures for monitoring
      if (results.failed > 0) {
        console.warn(`⚠️ [Cron Job] ${results.failed} creators failed collection:`, results.errors);
      }

    } catch (error) {
      console.error('❌ [Cron Job] Daily analytics failed:', error.message);
      
      // In production, you might want to send alerts here
      // await this.sendErrorAlert('Daily Analytics Failed', error.message);
    }
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      nextRun: this.getNextRunTime(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get next scheduled run time
   */
  getNextRunTime() {
    const now = new Date();
    const next2AM = new Date();
    next2AM.setHours(2, 0, 0, 0);
    
    // If it's already past 2 AM today, next run is tomorrow
    if (now > next2AM) {
      next2AM.setDate(next2AM.getDate() + 1);
    }

    return next2AM.toISOString();
  }

  /**
   * Manual trigger for testing
   */
  async triggerDailyJob() {
    console.log('🔄 [Cron] Manual trigger of daily analytics job...');
    await this.runDailyAnalyticsJob();
  }
}

// Global cron service instance
let cronServiceInstance = null;

/**
 * Get or create cron service instance
 */
function getCronService() {
  if (!cronServiceInstance) {
    cronServiceInstance = new CronService();
  }
  return cronServiceInstance;
}

/**
 * Initialize cron service (called from server.js)
 */
function initializeCronService() {
  const cronService = getCronService();
  
  // Only start in production or when explicitly enabled
  const enableCron = process.env.ENABLE_CRON_JOBS === 'true' || process.env.NODE_ENV === 'production';
  
  if (enableCron) {
    cronService.start();
    console.log('✅ [Cron] Service initialized and started');
  } else {
    console.log('ℹ️ [Cron] Service initialized but not started (set ENABLE_CRON_JOBS=true to enable)');
  }

  return cronService;
}

module.exports = {
  CronService,
  getCronService,
  initializeCronService
};
