const express = require('express');
const { getPrisma } = require('../utils/prisma');
const router = express.Router();
const prisma = getPrisma();

router.get('/s/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  if (!prisma) return res.status(501).send('Shortlink storage not configured');
  const short = await prisma.shortLink.findUnique({ where: { shortCode } });
  if (!short || !short.destinationUrl) return res.status(404).send('Not found');
  await prisma.shortLink.update({ where: { shortCode }, data: { clicks: { increment: 1 } } });
  try {
    await prisma.clickLog.create({ data: { shortCode, ip: req.ip, userAgent: req.headers['user-agent'] || '', referrer: req.headers.referer || '' } });
  } catch {}
  res.redirect(short.destinationUrl);
});

router.get('/:shortCode', async (req, res) => {
  if (!prisma) return res.status(404).json({ message: 'Not found' });
  const short = await prisma.shortLink.findUnique({ where: { shortCode: req.params.shortCode } });
  if (!short) return res.status(404).json({ message: 'Not found' });
  res.json(short);
});

router.post('/', async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  const { shortCode, destinationUrl, creatorId } = req.body;
  const created = await prisma.shortLink.create({ data: { shortCode, destinationUrl, creatorId } });
  res.status(201).json(created);
});

router.get('/:shortCode/stats', async (req, res) => {
  if (!prisma) return res.status(404).json({ message: 'Not found' });
  const short = await prisma.shortLink.findUnique({ where: { shortCode: req.params.shortCode } });
  if (!short) return res.status(404).json({ message: 'Not found' });
  res.json({ clicks: short.clicks, createdAt: short.createdAt });
});

module.exports = router;


