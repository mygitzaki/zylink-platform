const crypto = require('crypto');
const { getPrisma } = require('../utils/prisma');

class LinkGeneratorV2 {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour cache
    this.performanceMetrics = [];
    this.brandConfigs = new Map();
  }

  // Generate short code with collision detection
  generateShortCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Create Impact.com tracking link with brand-specific config
  async createImpactLink(destinationUrl, creatorId, brandId = null) {
    const startTime = Date.now();
    
    try {
      // Import ImpactWebService for proper Impact.com API integration
      const ImpactWebService = require('./impactWebService');
      const impact = new ImpactWebService();
      
      // Use the same Impact.com API as V1
      const trackingResult = await impact.createTrackingLink(destinationUrl, creatorId);
      
      if (trackingResult.success) {
        this.recordPerformance(startTime, 1, 0, 0, brandId);
        return {
          success: true,
          trackingUrl: trackingResult.trackingUrl,
          originalUrl: destinationUrl,
          method: 'impact_api_v1_compatible'
        };
      } else {
        console.warn(`⚠️ Impact.com API failed, using fallback`);
        return this.createFallbackLink(destinationUrl, creatorId, brandId);
      }
    } catch (error) {
      console.error(`❌ Error creating Impact.com link:`, error);
      return this.createFallbackLink(destinationUrl, creatorId, brandId);
    }
  }

  // Fallback link generation
  createFallbackLink(destinationUrl, creatorId, brandId = null) {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const clickId = `zy_v2_${timestamp}_${randomId}`;
    
    try {
      const url = new URL(destinationUrl);
      url.searchParams.set('clickid', clickId);
      url.searchParams.set('creator', creatorId);
      if (brandId) url.searchParams.set('brand', brandId);
      return {
        success: true,
        trackingUrl: url.toString(),
        originalUrl: destinationUrl,
        method: 'fallback'
      };
    } catch {
      const sep = destinationUrl.includes('?') ? '&' : '?';
      return {
        success: true,
        trackingUrl: `${destinationUrl}${sep}clickid=${clickId}&creator=${creatorId}`,
        originalUrl: destinationUrl,
        method: 'fallback'
      };
    }
  }

  // Generate shared ID for Impact.com
  generateSharedId(creatorId, brandId) {
    const input = `${creatorId}_${brandId || 'default'}_${Date.now()}`;
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
  }

  // Get brand configuration with caching
  async getBrandConfig(brandId) {
    if (!brandId) return null;
    
    // Check cache first
    if (this.cache.has(`brand_${brandId}`)) {
      return this.cache.get(`brand_${brandId}`);
    }

    try {
      const prisma = getPrisma();
      if (!prisma) return null;

      const brand = await prisma.brandConfig.findUnique({
        where: { id: brandId, isActive: true }
      });

      if (brand) {
        this.cache.set(`brand_${brandId}`, brand);
        return brand;
      }
    } catch (error) {
      console.error('❌ Error fetching brand config:', error);
    }

    return null;
  }

  // Main link generation function with parallel processing
  async generateLink(destinationUrl, creatorId, brandId = null, options = {}) {
    const startTime = Date.now();
    const { generateQR = false, customShortCode = null } = options;
    
    try {
      console.log(`🚀 [V2] Starting link generation for creator ${creatorId}, brand ${brandId || 'default'}`);
      
      // Parallel processing: Generate short code and Impact link simultaneously
      const [shortCode, impactResult] = await Promise.all([
        this.generateUniqueShortCode(customShortCode),
        this.createImpactLink(destinationUrl, creatorId, brandId)
      ]);

      // Create short link URL
      const shortLink = `${process.env.SHORTLINK_BASE || 'https://s.zylike.com'}/${shortCode}`;
      
      // Prepare database operations
      const prisma = getPrisma();
      if (!prisma) {
        throw new Error('Database not available');
      }

      // Create short link record
      const shortLinkRecord = await prisma.shortLinkV2.create({
        data: {
          shortCode,
          originalUrl: destinationUrl,
          impactLink: impactResult.trackingUrl,
          brandId,
          creatorId
        }
      });

      // Create main link record
      const linkRecord = await prisma.linkV2.create({
        data: {
          shortLinkId: shortLinkRecord.id,
          destinationUrl,
          impactLink: impactResult.trackingUrl,
          brandId,
          creatorId,
          metadata: {
            generationMethod: impactResult.method,
            brandId,
            timestamp: new Date().toISOString()
          }
        }
      });

      // Generate QR code if requested (async)
      let qrCodeUrl = null;
      if (generateQR) {
        // QR code generation can be done asynchronously
        setImmediate(() => this.generateQRCode(shortLink, linkRecord.id));
      }

      const result = {
        success: true,
        shortCode,
        shortLink,
        originalUrl: destinationUrl,
        impactLink: impactResult.trackingUrl,
        qrCodeUrl,
        brandId,
        generationTime: Date.now() - startTime,
        method: impactResult.method
      };

      // Record performance metrics
      this.recordPerformance(startTime, 1, 0, 0, brandId);

      console.log(`✅ [V2] Link generated successfully: ${shortCode} (${Date.now() - startTime}ms)`);
      return result;

    } catch (error) {
      console.error(`❌ [V2] Link generation failed:`, error);
      this.recordPerformance(startTime, 0, 0, 1, brandId);
      throw error;
    }
  }

  // Generate unique short code with collision detection
  async generateUniqueShortCode(customCode = null) {
    if (customCode) {
      // Check if custom code is available
      const exists = await this.checkShortCodeExists(customCode);
      if (!exists) return customCode;
      throw new Error('Custom short code already exists');
    }

    // Generate random code with collision detection
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const shortCode = this.generateShortCode(8);
      const exists = await this.checkShortCodeExists(shortCode);
      
      if (!exists) {
        return shortCode;
      }
      
      attempts++;
    }

    throw new Error('Unable to generate unique short code');
  }

  // Check if short code exists
  async checkShortCodeExists(shortCode) {
    try {
      const prisma = getPrisma();
      if (!prisma) return false;

      const exists = await prisma.shortLinkV2.findUnique({
        where: { shortCode },
        select: { id: true }
      });

      return !!exists;
    } catch (error) {
      console.error('❌ Error checking short code existence:', error);
      return false;
    }
  }

  // Generate QR code (placeholder for now)
  async generateQRCode(shortLink, linkId) {
    try {
      // TODO: Implement QR code generation
      console.log(`📱 [V2] QR code generation for ${shortLink} (linkId: ${linkId})`);
      // This would integrate with a QR code service
    } catch (error) {
      console.error('❌ QR code generation failed:', error);
    }
  }

  // Record performance metrics
  recordPerformance(startTime, apiCalls, cacheHits, errors, brandId) {
    const generationTime = Date.now() - startTime;
    
    this.performanceMetrics.push({
      generationTime,
      apiCalls,
      cacheHits,
      errors,
      brandId,
      timestamp: new Date()
    });

    // Keep only last 1000 metrics to prevent memory issues
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }
  }

  // Get performance statistics
  getPerformanceStats() {
    if (this.performanceMetrics.length === 0) {
      return { averageTime: 0, totalGenerated: 0, successRate: 0 };
    }

    const total = this.performanceMetrics.length;
    const averageTime = this.performanceMetrics.reduce((sum, m) => sum + m.generationTime, 0) / total;
    const successful = this.performanceMetrics.filter(m => m.errors === 0).length;
    const successRate = (successful / total) * 100;

    return {
      averageTime: Math.round(averageTime),
      totalGenerated: total,
      successRate: Math.round(successRate * 100) / 100,
      recentMetrics: this.performanceMetrics.slice(-10)
    };
  }

  // Clean up cache
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }
}

module.exports = LinkGeneratorV2;
