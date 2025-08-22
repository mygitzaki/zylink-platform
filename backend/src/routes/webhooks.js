const express = require('express');
const { getPrisma } = require('../utils/prisma');
const router = express.Router();
const prisma = getPrisma();

router.post('/impact-conversion', async (req, res) => {
  // TODO: verify signature if provided
  const { linkId, amount, transactionId, shortCode, creatorId } = req.body || {};
  if (amount == null) return res.status(400).json({ message: 'Missing amount' });
  if (!prisma) return res.status(202).json({ message: 'Accepted (no DB configured)' });

  try {
    let link = null;
    let resolvedCreatorId = creatorId || null;

    if (linkId) {
      link = await prisma.link.findUnique({ where: { id: linkId } });
      if (!link) return res.status(404).json({ message: 'Link not found' });
      resolvedCreatorId = link.creatorId;
    } else if (shortCode) {
      const sl = await prisma.shortLink.findUnique({ where: { shortCode } });
      if (!sl) return res.status(404).json({ message: 'Short link not found' });
      resolvedCreatorId = sl.creatorId;
      link = await prisma.link.findFirst({ where: { shortLink: { contains: shortCode } } });
    } else if (!resolvedCreatorId) {
      return res.status(400).json({ message: 'Missing linkId, shortCode, or creatorId' });
    }

    // Idempotency: if an earning with this transaction already exists, accept silently
    if (transactionId) {
      const existing = await prisma.earning.findFirst({ where: { impactTransactionId: transactionId } });
      if (existing) return res.status(202).json({ message: 'Already processed' });
    }

    const creator = await prisma.creator.findUnique({ where: { id: resolvedCreatorId } });
    const baseCommission = Number(amount);
    const creatorRate = (creator?.commissionRate ?? 70) / 100;
    const creatorAmount = +(baseCommission * creatorRate).toFixed(2);

    // Update link aggregates
    if (link?.id) {
      await prisma.link.update({ where: { id: link.id }, data: { conversions: { increment: 1 }, revenue: { increment: baseCommission } } });
    }

    // Record creator commission
    await prisma.earning.create({
      data: {
        creatorId: resolvedCreatorId,
        linkId: link?.id || null,
        amount: creatorAmount,
        type: 'COMMISSION',
        status: 'PENDING',
        impactTransactionId: transactionId || null,
      },
    });

    // Referral bonus: 10% of creatorAmount within active window
    const now = new Date();
    const referral = await prisma.referralEarning.findFirst({
      where: {
        referredId: link.creatorId,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
    if (referral) {
      const bonus = +(creatorAmount * 0.10).toFixed(2);
      await prisma.earning.create({
        data: {
          creatorId: referral.referrerId,
          linkId: link?.id || null,
          amount: bonus,
          type: 'REFERRAL_BONUS',
          status: 'PENDING',
          impactTransactionId: transactionId || null,
        },
      });
      await prisma.referralEarning.update({ where: { id: referral.id }, data: { amount: { increment: bonus } } });
    }

    return res.status(202).json({ message: 'Accepted' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.post('/impact-click', async (req, res) => {
  const { shortCode } = req.body || {};
  if (!shortCode) return res.status(400).json({ message: 'Missing fields' });
  if (!prisma) return res.status(202).json({ message: 'Accepted (no DB configured)' });
  const short = await prisma.shortLink.findUnique({ where: { shortCode } });
  if (short) await prisma.shortLink.update({ where: { shortCode }, data: { clicks: { increment: 1 } } });
  res.status(202).json({ message: 'Accepted' });
});

router.post('/commission', async (req, res) => {
  res.status(202).json({ message: 'Accepted' });
});

module.exports = router;





