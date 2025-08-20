const express = require('express');
const { getPrisma } = require('../utils/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { calculateTotalEarnings, calculateMonthlyPayoutSummary, BUSINESS_RULES } = require('../utils/commissionCalculator');
const router = express.Router();
const prisma = getPrisma();

router.get('/creator/:id', requireAuth, async (req, res) => {
  if (!prisma) return res.json({ clicks: 0, conversions: 0, revenue: 0, earnings: 0 });
  
  try {
    const creatorId = req.params.id;
    
    // Check if user can access this creator's data
    if (req.user.role !== 'ADMIN' && req.user.id !== creatorId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get creator data
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: { id: true, name: true, email: true, commissionRate: true, salesBonus: true }
    });
    
    if (!creator) {
      return res.status(404).json({ message: 'Creator not found' });
    }
    
    // Get link analytics
    const linkAgg = await prisma.link.aggregate({
      where: { creatorId },
      _sum: { clicks: true, conversions: true, revenue: true },
      _count: { id: true }
    });
    
    // Get earnings breakdown
    const earnings = await prisma.earning.findMany({
      where: { creatorId },
      orderBy: { createdAt: 'desc' }
    });
    
    // Calculate total earnings using commission calculator
    const earningsData = {
      commissions: earnings.filter(e => e.type === 'COMMISSION'),
      salesBonuses: earnings.filter(e => e.type === 'SALES_BONUS'),
      referralBonuses: earnings.filter(e => e.type === 'REFERRAL_BONUS'),
      creatorCommissionRate: creator.commissionRate
    };
    
    const totalEarnings = calculateTotalEarnings(earningsData);
    
    // Get recent earnings (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentEarnings = await prisma.earning.findMany({
      where: {
        creatorId,
        createdAt: { gte: thirtyDaysAgo }
      }
    });
    
    const recentEarningsData = {
      commissions: recentEarnings.filter(e => e.type === 'COMMISSION'),
      salesBonuses: recentEarnings.filter(e => e.type === 'SALES_BONUS'),
      referralBonuses: recentEarnings.filter(e => e.type === 'REFERRAL_BONUS'),
      creatorCommissionRate: creator.commissionRate
    };
    
    const last30DaysEarnings = calculateTotalEarnings(recentEarningsData);
    
    res.json({
      creator: {
        id: creator.id,
        name: creator.name,
        email: creator.email,
        commissionRate: creator.commissionRate
      },
      links: {
        total: linkAgg._count.id || 0,
        clicks: linkAgg._sum.clicks || 0,
        conversions: linkAgg._sum.conversions || 0
      },
      salesMetrics: {
        grossSales: Number(linkAgg._sum.revenue || 0), // All sales from Impact.com
        commissionableEarnings: totalEarnings.breakdown.commissions.net, // Only commission-generating sales
        averageCommissionRate: creator.commissionRate,
        platformShare: totalEarnings.breakdown.commissions.gross - totalEarnings.breakdown.commissions.net
      },
      earnings: {
        total: totalEarnings.totalEarnings,
        breakdown: totalEarnings.breakdown,
        eligibleForPayout: totalEarnings.eligibleForPayout,
        minimumPayout: BUSINESS_RULES.MINIMUM_PAYOUT
      },
      recentPerformance: {
        last30Days: last30DaysEarnings.totalEarnings,
        breakdown: last30DaysEarnings.breakdown
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Creator analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/platform', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.json({ creators: 0, links: 0, clicks: 0, conversions: 0, revenue: 0 });
  
  try {
    // Get basic platform statistics
    const [creatorCount, linkCount, linkAgg, shortLinkAgg] = await Promise.all([
      prisma.creator.count(),
      prisma.link.count(),
      prisma.link.aggregate({ _sum: { conversions: true, revenue: true } }),
      prisma.shortLink.aggregate({ _sum: { clicks: true } }),
    ]);
    
    // Combine click data from ShortLink table (where clicks are actually tracked)
    const combinedAgg = {
      _sum: {
        clicks: shortLinkAgg._sum.clicks || 0,
        conversions: linkAgg._sum.conversions || 0,
        revenue: linkAgg._sum.revenue || 0
      }
    };
    
    // Get all earnings for platform revenue calculation
    const allEarnings = await prisma.earning.findMany({
      where: { status: { in: ['PENDING', 'COMPLETED'] } },
      select: { amount: true, type: true, status: true, createdAt: true }
    });
    
    // Calculate platform-wide earnings summary
    const monthlySummary = calculateMonthlyPayoutSummary(allEarnings);
    
    // Get creators by status
    const creatorsByStatus = await prisma.creator.groupBy({
      by: ['applicationStatus'],
      _count: { id: true }
    });
    
    const statusBreakdown = {};
    creatorsByStatus.forEach(item => {
      statusBreakdown[item.applicationStatus] = item._count.id;
    });
    
    // Get earnings by type
    const earningsByType = await prisma.earning.groupBy({
      by: ['type', 'status'],
      _sum: { amount: true },
      _count: { id: true }
    });
    
    const earningsBreakdown = {
      COMMISSION: { total: 0, count: 0 },
      SALES_BONUS: { total: 0, count: 0 },
      REFERRAL_BONUS: { total: 0, count: 0 }
    };
    
    earningsByType.forEach(item => {
      if (earningsBreakdown[item.type]) {
        earningsBreakdown[item.type].total += parseFloat(item._sum.amount || 0);
        earningsBreakdown[item.type].count += item._count.id;
      }
    });
    
    // Get recent performance (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentStats = await Promise.all([
      prisma.creator.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.link.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.earning.aggregate({ 
        where: { createdAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true }
      })
    ]);
    
    res.json({
      overview: {
        creators: creatorCount,
        links: linkCount,
        clicks: combinedAgg._sum.clicks || 0,
        conversions: combinedAgg._sum.conversions || 0
      },
      salesMetrics: {
        grossSales: Number(linkAgg._sum.revenue || 0), // All sales from Impact.com
        commissionableEarnings: monthlySummary.totalCreatorPayouts, // Only commission-generating earnings
        nonCommissionableSales: Number(linkAgg._sum.revenue || 0) - (monthlySummary.totalCreatorPayouts / 0.7), // Estimated non-commission sales
        platformRevenue: monthlySummary.totalPlatformRevenue
      },
      earnings: {
        totalPlatformRevenue: monthlySummary.totalPlatformRevenue,
        totalCreatorPayouts: monthlySummary.totalCreatorPayouts,
        eligibleCreators: monthlySummary.eligibleCreators,
        pendingAmount: monthlySummary.pendingAmount,
        breakdown: earningsBreakdown
      },
      creators: {
        total: creatorCount,
        byStatus: statusBreakdown
      },
      recentActivity: {
        newCreators: recentStats[0],
        newLinks: recentStats[1],
        newEarnings: parseFloat(recentStats[2]._sum.amount || 0)
      },
      businessMetrics: {
        platformFeePercentage: BUSINESS_RULES.PLATFORM_FEE_PERCENTAGE,
        defaultCommissionRate: BUSINESS_RULES.DEFAULT_CREATOR_COMMISSION,
        minimumPayout: BUSINESS_RULES.MINIMUM_PAYOUT
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Platform analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/referrals', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.json({ count: 0, amount: 0 });
  const count = await prisma.referralEarning.count();
  const agg = await prisma.referralEarning.aggregate({ _sum: { amount: true } });
  res.json({ count, amount: Number(agg._sum.amount || 0) });
});

router.get('/payments', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.json({ pending: 0, completed: 0, cancelled: 0 });
  
  try {
    // Get earnings by status (using correct enum values from schema)
    const [pending, completed, cancelled] = await Promise.all([
      prisma.earning.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true }, _count: { id: true } }),
      prisma.earning.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true }, _count: { id: true } }),
      prisma.earning.aggregate({ where: { status: 'CANCELLED' }, _sum: { amount: true }, _count: { id: true } }),
    ]);
    
    // Get payout requests by status
    const payoutRequests = await prisma.payoutRequest.groupBy({
      by: ['status'],
      _sum: { amount: true },
      _count: { id: true }
    });
    
    const payoutBreakdown = {};
    payoutRequests.forEach(item => {
      payoutBreakdown[item.status] = {
        amount: parseFloat(item._sum.amount || 0),
        count: item._count.id
      };
    });
    
    // Get creators eligible for payout
    const creatorsWithEarnings = await prisma.earning.groupBy({
      by: ['creatorId'],
      where: { status: 'COMPLETED' },
      _sum: { amount: true }
    });
    
    const eligibleCreatorsCount = creatorsWithEarnings.filter(
      creator => parseFloat(creator._sum.amount || 0) >= BUSINESS_RULES.MINIMUM_PAYOUT
    ).length;
    
    res.json({
      earnings: {
        pending: {
          amount: Number(pending._sum.amount || 0),
          count: pending._count.id || 0
        },
        completed: {
          amount: Number(completed._sum.amount || 0),
          count: completed._count.id || 0
        },
        cancelled: {
          amount: Number(cancelled._sum.amount || 0),
          count: cancelled._count.id || 0
        }
      },
      payoutRequests: payoutBreakdown,
      eligibility: {
        eligibleCreators: eligibleCreatorsCount,
        minimumPayout: BUSINESS_RULES.MINIMUM_PAYOUT,
        totalCreatorsWithEarnings: creatorsWithEarnings.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Payment analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;





