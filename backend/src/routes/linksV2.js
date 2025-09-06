const express = require('express');
const { getPrisma } = require('../utils/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const LinkGeneratorV2 = require('../services/linkGeneratorV2');

const router = express.Router();
const prisma = getPrisma();
const linkGenerator = new LinkGeneratorV2();

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

module.exports = router;
