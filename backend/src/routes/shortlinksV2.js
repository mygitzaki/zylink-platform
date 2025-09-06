const express = require('express');
const { getPrisma } = require('../utils/prisma');

const router = express.Router();
const prisma = getPrisma();

// V2 Short link redirect handler
router.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    
    console.log(`🔗 [V2] Short link lookup: ${shortCode}`);
    
    if (!prisma) {
      console.log('⚠️ [V2] Database not available, redirecting to fallback');
      return res.redirect('https://www.zylike.com');
    }

    // Find short link with brand information
    const shortLink = await prisma.shortLinkV2.findUnique({
      where: { shortCode },
      include: {
        brand: true,
        link: true
      }
    });

    if (!shortLink || !shortLink.originalUrl) {
      console.log(`❌ [V2] Short link not found: ${shortCode}`);
      return res.status(404).send('Link not found');
    }

    console.log(`✅ [V2] Short link found: ${shortCode} -> ${shortLink.originalUrl}`);

    // Determine redirect URL
    let redirectUrl = shortLink.originalUrl;
    
    if (shortLink.impactLink) {
      redirectUrl = shortLink.impactLink;
      console.log(`🎯 [V2] Using Impact.com tracking link`);
    } else {
      console.log(`⚠️ [V2] No Impact.com link, using original URL`);
    }

    // Update click count
    await prisma.shortLinkV2.update({
      where: { shortCode },
      data: { clicks: { increment: 1 } }
    });

    // Log click (async, don't wait)
    setImmediate(async () => {
      try {
        await prisma.clickLogV2.create({
          data: {
            shortLinkId: shortLink.id,
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || '',
            referrer: req.headers.referer || '',
            country: req.headers['cf-ipcountry'] || null,
            city: req.headers['cf-ipcity'] || null,
            device: req.headers['cf-device-type'] || null,
            browser: req.headers['cf-browser'] || null,
            os: req.headers['cf-os'] || null
          }
        });
      } catch (error) {
        console.warn('⚠️ [V2] Click logging failed:', error.message);
      }
    });

    // Record performance metrics
    try {
      await prisma.performanceMetricsV2.create({
        data: {
          shortLinkId: shortLink.id,
          generationTime: 0, // This is a redirect, not generation
          apiCalls: 0,
          cacheHits: 1,
          errors: 0,
          brandId: shortLink.brandId
        }
      });
    } catch (error) {
      console.warn('⚠️ [V2] Performance metrics logging failed:', error.message);
    }

    console.log(`🔄 [V2] Redirecting to: ${redirectUrl}`);
    res.redirect(redirectUrl);

  } catch (error) {
    console.error(`❌ [V2] Short link redirect error:`, error);
    res.status(500).send('Internal Server Error');
  }
});

// V2 Short link stats (public endpoint)
router.get('/:shortCode/stats', async (req, res) => {
  try {
    const { shortCode } = req.params;
    
    if (!prisma) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database not available' 
      });
    }

    const shortLink = await prisma.shortLinkV2.findUnique({
      where: { shortCode },
      select: {
        clicks: true,
        createdAt: true,
        brand: {
          select: {
            name: true,
            displayName: true
          }
        }
      }
    });

    if (!shortLink) {
      return res.status(404).json({
        success: false,
        message: 'Short link not found'
      });
    }

    res.json({
      success: true,
      data: {
        shortCode,
        clicks: shortLink.clicks,
        createdAt: shortLink.createdAt,
        brand: shortLink.brand
      }
    });

  } catch (error) {
    console.error(`❌ [V2] Short link stats error:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
});

// V2 Short link info (detailed)
router.get('/:shortCode/info', async (req, res) => {
  try {
    const { shortCode } = req.params;
    
    if (!prisma) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database not available' 
      });
    }

    const shortLink = await prisma.shortLinkV2.findUnique({
      where: { shortCode },
      include: {
        brand: true,
        link: true
      }
    });

    if (!shortLink) {
      return res.status(404).json({
        success: false,
        message: 'Short link not found'
      });
    }

    // Get recent click logs
    const recentClicks = await prisma.clickLogV2.findMany({
      where: { shortLinkId: shortLink.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        ipAddress: true,
        userAgent: true,
        referrer: true,
        country: true,
        city: true,
        device: true,
        browser: true,
        os: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      data: {
        shortCode,
        originalUrl: shortLink.originalUrl,
        impactLink: shortLink.impactLink,
        clicks: shortLink.clicks,
        createdAt: shortLink.createdAt,
        brand: shortLink.brand,
        link: shortLink.link,
        recentClicks
      }
    });

  } catch (error) {
    console.error(`❌ [V2] Short link info error:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch link info',
      error: error.message
    });
  }
});

module.exports = router;
