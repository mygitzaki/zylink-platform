const express = require('express');
const { getPrisma } = require('../utils/prisma');
const router = express.Router();
const prisma = getPrisma();

router.get('/s/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  if (!prisma) return res.status(501).send('Shortlink storage not configured');
  
  // Try V1 short link first
  let short = await prisma.shortLink.findUnique({ where: { shortCode } });
  
  // If not found in V1, try V2 short link
  if (!short) {
    short = await prisma.shortLinkV2.findUnique({ where: { shortCode } });
    if (short) {
      // Convert V2 format to V1 format for compatibility
      short = {
        id: short.id,
        shortCode: short.shortCode,
        originalUrl: short.originalUrl,
        clicks: short.clicks
      };
    }
  }
  
  if (!short || !short.originalUrl) return res.status(404).send('Not found');
  
  // Update clicks
  if (short.id) {
    try {
      // Try V1 table first
      await prisma.shortLink.update({ where: { shortCode }, data: { clicks: { increment: 1 } } });
    } catch {
      // If V1 fails, try V2 table
      try {
        await prisma.shortLinkV2.update({ where: { shortCode }, data: { clicks: { increment: 1 } } });
      } catch (error) {
        console.warn('Could not update click count:', error.message);
      }
    }
  }
  
  // Log click
  try {
    await prisma.clickLog.create({ data: { shortLinkId: short.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] || '', referrer: req.headers.referer || '' } });
  } catch {}
  
  res.redirect(short.originalUrl);
});

router.get('/:shortCode', async (req, res) => {
  if (!prisma) return res.status(404).json({ message: 'Not found' });
  const short = await prisma.shortLink.findUnique({ where: { shortCode: req.params.shortCode } });
  if (!short) return res.status(404).json({ message: 'Not found' });
  res.json(short);
});

router.post('/', async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  const { shortCode, originalUrl, creatorId } = req.body;
  const created = await prisma.shortLink.create({ data: { shortCode, originalUrl, creatorId } });
  res.status(201).json(created);
});

router.get('/:shortCode/stats', async (req, res) => {
  if (!prisma) return res.status(404).json({ message: 'Not found' });
  const short = await prisma.shortLink.findUnique({ where: { shortCode: req.params.shortCode } });
  if (!short) return res.status(404).json({ message: 'Not found' });
  res.json({ clicks: short.clicks, createdAt: short.createdAt });
});

// Debug endpoint to check if a short code exists in V1 or V2
router.get('/debug/:shortCode', async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  
  const { shortCode } = req.params;
  
  try {
    // Check V1 table
    const v1Short = await prisma.shortLink.findUnique({ 
      where: { shortCode },
      select: { id: true, shortCode: true, originalUrl: true, clicks: true, createdAt: true }
    });
    
    // Check V2 table
    const v2Short = await prisma.shortLinkV2.findUnique({ 
      where: { shortCode },
      select: { id: true, shortCode: true, originalUrl: true, clicks: true, createdAt: true }
    });
    
    res.json({
      shortCode,
      v1: v1Short,
      v2: v2Short,
      found: !!(v1Short || v2Short)
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


