const express = require('express');
const { getPrisma } = require('../utils/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();
const prisma = getPrisma();

router.get('/creators', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  
  try {
    // Get all creators with basic info
    const creators = await prisma.creator.findMany({ 
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        commissionRate: true,
        applicationStatus: true,
        createdAt: true
      }
    });
    
    // Enrich creators with performance data
    const enrichedCreators = await Promise.all(creators.map(async (creator) => {
      // Get creator's short links and click data
      const shortLinkStats = await prisma.shortLink.aggregate({
        where: { creatorId: creator.id },
        _sum: { clicks: true },
        _count: { id: true }
      });
      
      // Get creator's links and revenue data
      const linkStats = await prisma.link.aggregate({
        where: { creatorId: creator.id },
        _sum: { conversions: true, revenue: true },
        _count: { id: true }
      });
      
      return {
        ...creator,
        performance: {
          totalClicks: shortLinkStats._sum.clicks || 0,
          totalLinks: linkStats._count.id || 0,
          totalShortLinks: shortLinkStats._count.id || 0,
          totalConversions: linkStats._sum.conversions || 0,
          totalRevenue: Number(linkStats._sum.revenue || 0)
        }
      };
    }));
    
    res.json({ creators: enrichedCreators });
  } catch (error) {
    console.error('Error fetching creators with performance:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/applications/pending', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  const creators = await prisma.creator.findMany({ where: { applicationStatus: 'PENDING' } });
  res.json({ creators });
});

router.put('/applications/:id/review', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  const { status, commissionRate, salesBonus } = req.body;
  const updated = await prisma.creator.update({
    where: { id: req.params.id },
    data: {
      applicationStatus: status,
      isActive: status === 'APPROVED',
      commissionRate: commissionRate ?? undefined,
      salesBonus: salesBonus ?? undefined,
    },
  });
  res.json({ updated });
});

router.put('/creators/:id/status', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  const updated = await prisma.creator.update({ where: { id: req.params.id }, data: { isActive: !!req.body.isActive } });
  res.json({ updated });
});

router.put('/creators/:id/commission', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  const updated = await prisma.creator.update({ where: { id: req.params.id }, data: { commissionRate: Number(req.body.commissionRate || 70) } });
  res.json({ updated });
});

// Get detailed creator profile for admin view
router.get('/creators/:id/profile', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  
  try {
    const creator = await prisma.creator.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        socialMediaLinks: true,
        groupLinks: true,
        applicationStatus: true,
        isActive: true,
        commissionRate: true,
        salesBonus: true,
        referralCode: true,
        applicationNotes: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!creator) {
      return res.status(404).json({ message: 'Creator not found' });
    }
    
    res.json({ creator });
  } catch (error) {
    console.error('Error fetching creator profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  
  try {
    // Get basic counts
    const [creatorCount, linkCount, shortLinkCount] = await Promise.all([
      prisma.creator.count(),
      prisma.link.count(),
      prisma.shortLink.count(),
    ]);
    
    // Get click data from ShortLink table (where clicks are actually tracked)
    const shortLinkStats = await prisma.shortLink.aggregate({
      _sum: { clicks: true },
      _count: { id: true }
    });
    
    // Get sample short links with click data
    const sampleShortLinks = await prisma.shortLink.findMany({
      take: 5,
      orderBy: { clicks: 'desc' },
      select: {
        shortCode: true,
        clicks: true,
        createdAt: true,
        creator: {
          select: { name: true, email: true }
        }
      }
    });
    
    res.json({ 
      creatorCount, 
      linkCount, 
      shortLinkCount,
      clickStats: {
        totalClicks: shortLinkStats._sum.clicks || 0,
        totalShortLinks: shortLinkStats._count.id || 0
      },
      sampleShortLinks
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Failed to load stats', error: error.message });
  }
});

router.get('/actions', requireAuth, requireAdmin, async (req, res) => { res.json({ actions: [] }); });

// Payout processing (approve/reject)
router.post('/payouts', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  const { creatorId, amount } = req.body || {}
  if (!creatorId || !amount) return res.status(400).json({ message: 'creatorId and amount required' })
  const pr = await prisma.payoutRequest.create({ data: { creatorId, amount } })
  res.status(201).json(pr)
});

router.get('/payouts', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  const where = {};
  if (req.query.status) where.status = req.query.status;
  const payouts = await prisma.payoutRequest.findMany({ where, orderBy: { requestedAt: 'desc' } });
  res.json({ payouts });
});

router.put('/payouts/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  const pr = await prisma.payoutRequest.update({ where: { id: req.params.id }, data: { status: 'COMPLETED', processedAt: new Date() } })
  res.json(pr)
});

router.put('/payouts/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  const pr = await prisma.payoutRequest.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } })
  res.json(pr)
});

// Admin endpoint to sync earnings from Impact.com
router.post('/sync-earnings', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  
  try {
    const { EarningsSync } = require('../services/earningsSync');
    const earningsSync = new EarningsSync();
    
    console.log('🔄 Admin initiated earnings sync from Impact.com...');
    
    // Test connection first
    const connectionTest = await earningsSync.testConnection();
    if (!connectionTest.connected) {
      return res.status(503).json({ 
        message: 'Impact.com API connection failed',
        error: connectionTest.error
      });
    }
    
    // Run the sync
    const syncOptions = {
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
    };
    
    const result = await earningsSync.syncEarningsToDatabase(syncOptions);
    
    console.log('✅ Earnings sync completed:', result);
    
    res.json({
      success: true,
      message: 'Earnings sync completed successfully',
      stats: result.stats,
      duration: result.duration,
      apiConnection: connectionTest,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Admin earnings sync error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Earnings sync failed',
      error: error.message
    });
  }
});

// Admin endpoint to assign sales bonus to creators (bulk or individual)
router.post('/assign-sales-bonus', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  
  try {
    const { amount, mode = 'set', criteria = {} } = req.body;
    
    // Validate amount
    if (!amount || isNaN(amount) || parseFloat(amount) < 0) {
      return res.status(400).json({ message: 'Valid amount is required (must be positive number)' });
    }
    
    const bonusAmount = parseFloat(amount);
    
    // Build filter criteria for which creators to update
    const whereClause = {
      // Default: only active, approved creators
      isActive: true,
      applicationStatus: 'APPROVED',
      // Add any additional criteria from request
      ...criteria
    };
    
    // Get creators that match criteria
    const matchingCreators = await prisma.creator.findMany({
      where: whereClause,
      select: { id: true, email: true, name: true, salesBonus: true }
    });
    
    if (matchingCreators.length === 0) {
      return res.status(400).json({ 
        message: 'No creators match the specified criteria',
        criteria: whereClause
      });
    }
    
    // Update sales bonus based on mode
    let updateData;
    if (mode === 'set') {
      // Set to exact amount
      updateData = { salesBonus: bonusAmount };
    } else if (mode === 'add') {
      // Add to existing bonus
      updateData = { salesBonus: { increment: bonusAmount } };
    } else {
      return res.status(400).json({ message: 'Mode must be "set" or "add"' });
    }
    
    // Perform bulk update
    const updateResult = await prisma.creator.updateMany({
      where: whereClause,
      data: updateData
    });
    
    console.log(`💰 Admin assigned $${bonusAmount} sales bonus to ${updateResult.count} creators (mode: ${mode})`);
    
    // Get updated creators for response
    const updatedCreators = await prisma.creator.findMany({
      where: { id: { in: matchingCreators.map(c => c.id) } },
      select: { id: true, email: true, name: true, salesBonus: true }
    });
    
    res.json({
      success: true,
      message: `Sales bonus assigned to ${updateResult.count} creators`,
      operation: {
        mode,
        amount: bonusAmount,
        affectedCreators: updateResult.count,
        criteria: whereClause
      },
      updatedCreators: updatedCreators.map(creator => ({
        id: creator.id,
        name: creator.name,
        email: creator.email,
        newSalesBonus: parseFloat(creator.salesBonus)
      })),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Admin sales bonus assignment error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to assign sales bonus',
      error: error.message
    });
  }
});

// Admin endpoint to get earnings summary
router.get('/earnings-summary', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  
  try {
    const { EarningsSync } = require('../services/earningsSync');
    const { calculateMonthlyPayoutSummary } = require('../utils/commissionCalculator');
    
    const earningsSync = new EarningsSync();
    
    // Get earnings summary
    const summaryOptions = {
      startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : 50
    };
    
    const summary = await earningsSync.getEarningsSummary(summaryOptions);
    
    // Get all earnings for monthly calculation
    const allEarnings = await prisma.earning.findMany({
      where: {
        status: { in: ['PENDING', 'COMPLETED'] },
        ...(summaryOptions.startDate || summaryOptions.endDate ? {
          createdAt: {
            ...(summaryOptions.startDate ? { gte: summaryOptions.startDate } : {}),
            ...(summaryOptions.endDate ? { lte: summaryOptions.endDate } : {})
          }
        } : {})
      },
      select: { amount: true, creatorId: true, type: true, status: true }
    });
    
    const monthlyPayouts = calculateMonthlyPayoutSummary(allEarnings);
    
    res.json({
      summary,
      monthlyPayouts,
      query: summaryOptions,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Admin earnings summary error:', error);
    res.status(500).json({ 
      message: 'Failed to get earnings summary',
      error: error.message
    });
  }
});

// GET all creator payment accounts for admin
router.get('/payment-accounts', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Admin payment accounts endpoint called');
    
    const prisma = getPrisma();
    if (!prisma) {
      console.log('❌ No Prisma client available');
      return res.status(503).json({ message: 'Database not configured' });
    }
    
    console.log('✅ Prisma client available, querying payment accounts...');
    
    const paymentAccounts = await prisma.paymentAccount.findMany({
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('✅ Payment accounts query successful, found:', paymentAccounts.length);
    
    // Map schema enum values back to frontend values for display
    const formattedAccounts = paymentAccounts.map(account => {
      const frontendTypeMapping = {
        'BANK_ACCOUNT': 'Bank Transfer',
        'PAYPAL': 'PayPal', 
        'CRYPTO_WALLET': 'Cryptocurrency'
      };
      
      return {
        id: account.id,
        creatorId: account.creatorId,
        creator: account.creator,
        type: frontendTypeMapping[account.accountType] || account.accountType,
        accountDetails: account.accountDetails,
        isVerified: account.isVerified || false,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      };
    });
    
    console.log('✅ Formatted accounts successfully');
    res.json({ paymentAccounts: formattedAccounts });
  } catch (error) {
    console.error('❌ Failed to fetch payment accounts:', error);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    res.status(500).json({ message: 'Failed to fetch payment accounts', error: error.message });
  }
});

// GET comprehensive creator profile for admin
router.get('/creators/:id/profile', requireAuth, requireAdmin, async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });
    
    const creatorId = req.params.id;
    
    // Get creator with all related data
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      include: {
        paymentAccount: true,
        links: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Latest 10 links
        },
        earnings: {
          orderBy: { createdAt: 'desc' },
          take: 20 // Latest 20 earnings
        },
        referralsGiven: {
          include: {
            referred: {
              select: { name: true, email: true }
            }
          }
        },
        payouts: {
          orderBy: { requestedAt: 'desc' }
        }
      }
    });
    
    if (!creator) {
      return res.status(404).json({ message: 'Creator not found' });
    }
    
    // Calculate performance metrics
    const totalEarnings = creator.earnings.reduce((sum, earning) => sum + Number(earning.amount), 0);
    const totalClicks = creator.links.reduce((sum, link) => sum + (link.clicks || 0), 0);
    const totalConversions = creator.links.reduce((sum, link) => sum + (link.conversions || 0), 0);
    
    // Format payment account
    let paymentDetails = null;
    if (creator.paymentAccount) {
      const frontendTypeMapping = {
        'BANK_ACCOUNT': 'Bank Transfer',
        'PAYPAL': 'PayPal', 
        'CRYPTO_WALLET': 'Cryptocurrency'
      };
      
      paymentDetails = {
        id: creator.paymentAccount.id,
        type: frontendTypeMapping[creator.paymentAccount.accountType] || creator.paymentAccount.accountType,
        accountDetails: creator.paymentAccount.accountDetails,
        isVerified: creator.paymentAccount.isVerified || false,
        createdAt: creator.paymentAccount.createdAt,
        updatedAt: creator.paymentAccount.updatedAt
      };
    }
    
    // Calculate referral earnings
    const referralEarnings = await prisma.referralEarning.findMany({
      where: { referrerId: creatorId }
    });
    const totalReferralEarnings = referralEarnings.reduce((sum, earning) => sum + Number(earning.amount), 0);
    
    res.json({
      creator: {
        id: creator.id,
        name: creator.name,
        email: creator.email,
        bio: creator.bio,
        socialMediaLinks: creator.socialMediaLinks,
        groupLinks: creator.groupLinks,
        isActive: creator.isActive,
        commissionRate: creator.commissionRate,
        applicationStatus: creator.applicationStatus,
        referralCode: creator.referralCode,
        walletAddress: creator.walletAddress,
        applicationNotes: creator.applicationNotes,
        rejectionReason: creator.rejectionReason,
        createdAt: creator.createdAt,
        updatedAt: creator.updatedAt
      },
      paymentDetails,
      performance: {
        totalEarnings,
        totalReferralEarnings,
        totalClicks,
        totalConversions,
        conversionRate: totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : 0,
        linksCount: creator.links.length,
        referralsCount: creator.referralsGiven.length
      },
      recentLinks: creator.links,
      recentEarnings: creator.earnings,
      referrals: creator.referralsGiven,
      payoutRequests: creator.payouts
    });
  } catch (error) {
    console.error('Failed to fetch creator profile:', error);
    res.status(500).json({ message: 'Failed to fetch creator profile', error: error.message });
  }
});

// Admin endpoint to delete a creator completely
router.delete('/creators/:id', requireAuth, requireAdmin, async (req, res) => {
  const prisma = getPrisma();
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });

  try {
    const creatorId = req.params.id;
    
    // Check if creator exists
    const creator = await prisma.creator.findUnique({ where: { id: creatorId } });
    if (!creator) {
      return res.status(404).json({ message: 'Creator not found' });
    }

    // Delete all related data first (to handle foreign key constraints)
    await prisma.$transaction(async (tx) => {
      // Delete earnings
      await tx.earning.deleteMany({ where: { creatorId } });
      
      // Delete referral earnings
      await tx.referralEarning.deleteMany({ where: { creatorId } });
      
      // Delete payment accounts
      await tx.paymentAccount.deleteMany({ where: { creatorId } });
      
      // Delete payout requests
      await tx.payoutRequest.deleteMany({ where: { creatorId } });
      
      // Delete short links
      await tx.shortLink.deleteMany({ where: { creatorId } });
      
      // Delete links
      await tx.link.deleteMany({ where: { creatorId } });
      
      // Delete refresh tokens
      await tx.refreshToken.deleteMany({ where: { creatorId } });
      
      // Finally delete the creator
      await tx.creator.delete({ where: { id: creatorId } });
    });

    res.json({ 
      message: 'Creator and all associated data deleted successfully',
      deletedCreator: {
        id: creator.id,
        name: creator.name,
        email: creator.email
      }
    });
  } catch (error) {
    console.error('Error deleting creator:', error);
    res.status(500).json({ 
      message: 'Failed to delete creator', 
      error: error.message 
    });
  }
});

module.exports = router;





