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
    // Only send response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

router.get('/platform', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.json({ creators: 0, links: 0, clicks: 0, conversions: 0, revenue: 0 });
  
  try {
    // Get basic platform statistics
    const [creatorCount, linkCount] = await Promise.all([
      prisma.creator.count(),
      prisma.link.count()
    ]);
    
    // Get Real Platform Analytics from Impact.com (Real Clicks + Commissionable Sales)
    let platformData = { clicks: 0, conversions: 0, revenue: 0 };
    
    try {
      const impact = new OptimizedImpactService();
      
      console.log('[Platform Analytics] Fetching real platform data from Impact.com...');
      
      // Use same date calculation
      const requestedDays = 30; // Default platform view
      const now = new Date();
      const endDate = now.toISOString().split('T')[0];
      const startDate = new Date(now.getTime() - (requestedDays * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
      
      // Get all creators' performance data
      const allPerformanceData = await impact.getPerformanceBySubId({
        startDate,
        endDate
        // No subId1 filter = get all creators
      });
      
      if (allPerformanceData.success && allPerformanceData.data) {
        // Aggregate real clicks and commissionable sales across all creators
        const platformTotals = allPerformanceData.data.reduce((totals, creatorData) => {
          return {
            clicks: totals.clicks + (creatorData.clicks || 0),
            conversions: totals.conversions + (creatorData.actions || 0), // Note: actions in performance report
            revenue: totals.revenue + (creatorData.commission || 0)
          };
        }, { clicks: 0, conversions: 0, revenue: 0 });
        
        // Now get commissionable-only conversions for all creators
        let totalCommissionableConversions = 0;
        let totalCommissionableRevenue = 0;
        
        // Get all creators with Impact SubId1s (simplified query to avoid Prisma issues)
        const creatorsWithSubIds = await prisma.creator.findMany({
          where: {
            isActive: true,
            applicationStatus: 'APPROVED'
          },
          select: { id: true, impactSubId: true, commissionRate: true }
        });
        
        console.log(`[Platform Analytics] Processing ${creatorsWithSubIds.length} creators for commissionable data...`);
        
        // Process in batches to avoid overwhelming the API
        const batchSize = 5;
        for (let i = 0; i < creatorsWithSubIds.length; i += batchSize) {
          const batch = creatorsWithSubIds.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (creator) => {
            try {
              const correctSubId1 = creator.impactSubId || impact.computeObfuscatedSubId(creator.id);
              
              const detailedActions = await impact.getActionsDetailed({
                startDate: startDate + 'T00:00:00Z',
                endDate: endDate + 'T23:59:59Z',
                subId1: correctSubId1,
                actionType: 'SALE',
                pageSize: 500
              });
              
              if (detailedActions.success && detailedActions.actions) {
                const creatorActions = detailedActions.actions.filter(action => 
                  action.SubId1 === correctSubId1
                );
                
                const commissionableActions = creatorActions.filter(action => {
                  const commission = parseFloat(action.Payout || action.Commission || 0);
                  return commission > 0;
                });
                
                const grossRevenue = commissionableActions.reduce((sum, action) => {
                  return sum + parseFloat(action.Payout || action.Commission || 0);
                }, 0);
                
                const businessRate = creator.commissionRate || 70;
                const creatorRevenue = (grossRevenue * businessRate) / 100;
                
                return {
                  commissionableConversions: commissionableActions.length,
                  revenue: creatorRevenue
                };
              }
              
              return { commissionableConversions: 0, revenue: 0 };
            } catch (error) {
              console.log(`[Platform Analytics] Error for creator ${creator.id}: ${error.message}`);
              return { commissionableConversions: 0, revenue: 0 };
            }
          });
          
          const batchResults = await Promise.all(batchPromises);
          
          batchResults.forEach(result => {
            totalCommissionableConversions += result.commissionableConversions;
            totalCommissionableRevenue += result.revenue;
          });
          
          // Small delay between batches
          if (i + batchSize < creatorsWithSubIds.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        platformData = {
          clicks: platformTotals.clicks,
          conversions: totalCommissionableConversions, // Use commissionable only
          revenue: totalCommissionableRevenue
        };
        
        console.log(`[Platform Analytics] ✅ Real platform data:`, {
          clicks: platformData.clicks,
          commissionableConversions: platformData.conversions,
          revenue: platformData.revenue.toFixed(2)
        });
      }
    } catch (impactError) {
      console.log(`[Platform Analytics] Impact.com error, using database fallback: ${impactError.message}`);
    }
    
    // Fallback to database if Impact.com fails
    const hasRealData = platformData.clicks > 0 || platformData.conversions > 0 || platformData.revenue > 0;
    
    let combinedAgg;
    let linkAgg;
    
    if (hasRealData) {
      combinedAgg = {
        _sum: {
          clicks: platformData.clicks,
          conversions: platformData.conversions,
          revenue: platformData.revenue
        }
      };
      // Create linkAgg equivalent for consistency
      linkAgg = {
        _sum: {
          revenue: platformData.revenue
        }
      };
      console.log('[Platform Analytics] ✅ Using real Impact.com platform data');
    } else {
      // Fallback to database aggregates
      const [linkAggResult, shortLinkAgg] = await Promise.all([
        prisma.link.aggregate({ _sum: { conversions: true, revenue: true } }),
        prisma.shortLink.aggregate({ _sum: { clicks: true } }),
      ]);
      
      linkAgg = linkAggResult;
      combinedAgg = {
        _sum: {
          clicks: shortLinkAgg._sum.clicks || 0,
          conversions: linkAgg._sum.conversions || 0,
          revenue: linkAgg._sum.revenue || 0
        }
      };
      console.log('[Platform Analytics] ⚠️ Using database fallback');
    }
    
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
    // Only send response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal server error' });
    }
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
    // Only send response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

module.exports = router;





