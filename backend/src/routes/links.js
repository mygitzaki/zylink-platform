const express = require('express');
const { getPrisma } = require('../utils/prisma');
const { ImpactWebService } = require('../services/impactWebService');
const { LinkShortener } = require('../services/linkShortener');
const { QRCodeService } = require('../services/qrcodeService');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = getPrisma();

// GET /api/links - List all links for the authenticated creator
router.get('/', requireAuth, async (req, res) => {
  try {
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });
    
    const links = await prisma.link.findMany({
      where: { creatorId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        shortLinks: true
      }
    });
    
    res.json({ links });
  } catch (err) {
    console.error('Error fetching links:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { destinationUrl } = req.body;
    if (!destinationUrl) return res.status(400).json({ message: 'destinationUrl required' });
    const impact = new ImpactWebService();
    const shortener = new LinkShortener();
    const qr = new QRCodeService();

    // Try to create real Impact.com tracking link first
    let impactLink;
    try {
      const trackingResult = await impact.createTrackingLink(destinationUrl, req.user.id);
      impactLink = trackingResult.trackingUrl || trackingResult.impactLink;
      console.log('✅ Real Impact.com link created:', impactLink);
    } catch (error) {
      console.warn('⚠️ Impact.com API failed, using fallback:', error.message);
      // Fallback to manual link construction
      impactLink = impact.generateWorkingLinkFormat(null, req.user.id, destinationUrl);
    }
    
    let { shortCode, shortLink } = shortener.createShortLink(impactLink, req.user.id); // Use impactLink for shortening
    // Skip QR code generation as requested
    const qrCodeUrl = null;

    if (!prisma) return res.status(503).json({ message: 'Database not configured' });
    // Insert with collision retry
    let attempts = 0;
    let createdShort = null;
    while (attempts < 5) {
      try {
        createdShort = await prisma.shortLink.create({ data: { shortCode, destinationUrl, creatorId: req.user.id } });
        break;
      } catch (e) {
        if (e.code === 'P2002') {
          // collision on unique shortCode → regenerate
          const next = shortener.createShortLink(destinationUrl, req.user.id);
          shortLink = next.shortLink;
          shortCode = next.shortCode;
          attempts++;
          continue;
        }
        throw e;
      }
    }
    const link = await prisma.link.create({
      data: { creatorId: req.user.id, destinationUrl, impactLink, shortLink, qrCodeUrl },
    });
    res.status(201).json({ link });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  const link = await prisma.link.findUnique({ where: { id: req.params.id } });
  if (!link) return res.status(404).json({ message: 'Not found' });
  if (link.creatorId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
  res.json({ link });
});

router.put('/:id', requireAuth, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  const existing = await prisma.link.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: 'Not found' });
  if (existing.creatorId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
  const updated = await prisma.link.update({
    where: { id: req.params.id },
    data: { isActive: req.body.isActive ?? existing.isActive },
  });
  res.json({ link: updated });
});

router.delete('/:id', requireAuth, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  const existing = await prisma.link.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: 'Not found' });
  if (existing.creatorId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
  await prisma.link.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

router.get('/:id/analytics', requireAuth, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  const link = await prisma.link.findUnique({ where: { id: req.params.id } });
  if (!link) return res.status(404).json({ message: 'Not found' });
  if (link.creatorId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
  res.json({ clicks: link.clicks, conversions: link.conversions, revenue: link.revenue });
});

router.get('/:id/clicks', requireAuth, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  const link = await prisma.link.findUnique({ where: { id: req.params.id } });
  if (!link) return res.status(404).json({ message: 'Not found' });
  if (link.creatorId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
  res.json({ clicks: link.clicks });
});

router.get('/:id/conversions', requireAuth, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  const link = await prisma.link.findUnique({ where: { id: req.params.id } });
  if (!link) return res.status(404).json({ message: 'Not found' });
  if (link.creatorId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
  res.json({ conversions: link.conversions });
});

module.exports = router;





