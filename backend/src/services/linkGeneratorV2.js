const crypto = require('crypto');
const { getPrisma } = require('../utils/prisma');

class LinkGeneratorV2 {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour cache
    this.performanceMetrics = [];
    this.brandConfigs = new Map();
    this.impactService = null; // Cache Impact.com service instance for speed
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
      
      // V2 SPEED OPTIMIZATION: Use cached Impact.com service instance
      if (!this.impactService) {
        this.impactService = impact;
      }
      
      // V2: ONLY use Impact.com API - NO FALLBACK
      // Get brand-specific program ID if brand is specified
      let programId = null;
      if (brandId) {
        const brand = await this.getBrandConfig(brandId);
        if (brand && brand.impactProgramId) {
          programId = brand.impactProgramId;
          console.log(`🎯 Using brand-specific program ID: ${programId} for brand: ${brand.displayName}`);
        }
      }
      
      const trackingResult = await this.impactService.createTrackingLink(destinationUrl, creatorId, { 
        noFallback: true,
        programId: programId 
      });
      
      if (trackingResult.success) {
        this.recordPerformance(startTime, 1, 0, 0, brandId);
        return {
          success: true,
          trackingUrl: trackingResult.trackingUrl,
          originalUrl: destinationUrl,
          method: 'impact_api_only'
        };
      } else {
        // V2: NO FALLBACK - Fail if Impact.com API doesn't work
        console.error(`❌ V2: Impact.com API failed - NO FALLBACK ALLOWED`);
        this.recordPerformance(startTime, 0, 0, 1, brandId);
        throw new Error(`Impact.com API failed for brand ${brandId || 'default'}. V2 requires Impact.com API to work.`);
      }
    } catch (error) {
      console.error(`❌ V2: Error creating Impact.com link - NO FALLBACK:`, error);
      this.recordPerformance(startTime, 0, 0, 1, brandId);
      throw new Error(`V2 Link Generation Failed: ${error.message}. Only Impact.com API is supported in V2.`);
    }
  }

  // V2: NO FALLBACK METHOD - Only Impact.com API is supported

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

  // Auto-detect brand from URL
  async detectBrandFromUrl(destinationUrl) {
    try {
      const url = new URL(destinationUrl);
      const hostname = url.hostname.toLowerCase();
      
      console.log(`🔍 Auto-detecting brand from URL: ${hostname}`);
      
      // Get all available brands
      const prisma = getPrisma();
      const brands = await prisma.brandConfig.findMany({
        where: { isActive: true, impactProgramId: { not: null } }
      });
      
      console.log(`🔍 Available brands for detection: ${brands.length}`);
      brands.forEach(brand => {
        console.log(`  - ${brand.displayName} (${brand.name}) - Program ID: ${brand.impactProgramId}`);
      });
      
      // First, try to detect brand from product name in URL path
      const urlPath = url.pathname.toLowerCase();
      const urlSearch = url.search.toLowerCase();
      const fullUrl = destinationUrl.toLowerCase();
      
      console.log(`🔍 Analyzing URL for product brands: ${urlPath}`);
      
      // Check for product-based brand matches (e.g., "roborock" in URL)
      for (const brand of brands) {
        const brandName = brand.name.toLowerCase();
        const displayName = brand.displayName.toLowerCase();
        
        // Check if brand name appears in URL path or search params
        if (urlPath.includes(brandName) || 
            urlPath.includes(displayName) ||
            urlSearch.includes(brandName) ||
            urlSearch.includes(displayName) ||
            fullUrl.includes(brandName) ||
            fullUrl.includes(displayName)) {
          console.log(`✅ Auto-detected brand from product: ${brand.displayName} (found "${brandName}" in URL)`);
          return brand;
        }
      }
      
      // Fallback: Check for domain matches
      for (const brand of brands) {
        const brandName = brand.name.toLowerCase();
        const displayName = brand.displayName.toLowerCase();
        
        // Extract domain name without subdomain (e.g., "coolway" from "coolway-us.com")
        const domainName = hostname.replace('www.', '').split('.')[0];
        const domainWithoutSuffix = domainName.split('-')[0]; // "coolway" from "coolway-us"
        
        // Check if URL hostname contains brand name or vice versa
        if (hostname.includes(brandName) || 
            hostname.includes(displayName) ||
            brandName.includes(domainName) ||
            brandName.includes(domainWithoutSuffix) ||
            displayName.includes(domainName) ||
            displayName.includes(domainWithoutSuffix) ||
            domainName.includes(brandName) ||
            domainWithoutSuffix.includes(brandName) ||
            domainName.includes(displayName) ||
            domainWithoutSuffix.includes(displayName)) {
          console.log(`✅ Auto-detected brand from domain: ${brand.displayName} for URL: ${hostname} (matched: ${brandName})`);
          return brand;
        }
      }
      
      console.log(`⚠️ No brand auto-detected for URL: ${hostname}`);
      return null;
    } catch (error) {
      console.error('❌ Error in brand auto-detection:', error);
      return null;
    }
  }

  // Main link generation function with parallel processing
  async generateLink(destinationUrl, creatorId, brandId = null, options = {}) {
    const startTime = Date.now();
    const { generateQR = false, customShortCode = null } = options;
    
    try {
      console.log(`🚀 [V2] Starting link generation for creator ${creatorId}, brand ${brandId || 'auto-detect'}`);
      
      // V2: Auto-detect brand if not specified
      if (!brandId) {
        const detectedBrand = await this.detectBrandFromUrl(destinationUrl);
        if (detectedBrand) {
          brandId = detectedBrand.id;
          console.log(`🎯 Auto-detected brand: ${detectedBrand.displayName}`);
        } else {
          console.log(`⚠️ No brand auto-detected for URL: ${destinationUrl}. Proceeding with default configuration.`);
          // Don't throw error, proceed with default configuration
        }
      }
      
      // V2: Validate brand configuration if brand is specified
      if (brandId) {
        const brand = await this.getBrandConfig(brandId);
        if (!brand) {
          console.log(`⚠️ Brand ${brandId} not found or inactive. Proceeding with default configuration.`);
          brandId = null; // Reset to default
        } else if (!brand.impactProgramId) {
          console.log(`⚠️ Brand ${brand.displayName} is not configured with Impact.com program ID. Proceeding with default configuration.`);
          brandId = null; // Reset to default
        } else {
          console.log(`✅ [V2] Brand ${brand.displayName} validated with program ID: ${brand.impactProgramId}`);
        }
      }
      
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

      // V2 SPEED OPTIMIZATION: Create short link record first
      const shortLinkRecord = await prisma.shortLinkV2.create({
        data: {
          shortCode,
          originalUrl: destinationUrl,
          impactLink: impactResult.trackingUrl,
          brandId,
          creatorId
        }
      });

      // Create main link record with the shortLinkRecord.id
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

    // V2 SPEED OPTIMIZATION: Generate longer, more unique codes to reduce collision probability
    const shortCode = this.generateShortCode(12); // Increased from 8 to 12 characters
    
    // Check collision only once (with longer codes, collisions are very rare)
    const exists = await this.checkShortCodeExists(shortCode);
    if (!exists) {
      return shortCode;
    }

    // If collision occurs, try one more time with timestamp
    const timestamp = Date.now().toString(36);
    const fallbackCode = this.generateShortCode(8) + timestamp.slice(-4);
    return fallbackCode;
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
