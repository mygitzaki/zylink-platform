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
    const ImpactWebService = require('../services/impactWebService');
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

// Auto-configure all brands with Impact.com program IDs (V2)
router.post('/admin/brands/auto-configure', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({
        success: false,
        message: 'Database not available'
      });
    }

    // Fetch all brands from database
    const brands = await prisma.brandConfig.findMany({
      where: { isActive: true }
    });

    // Fetch all programs from Impact.com
    const ImpactWebService = require('../services/impactWebService');
    const impact = new ImpactWebService();
    const programs = await impact.getAvailablePrograms();

    console.log(`🔍 Auto-configuring ${brands.length} brands with ${programs.length} Impact.com programs`);

    const results = [];
    const errors = [];

    for (const brand of brands) {
      try {
        // Find matching program by name
        const matchingProgram = programs.find(program => {
          const programName = (program.name || program.advertiserName || '').toLowerCase();
          const brandName = brand.displayName.toLowerCase();
          
          // Check for exact match or partial match
          return programName.includes(brandName) || 
                 brandName.includes(programName) ||
                 programName.includes(brand.name.toLowerCase()) ||
                 brand.name.toLowerCase().includes(programName);
        });

        if (matchingProgram && matchingProgram.id) {
          // Update brand with program ID
          const updatedBrand = await prisma.brandConfig.update({
            where: { id: brand.id },
            data: { impactProgramId: String(matchingProgram.id) }
          });

          results.push({
            brand: brand.displayName,
            programId: matchingProgram.id,
            programName: matchingProgram.name || matchingProgram.advertiserName,
            status: 'configured'
          });

          console.log(`✅ Auto-configured ${brand.displayName} with program ID ${matchingProgram.id}`);
        } else {
          errors.push({
            brand: brand.displayName,
            reason: 'No matching program found in Impact.com account'
          });
          console.log(`⚠️ No matching program found for ${brand.displayName}`);
        }
      } catch (error) {
        errors.push({
          brand: brand.displayName,
          reason: error.message
        });
        console.error(`❌ Error configuring ${brand.displayName}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Auto-configured ${results.length} brands successfully`,
      data: {
        configured: results,
        errors: errors,
        total: brands.length
      }
    });

  } catch (error) {
    console.error('❌ [V2] Error in auto-configure brands:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-configure brands',
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
      data: { impactProgramId: String(impactProgramId) }
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

// 🚀 AUTONOMOUS BRAND DISCOVERY SYSTEM

// Discover all brands from Impact.com and auto-configure them
router.post('/admin/brands/discover', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({
        success: false,
        message: 'Database not available'
      });
    }

    console.log('🚀 Starting brand discovery from Impact.com...');

    const ImpactWebService = require('../services/impactWebService');
    const impact = new ImpactWebService();
    
    // Get all programs from Impact.com
    const programs = await impact.getAvailablePrograms();
    console.log(`📋 Found ${programs.length} programs from Impact.com`);
    
    const results = [];
    const errors = [];
    
    for (const program of programs) {
      try {
        if (!program.id || !program.name) {
          console.log(`⚠️ Skipping program without ID or name:`, program);
          continue;
        }
        
        // Extract clean brand name
        const brandName = extractBrandName(program.name || program.advertiserName);
        
        if (brandName) {
          // Check if brand already exists
          const existingBrand = await prisma.brandConfig.findFirst({
            where: {
              OR: [
                { name: brandName.toLowerCase() },
                { displayName: brandName },
                { impactProgramId: String(program.id) }
              ]
            }
          });
          
          if (existingBrand) {
            // Update existing brand if needed
            if (!existingBrand.impactProgramId) {
              await prisma.brandConfig.update({
                where: { id: existingBrand.id },
                data: { 
                  impactProgramId: String(program.id),
                  settings: {
                    ...existingBrand.settings,
                    programName: program.name,
                    advertiserName: program.advertiserName,
                    discoveredAt: new Date().toISOString()
                  }
                }
              });
              
              results.push({
                brand: brandName,
                programId: program.id,
                status: 'updated',
                action: 'Added program ID'
              });
            } else {
              results.push({
                brand: brandName,
                programId: program.id,
                status: 'skipped',
                action: 'Already configured'
              });
            }
          } else {
            // Create new brand
            await prisma.brandConfig.create({
              data: {
                name: brandName.toLowerCase(),
                displayName: brandName,
                impactProgramId: String(program.id),
                impactAccountSid: impact.accountSid,
                impactAuthToken: impact.authToken,
                defaultCommissionRate: 0.05,
                isActive: true,
                settings: {
                  autoDetect: true,
                  programName: program.name,
                  advertiserName: program.advertiserName,
                  status: program.status,
                  discoveredAt: new Date().toISOString()
                }
              }
            });
            
            results.push({
              brand: brandName,
              programId: program.id,
              status: 'created',
              action: 'New brand discovered'
            });
          }
          
          console.log(`✅ Processed brand: ${brandName} (Program ID: ${program.id})`);
        }
      } catch (error) {
        errors.push({
          brand: program.name || 'Unknown',
          programId: program.id,
          reason: error.message
        });
        console.error(`❌ Error processing brand:`, error);
      }
    }
    
    res.json({
      success: true,
      message: `Brand discovery completed: ${results.length} brands processed`,
      data: {
        discovered: programs.length,
        processed: results.length,
        results: results,
        errors: errors,
        summary: {
          created: results.filter(r => r.status === 'created').length,
          updated: results.filter(r => r.status === 'updated').length,
          skipped: results.filter(r => r.status === 'skipped').length,
          failed: errors.length
        }
      }
    });
    
  } catch (error) {
    console.error('❌ [V2] Error in brand discovery:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to discover brands',
      error: error.message
    });
  }
});

// Helper function to extract clean brand name
function extractBrandName(programName) {
  if (!programName) return null;
  
  const cleanName = programName
    .replace(/\s+(Affiliate|Program|Campaign|Network|Partnership).*$/i, '')
    .replace(/\s+(Inc|LLC|Corp|Corporation|Ltd|Limited).*$/i, '')
    .replace(/\s+(Store|Shop|Official|Brand).*$/i, '')
    .replace(/\s+-\s+.*$/, '')
    .replace(/\s+\(.*\)$/, '')
    .trim();
  
  // Filter out generic marketplace terms
  const genericTerms = ['amazon', 'ebay', 'walmart', 'target', 'best buy', 'home depot'];
  if (genericTerms.includes(cleanName.toLowerCase())) {
    return null;
  }
  
  return cleanName;
}

// ===== CREATOR-SPECIFIC ENDPOINTS (No Admin Required) =====

// Creator: Get all brands (read-only access)
router.get('/creator/brands', requireAuth, async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({
        success: false,
        message: 'Database not configured'
      });
    }

    const brands = await prisma.brandConfig.findMany({
      where: { isActive: true },
      orderBy: { displayName: 'asc' }
    });

    res.json({
      success: true,
      message: `Found ${brands.length} available brands`,
      data: brands
    });

  } catch (error) {
    console.error('❌ [V2] Error fetching brands for creator:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brands',
      error: error.message
    });
  }
});

// Creator: Fetch available Impact.com programs (read-only access)
router.get('/creator/impact-programs', requireAuth, async (req, res) => {
  try {
    const ImpactWebService = require('../services/impactWebService');
    const impact = new ImpactWebService();
    
    // Fetch campaigns/programs from Impact.com API
    const programs = await impact.getAvailablePrograms();
    
    res.json({
      success: true,
      message: `Found ${programs.length} available programs`,
      data: programs
    });

  } catch (error) {
    console.error('❌ [V2] Error fetching Impact.com programs for creator:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Impact.com programs',
      error: error.message
    });
  }
});

// Creator: Auto-configure all brands (limited access)
router.post('/creator/brands/auto-configure', requireAuth, async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({
        success: false,
        message: 'Database not configured'
      });
    }

    console.log('🔧 [V2] Creator auto-configuring brands...');
    
    const ImpactWebService = require('../services/impactWebService');
    const impact = new ImpactWebService();
    
    // Get all brands that need configuration
    const brands = await prisma.brandConfig.findMany({
      where: { 
        isActive: true,
        impactProgramId: null 
      }
    });

    if (brands.length === 0) {
      return res.json({
        success: true,
        message: 'No brands need configuration',
        data: { configured: [], errors: [] }
      });
    }

    // Get available programs
    const programs = await impact.getAvailablePrograms();
    
    const configured = [];
    const errors = [];

    for (const brand of brands) {
      try {
        // Find matching program
        const matchingProgram = programs.find(program => {
          const programName = (program.name || program.advertiserName || '').toLowerCase();
          const brandName = brand.name.toLowerCase();
          return programName.includes(brandName) || brandName.includes(programName);
        });

        if (matchingProgram) {
          await prisma.brandConfig.update({
            where: { id: brand.id },
            data: { impactProgramId: matchingProgram.id }
          });
          
          configured.push({
            brand: brand.displayName,
            programId: matchingProgram.id,
            programName: matchingProgram.name || matchingProgram.advertiserName
          });
        } else {
          errors.push({
            brand: brand.displayName,
            reason: 'No matching program found'
          });
        }
      } catch (error) {
        errors.push({
          brand: brand.displayName,
          reason: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Auto-configured ${configured.length} brands`,
      data: { configured, errors }
    });

  } catch (error) {
    console.error('❌ [V2] Error auto-configuring brands for creator:', error);
    res.status(500).json({
      success: false,
      message: 'Auto-configuration failed',
      error: error.message
    });
  }
});

// Creator: Create popular brands (limited access)
router.post('/creator/brands/bulk-create', requireAuth, async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({
        success: false,
        message: 'Database not configured'
      });
    }

    const popularBrands = [
      { name: 'walmart', displayName: 'Walmart', icon: '🏪', impactProgramId: null },
      { name: 'amazon', displayName: 'Amazon', icon: '📦', impactProgramId: null },
      { name: 'target', displayName: 'Target', icon: '🎯', impactProgramId: null },
      { name: 'bestbuy', displayName: 'Best Buy', icon: '💻', impactProgramId: null },
      { name: 'homedepot', displayName: 'Home Depot', icon: '🔨', impactProgramId: null },
      { name: 'lowes', displayName: 'Lowe\'s', icon: '🏠', impactProgramId: null },
      { name: 'macys', displayName: 'Macy\'s', icon: '👗', impactProgramId: null },
      { name: 'nordstrom', displayName: 'Nordstrom', icon: '👔', impactProgramId: null },
      { name: 'costco', displayName: 'Costco', icon: '🛒', impactProgramId: null },
      { name: 'samsclub', displayName: 'Sam\'s Club', icon: '🏢', impactProgramId: null }
    ];

    const created = [];
    const skipped = [];

    for (const brandData of popularBrands) {
      try {
        // Check if brand already exists
        const existing = await prisma.brandConfig.findFirst({
          where: { name: brandData.name }
        });

        if (existing) {
          skipped.push(brandData.name);
          continue;
        }

        // Create new brand
        const brand = await prisma.brandConfig.create({
          data: {
            name: brandData.name,
            displayName: brandData.displayName,
            impactAccountSid: process.env.IMPACT_ACCOUNT_SID || '',
            impactAuthToken: process.env.IMPACT_AUTH_TOKEN || '',
            impactProgramId: brandData.impactProgramId,
            defaultCommissionRate: 0.05, // 5% default
            isActive: true,
            settings: {
              icon: brandData.icon,
              description: `Affiliate program for ${brandData.displayName}`
            }
          }
        });

        created.push(brand);
      } catch (error) {
        console.error(`❌ [V2] Error creating brand ${brandData.name}:`, error);
        skipped.push(brandData.name);
      }
    }

    res.json({
      success: true,
      message: `Created ${created.length} brands, skipped ${skipped.length}`,
      data: { created, skipped }
    });

  } catch (error) {
    console.error('❌ [V2] Error creating popular brands for creator:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create popular brands',
      error: error.message
    });
  }
});

module.exports = router;
