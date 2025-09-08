const express = require('express');
const { getPrisma } = require('../utils/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const LinkGeneratorV2 = require('../services/linkGeneratorV2');

const router = express.Router();
const prisma = getPrisma();
const linkGenerator = new LinkGeneratorV2();

// Debug endpoint to check database connection (no auth required)
router.get('/debug/database', async (req, res) => {
  try {
    console.log('🔍 [V2] Debug: Checking database connection...');
    console.log('🔍 [V2] Database URL present:', !!process.env.DATABASE_URL);
    
    if (!prisma) {
      return res.status(503).json({ 
        success: false, 
        message: 'Prisma client not available' 
      });
    }

    // Check if V2 tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%v2%'
    `;

    console.log('📋 [V2] V2 tables found:', tables);

    res.json({
      success: true,
      message: 'Database connection working',
      databaseUrlPresent: !!process.env.DATABASE_URL,
      v2Tables: tables,
      tableCount: tables.length
    });

  } catch (error) {
    console.error('❌ [V2] Database debug error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Generate new link (V2)
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { 
      destinationUrl, 
      brandId = null, 
      customShortCode = null,
      generateQR = false 
    } = req.body;

    if (!destinationUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'destinationUrl is required' 
      });
    }

    console.log(`🚀 [V2] Link generation request from user ${req.user.id}`);
    console.log(`📝 [V2] Destination: ${destinationUrl}, Brand: ${brandId || 'default'}`);

    const result = await linkGenerator.generateLink(
      destinationUrl, 
      req.user.id, 
      brandId, 
      { generateQR, customShortCode }
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'Link generated successfully'
    });

  } catch (error) {
    console.error('❌ [V2] Link generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Link generation failed',
      error: error.message
    });
  }
});

// Get user's links (V2)
router.get('/', requireAuth, async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database not available' 
      });
    }

    const { page = 1, limit = 20, brandId = null } = req.query;
    const skip = (page - 1) * limit;

    const where = { creatorId: req.user.id };
    if (brandId) where.brandId = brandId;

    const [links, total] = await Promise.all([
      prisma.linkV2.findMany({
        where,
        include: {
          shortLink: true,
          brand: true
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.linkV2.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        links,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ [V2] Error fetching links:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch links',
      error: error.message
    });
  }
});

// Get specific link (V2)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database not available' 
      });
    }

    const link = await prisma.linkV2.findUnique({
      where: { id: req.params.id },
      include: {
        shortLink: true,
        brand: true
      }
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Link not found'
      });
    }

    if (link.creatorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { link }
    });

  } catch (error) {
    console.error('❌ [V2] Error fetching link:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch link',
      error: error.message
    });
  }
});

// Delete link (V2)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database not available' 
      });
    }

    const link = await prisma.linkV2.findUnique({
      where: { id: req.params.id },
      include: { shortLink: true }
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Link not found'
      });
    }

    if (link.creatorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Delete both link and short link records
    await prisma.$transaction([
      prisma.linkV2.delete({ where: { id: req.params.id } }),
      prisma.shortLinkV2.delete({ where: { id: link.shortLinkId } })
    ]);

    res.json({
      success: true,
      message: 'Link deleted successfully'
    });

  } catch (error) {
    console.error('❌ [V2] Error deleting link:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete link',
      error: error.message
    });
  }
});

// Fetch available Impact.com programs (V2)
router.get('/admin/impact-programs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const ImpactWebService = require('../../services/impactWebService');
    const impact = new ImpactWebService();
    
    // Fetch campaigns/programs from Impact.com API
    const programs = await impact.getAvailablePrograms();
    
    res.json({
      success: true,
      message: `Found ${programs.length} available programs`,
      data: programs
    });

  } catch (error) {
    console.error('❌ [V2] Error fetching Impact.com programs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Impact.com programs',
      error: error.message
    });
  }
});

// Update brand program ID (V2)
router.put('/admin/brands/:brandId/program-id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { brandId } = req.params;
    const { impactProgramId } = req.body;

    if (!prisma) {
      return res.status(503).json({
        success: false,
        message: 'Database not available'
      });
    }

    if (!impactProgramId) {
      return res.status(400).json({
        success: false,
        message: 'impactProgramId is required'
      });
    }

    const updatedBrand = await prisma.brandConfig.update({
      where: { id: brandId },
      data: { impactProgramId: parseInt(impactProgramId) }
    });

    console.log(`✅ [V2] Updated brand ${updatedBrand.displayName} with program ID: ${impactProgramId}`);

    res.json({
      success: true,
      message: `Brand ${updatedBrand.displayName} updated with program ID ${impactProgramId}`,
      data: updatedBrand
    });

  } catch (error) {
    console.error('❌ [V2] Error updating brand program ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update brand program ID',
      error: error.message
    });
  }
});

// Get performance statistics (V2)
router.get('/stats/performance', requireAuth, async (req, res) => {
  try {
    const stats = linkGenerator.getPerformanceStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ [V2] Error fetching performance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance statistics',
      error: error.message
    });
  }
});

// Get user's link statistics (V2)
router.get('/stats/user', requireAuth, async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database not available' 
      });
    }

    const { brandId = null } = req.query;
    const where = { creatorId: req.user.id };
    if (brandId) where.brandId = brandId;

    const [totalLinks, totalClicks, recentLinks] = await Promise.all([
      prisma.linkV2.count({ where }),
      prisma.shortLinkV2.aggregate({
        where: { creatorId: req.user.id },
        _sum: { clicks: true }
      }),
      prisma.linkV2.findMany({
        where,
        include: { shortLink: true },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    res.json({
      success: true,
      data: {
        totalLinks,
        totalClicks: totalClicks._sum.clicks || 0,
        recentLinks
      }
    });

  } catch (error) {
    console.error('❌ [V2] Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: error.message
    });
  }
});

// Admin: Get all brands
router.get('/admin/brands', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database not available' 
      });
    }

    const brands = await prisma.brandConfig.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: brands
    });

  } catch (error) {
    console.error('❌ [V2] Error fetching brands:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brands',
      error: error.message
    });
  }
});

// Admin: Create brand
router.post('/admin/brands', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      displayName,
      impactAccountSid,
      impactAuthToken,
      impactProgramId,
      defaultCommissionRate = 0.1,
      customDomain,
      settings = {}
    } = req.body;

    if (!name || !displayName) {
      return res.status(400).json({
        success: false,
        message: 'name and displayName are required'
      });
    }

    if (!prisma) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database not available' 
      });
    }

    const brand = await prisma.brandConfig.create({
      data: {
        name,
        displayName,
        impactAccountSid,
        impactAuthToken,
        impactProgramId,
        defaultCommissionRate,
        customDomain,
        settings
      }
    });

    res.status(201).json({
      success: true,
      data: brand,
      message: 'Brand created successfully'
    });

  } catch (error) {
    console.error('❌ [V2] Error creating brand:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create brand',
      error: error.message
    });
  }
});

// Admin: Bulk create popular brands
router.post('/admin/brands/bulk-create', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({
        success: false,
        message: 'Database not configured'
      });
    }

    const popularBrands = [
      {
        name: 'walmart',
        displayName: 'Walmart',
        impactAccountSid: process.env.IMPACT_ACCOUNT_SID,
        impactAuthToken: process.env.IMPACT_AUTH_TOKEN,
        impactProgramId: process.env.IMPACT_PROGRAM_ID,
        defaultCommissionRate: 0.1,
        customDomain: 'goto.walmart.com',
        settings: {
          category: 'retail',
          description: 'Walmart affiliate program',
          icon: '🛒'
        }
      },
      {
        name: 'roborock',
        displayName: 'Roborock',
        impactAccountSid: process.env.IMPACT_ACCOUNT_SID,
        impactAuthToken: process.env.IMPACT_AUTH_TOKEN,
        impactProgramId: null, // Will be set when we get the specific program ID
        defaultCommissionRate: 0.08,
        customDomain: 'roborockamazonseller.pxf.io',
        settings: {
          category: 'electronics',
          description: 'Roborock smart home products',
          icon: '🤖'
        }
      },
      {
        name: 'torras',
        displayName: 'TORRAS',
        impactAccountSid: process.env.IMPACT_ACCOUNT_SID,
        impactAuthToken: process.env.IMPACT_AUTH_TOKEN,
        impactProgramId: null,
        defaultCommissionRate: 0.12,
        customDomain: null,
        settings: {
          category: 'accessories',
          description: 'TORRAS phone accessories',
          icon: '📱'
        }
      },
      {
        name: 'dhgate',
        displayName: 'DHgate',
        impactAccountSid: process.env.IMPACT_ACCOUNT_SID,
        impactAuthToken: process.env.IMPACT_AUTH_TOKEN,
        impactProgramId: null,
        defaultCommissionRate: 0.15,
        customDomain: 'technitya.sjv.io',
        settings: {
          category: 'marketplace',
          description: 'DHgate global marketplace',
          icon: '🌐'
        }
      },
      {
        name: 'neakasa',
        displayName: 'Neakasa',
        impactAccountSid: process.env.IMPACT_ACCOUNT_SID,
        impactAuthToken: process.env.IMPACT_AUTH_TOKEN,
        impactProgramId: null,
        defaultCommissionRate: 0.10,
        customDomain: null,
        settings: {
          category: 'pet',
          description: 'Neakasa pet products',
          icon: '🐾'
        }
      },
      {
        name: 'technitya',
        displayName: 'TechNitya',
        impactAccountSid: process.env.IMPACT_ACCOUNT_SID,
        impactAuthToken: process.env.IMPACT_AUTH_TOKEN,
        impactProgramId: null,
        defaultCommissionRate: 0.12,
        customDomain: 'technitya.sjv.io',
        settings: {
          category: 'tech',
          description: 'TechNitya technology products',
          icon: '💻'
        }
      }
    ];

    const createdBrands = [];
    const errors = [];

    for (const brandData of popularBrands) {
      try {
        // Check if brand already exists
        const existingBrand = await prisma.brandConfig.findUnique({
          where: { name: brandData.name }
        });

        if (existingBrand) {
          console.log(`⚠️ Brand ${brandData.name} already exists, skipping`);
          continue;
        }

        const brand = await prisma.brandConfig.create({
          data: brandData
        });

        createdBrands.push(brand);
        console.log(`✅ Created brand: ${brand.displayName}`);
      } catch (error) {
        console.error(`❌ Error creating brand ${brandData.name}:`, error);
        errors.push({ brand: brandData.name, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Created ${createdBrands.length} brands successfully`,
      data: {
        created: createdBrands,
        errors: errors,
        total: popularBrands.length
      }
    });

  } catch (error) {
    console.error('❌ [V2] Error in bulk brand creation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create brands',
      error: error.message
    });
  }
});

// Admin: Check and create V2 tables
router.post('/admin/setup-tables', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database not available' 
      });
    }

    console.log('🔍 [V2] Checking V2 tables in production database...');
    console.log('🔍 [V2] Database URL:', process.env.DATABASE_URL ? 'Present' : 'Missing');

    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%v2%'
    `;

    console.log('📋 [V2] Existing V2 tables:', tables);

    if (tables.length === 0) {
      console.log('🔧 [V2] Creating V2 tables...');
      
      // Create V2 tables
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS short_links_v2 (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          short_code TEXT UNIQUE NOT NULL,
          original_url TEXT NOT NULL,
          impact_link TEXT,
          brand_id TEXT,
          creator_id TEXT NOT NULL,
          clicks INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS links_v2 (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          short_link_id TEXT UNIQUE NOT NULL,
          destination_url TEXT NOT NULL,
          impact_link TEXT,
          qr_code_url TEXT,
          brand_id TEXT,
          creator_id TEXT NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          FOREIGN KEY (short_link_id) REFERENCES short_links_v2(id) ON DELETE CASCADE
        );
      `;

      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS brand_configs (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          name TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          impact_account_sid TEXT,
          impact_auth_token TEXT,
          impact_program_id TEXT,
          default_commission_rate DOUBLE PRECISION DEFAULT 0.1,
          custom_domain TEXT,
          is_active BOOLEAN DEFAULT true,
          settings JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS click_logs_v2 (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          short_link_id TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          referrer TEXT,
          country TEXT,
          city TEXT,
          device TEXT,
          browser TEXT,
          os TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          FOREIGN KEY (short_link_id) REFERENCES short_links_v2(id) ON DELETE CASCADE
        );
      `;

      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS performance_metrics_v2 (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          short_link_id TEXT NOT NULL,
          generation_time INTEGER NOT NULL,
          api_calls INTEGER NOT NULL,
          cache_hits INTEGER NOT NULL,
          errors INTEGER NOT NULL,
          brand_id TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          FOREIGN KEY (short_link_id) REFERENCES short_links_v2(id) ON DELETE CASCADE
        );
      `;

      // Create indexes
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_short_links_v2_short_code ON short_links_v2(short_code);`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_short_links_v2_creator_id ON short_links_v2(creator_id);`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_links_v2_creator_id ON links_v2(creator_id);`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_links_v2_brand_id ON links_v2(brand_id);`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_click_logs_v2_short_link_id ON click_logs_v2(short_link_id);`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_performance_metrics_v2_created_at ON performance_metrics_v2(created_at);`;

      console.log('✅ [V2] V2 tables created successfully');
    }

    // Verify tables were created
    const finalTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%v2%'
    `;

    res.json({
      success: true,
      message: 'V2 tables setup completed',
      tables: finalTables
    });

  } catch (error) {
    console.error('❌ [V2] Error setting up tables:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup V2 tables',
      error: error.message
    });
  }
});

module.exports = router;
