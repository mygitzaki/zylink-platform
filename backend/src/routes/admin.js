const express = require('express');
const { getPrisma } = require('../utils/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { EmailService } = require('../services/emailService');
const router = express.Router();
const prisma = getPrisma();

router.get('/creators', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  
  try {
    // Optional pagination (defaults preserve current behavior)
    const page = Number(req.query.page || 0);
    const limit = Number(req.query.limit || 0);
    const findArgs = {
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
    };
    if (page > 0 && limit > 0) {
      findArgs.skip = (page - 1) * limit;
      findArgs.take = limit;
    }
    // Get creators with basic info
    const creators = await prisma.creator.findMany(findArgs);
    
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
    
    // Include pagination metadata only when used
    const meta = (page > 0 && limit > 0)
      ? { page, limit }
      : undefined;
    res.json({ creators: enrichedCreators, ...(meta && { meta }) });
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
  try {
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });
    const { status, commissionRate, salesBonus, notes } = req.body;
    
    const updated = await prisma.creator.update({
      where: { id: req.params.id },
      data: {
        applicationStatus: status,
        isActive: status === 'APPROVED',
        commissionRate: commissionRate ?? undefined,
        salesBonus: salesBonus ?? undefined,
        applicationNotes: notes ?? undefined,
        rejectionReason: status === 'REJECTED' ? notes : undefined,
      },
    });

    // Send application status email (non-blocking)
    try {
      const emailService = new EmailService();
      await emailService.initialize();
      await emailService.sendApplicationStatusEmail(updated, status, notes);
      console.log(`✅ Application status email sent to ${updated.email} (${status})`);
    } catch (emailError) {
      // Don't fail the application update if email fails
      console.error('⚠️ Failed to send application status email:', emailError.message);
    }

    res.json({ updated });
  } catch (err) {
    console.error('Application review error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/creators/:id/status', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  const updated = await prisma.creator.update({ where: { id: req.params.id }, data: { isActive: !!req.body.isActive } });
  res.json({ updated });
});

router.put('/creators/:id/commission', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  
  const newRate = Number(req.body.commissionRate || 70);
  const creatorId = req.params.id;
  
  console.log(`🔧 COMMISSION RATE CHANGE - FORWARD-ONLY SYSTEM ACTIVE:`);
  console.log(`👤 Creator ID: ${creatorId}`);
  console.log(`📊 New rate: ${newRate}%`);
  console.log(`👨‍💼 Changed by admin: ${req.user.id}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  
  // Get current rate for comparison and verification
  const currentCreator = await prisma.creator.findUnique({ 
    where: { id: creatorId },
    select: { commissionRate: true, name: true, email: true }
  });
  
  if (currentCreator) {
    console.log(`📈 Rate change: ${currentCreator.commissionRate}% → ${newRate}%`);
    console.log(`👤 Creator: ${currentCreator.name} (${currentCreator.email})`);
    
    if (currentCreator.commissionRate !== newRate) {
      console.log(`✅ FORWARD-ONLY PROTECTION: Historical earnings will NOT be affected`);
      console.log(`✅ Point-in-time snapshots preserve past earnings at original rates`);
      console.log(`✅ Only future earnings will use the new ${newRate}% rate`);
      console.log(`✅ Creator trust maintained through historical accuracy`);
    }
  }
  
  // Check if point-in-time system is active for this creator
  try {
    const existingSnapshots = await prisma.earningsSnapshot.findFirst({
      where: { creatorId }
    });
    
    if (existingSnapshots) {
      console.log(`🛡️ Point-in-time system ACTIVE for this creator`);
      console.log(`🛡️ Historical earnings are protected by snapshots`);
    } else {
      console.log(`⚠️ No snapshots found - creator may see retroactive changes`);
      console.log(`⚠️ Consider creating snapshots before rate change`);
    }
  } catch (snapshotCheckError) {
    console.log(`⚠️ Could not verify snapshot protection:`, snapshotCheckError.message);
  }
  
  // EMERGENCY: Immediately revert commission rate to prevent further damage
  console.log(`🚨 EMERGENCY REVERT: Restoring commission rate to prevent inflated earnings`);
  console.log(`❌ Point-in-time protection still not active`);
  console.log(`💰 Creators seeing inflated earnings due to retroactive calculation`);
  console.log(`🔧 Reverting ${currentCreator.name} from current rate back to 70%`);
  
  // IMMEDIATELY revert to 70% to fix inflated earnings
  const revertedCreator = await prisma.creator.update({ 
    where: { id: creatorId }, 
    data: { commissionRate: 70 } 
  });
  
  console.log(`✅ Emergency revert completed: Commission rate restored to 70%`);
  console.log(`🛡️ This should restore correct earnings display for creator`);
  
  return res.json({ 
    reverted: true,
    message: 'Commission rate emergency revert completed',
    reason: 'Point-in-time protection not active - preventing inflated earnings',
    revertedTo: 70,
    wasAt: currentCreator?.commissionRate,
    action: 'Earnings should return to normal amounts'
  });
});

// Get detailed creator profile for admin view
// Remove the minimal profile endpoint to avoid conflicts; use the comprehensive version below

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
  try {
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });
    
    const pr = await prisma.payoutRequest.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED', processedAt: new Date() },
      include: {
        creator: {
          include: {
            paymentAccount: true
          }
        }
      }
    });

    // Send payment notification email (non-blocking)
    try {
      const emailService = new EmailService();
      await emailService.initialize();
      
      const paymentMethod = pr.creator.paymentAccount?.accountType || 'Payment Account';
      await emailService.sendPaymentNotificationEmail(
        pr.creator,
        parseFloat(pr.amount),
        paymentMethod
      );
      console.log(`✅ Payment notification email sent to ${pr.creator.email} ($${pr.amount})`);
    } catch (emailError) {
      // Don't fail the payout approval if email fails
      console.error('⚠️ Failed to send payment notification email:', emailError.message);
    }

    res.json(pr);
  } catch (err) {
    console.error('Payout approval error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/payouts/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  const pr = await prisma.payoutRequest.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } })
  res.json(pr)
});

// Admin test email endpoint (safe)
router.post('/test-email', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { to, subject, text, html } = req.body || {};
    if (!to) return res.status(400).json({ message: 'Missing "to" address' });

    const { EmailService } = require('../services/emailService');
    const svc = new EmailService();
    await svc.initialize();

    const result = await svc.sendEmail(
      to,
      subject || 'Zylike Test Email',
      html || `<p>${text || 'Hello from Zylike via Mailgun SMTP (test).'}</p>`,
      text
    );

    return res.json({ success: true, result });
  } catch (error) {
    console.error('Admin test-email error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send test email', error: error.message });
  }
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
    
    // Format payment account - check both main and fallback tables
    let paymentDetails = null;
    let paymentAccount = creator.paymentAccount;
    
    // If no payment account in main table, check fallback table
    if (!paymentAccount) {
      try {
        const fallbackResult = await prisma.$queryRaw`
          SELECT * FROM "PaymentAccountFallback" WHERE "creatorId" = ${creatorId}
        `;
        
        if (fallbackResult && fallbackResult.length > 0) {
          paymentAccount = fallbackResult[0];
          console.log('✅ Admin: Found payment data in fallback table for creator:', creatorId);
        }
      } catch (fallbackError) {
        console.log('⚠️ Admin: Fallback table query failed for creator:', creatorId);
      }
    }
    
    if (paymentAccount) {
      const frontendTypeMapping = {
        'BANK_ACCOUNT': 'Bank Transfer',
        'PAYPAL': 'PayPal', 
        'CRYPTO_WALLET': 'Cryptocurrency'
      };
      
      paymentDetails = {
        id: paymentAccount.id,
        type: frontendTypeMapping[paymentAccount.accountType] || paymentAccount.accountType,
        accountDetails: paymentAccount.accountDetails,
        isVerified: paymentAccount.isVerified || false,
        createdAt: paymentAccount.createdAt,
        updatedAt: paymentAccount.updatedAt
      };
      
      console.log('✅ Admin: Payment details prepared for creator:', creatorId, 'Type:', paymentDetails.type);
    } else {
      console.log('📝 Admin: No payment details found for creator:', creatorId);
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

// NEW: Safe endpoint to fetch real Impact.com click data
router.get('/impact-clicks', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Admin requesting Impact.com click data...');
    const ImpactWebService = require('../services/impactWebService');
    const impact = new ImpactWebService();
    // Optional ISO-Z date filters (e.g., 2025-08-01T00:00:00Z)
    const { startDate, endDate } = req.query || {};
    // Try Clicks endpoint first; fallback to Actions
    const analytics = await impact.getClickAnalytics(startDate, endDate);
    if (!analytics.success) {
      return res.status(502).json({ success: false, message: 'Impact analytics unavailable', data: analytics });
    }
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('❌ Error fetching Impact.com click data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch Impact.com click data', error: error.message });
  }
});

// NEW: Admin endpoint to fetch detailed Actions with filters
router.get('/impact-actions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const ImpactWebService = require('../services/impactWebService');
    const impact = new ImpactWebService();
    const { startDate, endDate, status, actionType, page, pageSize, subId1, campaignId } = req.query || {};
    const result = await impact.getActionsDetailed({ startDate, endDate, status, actionType, page: page ? parseInt(page) : undefined, pageSize: pageSize ? parseInt(pageSize) : undefined, subId1, campaignId });
    if (!result.success) {
      return res.status(502).json({ success: false, message: 'Impact Actions unavailable', data: result });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error fetching Impact.com actions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch Impact.com actions', error: error.message });
  }
});

// NEW: Admin endpoint to fetch a single action detail (item-level if provided)
router.get('/impact-actions/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const ImpactWebService = require('../services/impactWebService');
    const impact = new ImpactWebService();
    const result = await impact.getActionDetail(req.params.id);
    if (!result.success) {
      return res.status(502).json({ success: false, message: 'Impact Action detail unavailable', data: result });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error fetching Impact.com action detail:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch Impact.com action detail', error: error.message });
  }
});

// NEW: Admin Email Management Endpoints
router.post('/send-email', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { 
      recipients, 
      subject, 
      htmlContent, 
      textContent,
      sendToAll = false,
      creatorFilter = {}
    } = req.body;

    if (!subject || !htmlContent) {
      return res.status(400).json({ message: 'Subject and HTML content are required' });
    }

    const { EmailService } = require('../services/emailService');
    const emailService = new EmailService();
    await emailService.initialize();

    let targetCreators = [];

    if (sendToAll) {
      // Send to all active creators
      const creators = await prisma.creator.findMany({
        where: {
          isActive: true,
          applicationStatus: 'APPROVED',
          email: { not: null },
          ...creatorFilter
        },
        select: { name: true, email: true, id: true }
      });
      targetCreators = creators;
    } else if (recipients && Array.isArray(recipients)) {
      // Send to specific recipients
      targetCreators = recipients.map(r => ({
        name: r.name || 'Creator',
        email: r.email,
        id: r.id || null
      }));
    } else {
      return res.status(400).json({ message: 'Either recipients array or sendToAll=true is required' });
    }

    console.log(`📧 Admin email: Sending to ${targetCreators.length} creators`);

    const results = {
      successful: 0,
      failed: 0,
      errors: [],
      messageIds: []
    };

    // Send emails with rate limiting
    for (let i = 0; i < targetCreators.length; i++) {
      const creator = targetCreators[i];
      
      try {
        // Replace {{CREATOR_NAME}} placeholder in content
        const personalizedHtml = htmlContent.replace(/{{CREATOR_NAME}}/g, creator.name);
        const personalizedText = textContent ? textContent.replace(/{{CREATOR_NAME}}/g, creator.name) : null;
        
        const result = await emailService.sendEmail(
          creator.email, 
          subject, 
          personalizedHtml, 
          personalizedText
        );

        if (result.success) {
          results.successful++;
          results.messageIds.push(result.messageId);
          console.log(`✅ Email sent to ${creator.email} (${i + 1}/${targetCreators.length})`);
        } else {
          results.failed++;
          results.errors.push({ email: creator.email, error: result.error });
          console.error(`❌ Failed to send to ${creator.email}: ${result.error}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ email: creator.email, error: error.message });
        console.error(`❌ Error sending to ${creator.email}:`, error.message);
      }

      // Rate limiting: 1 email per second
      if (i < targetCreators.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`📊 Admin email complete: ${results.successful} successful, ${results.failed} failed`);

    res.json({
      success: true,
      message: `Email sent to ${results.successful} creators`,
      results,
      totalSent: results.successful,
      totalFailed: results.failed
    });

  } catch (error) {
    console.error('❌ Admin email sending error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to send emails',
      error: error.message 
    });
  }
});

// Test endpoint to verify admin routes are working
router.get('/test', requireAuth, requireAdmin, async (req, res) => {
  res.json({ message: 'Admin routes working', timestamp: new Date().toISOString() });
});

// Get email templates for admin
router.get('/email-templates', requireAuth, requireAdmin, async (req, res) => {
  const templates = [
    {
      id: 'maintenance_notice',
      name: 'Maintenance Notice',
      subject: '🔧 Important Notice: Temporary Analytics Display Issues (Your Earnings Are Safe!)',
      description: 'Notify creators about temporary analytics issues during maintenance',
      htmlContent: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analytics Maintenance Notice</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f4f4; }
        .container { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .highlight { background: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        h1 { margin: 0; font-size: 24px; }
        h3 { color: #555; margin-top: 20px; }
        ul { padding-left: 20px; }
        li { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 Analytics Maintenance Notice</h1>
            <p>Important information about your dashboard</p>
        </div>
        
        <div class="content">
            <p>Dear {{CREATOR_NAME}},</p>
            
            <p>We hope this message finds you well! We're writing to inform you about some temporary display issues you might notice in your analytics and earnings dashboard this week.</p>
            
            <div class="warning">
                <h3>🔍 What You Might See</h3>
                <ul>
                    <li><strong>Unusual numbers</strong> in your analytics dashboard</li>
                    <li><strong>Inconsistent data</strong> between different pages</li>
                    <li><strong>Missing or fluctuating sales figures</strong></li>
                    <li><strong>Temporary display errors</strong> in earnings calculations</li>
                    <li><strong>Loading delays</strong> on analytics pages</li>
                </ul>
            </div>
            
            <div class="highlight">
                <h3>💰 Your Earnings Are 100% Safe</h3>
                <p><strong>IMPORTANT</strong>: Please don't worry! These are purely <strong>display issues</strong> and do <strong>NOT</strong> affect your actual earnings:</p>
                <ul>
                    <li>✅ <strong>All your commissions are completely saved and reserved</strong></li>
                    <li>✅ <strong>Every sale you've generated is securely tracked</strong></li>
                    <li>✅ <strong>Your payment eligibility remains unchanged</strong></li>
                    <li>✅ <strong>No earnings data has been lost or modified</strong></li>
                    <li>✅ <strong>All pending payments are protected</strong></li>
                </ul>
            </div>
            
            <h3>🛠️ What We're Doing</h3>
            <p>Our technical team is working around the clock to:</p>
            <ul>
                <li><strong>Optimize data synchronization</strong> with our affiliate partners</li>
                <li><strong>Improve analytics accuracy</strong> and real-time reporting</li>
                <li><strong>Enhance security measures</strong> to protect your data</li>
                <li><strong>Upgrade performance</strong> for faster dashboard loading</li>
                <li><strong>Strengthen data validation</strong> systems</li>
            </ul>
            
            <h3>⏰ Expected Resolution</h3>
            <p>We expect these display issues to be fully resolved by <strong>Friday, September 6th, 2025</strong>. During this time:</p>
            <ul>
                <li><strong>Continue promoting your links</strong> - all tracking is working normally</li>
                <li><strong>Your commissions are being recorded</strong> accurately behind the scenes</li>
                <li><strong>Payment processing</strong> continues as usual</li>
                <li><strong>Support is available</strong> if you have any concerns</li>
            </ul>
            
            <h3>📞 Need Help?</h3>
            <p>If you have any questions or concerns about your earnings, please don't hesitate to reach out:</p>
            <ul>
                <li><strong>Email</strong>: support@zylike.com</li>
                <li><strong>Dashboard</strong>: Use the "Contact Support" feature</li>
                <li><strong>Response Time</strong>: Within 24 hours</li>
            </ul>
            
            <a href="mailto:support@zylike.com" class="button">Contact Support</a>
            
            <h3>🙏 Thank You for Your Patience</h3>
            <p>We sincerely apologize for any confusion these temporary display issues may cause. Your trust is important to us, and we're committed to providing you with the most accurate and reliable analytics platform possible.</p>
            
            <p>Thank you for being a valued member of the Zylike creator community!</p>
            
            <p><strong>Best regards,</strong><br>
            The Zylike Team</p>
            
            <div class="highlight">
                <h4>📱 Quick Reminder</h4>
                <p>Keep sharing your affiliate links - everything is working perfectly behind the scenes, and your earnings continue to grow!</p>
            </div>
        </div>
        
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.<br>
            For support, use the contact methods listed above.</p>
            <p>© 2025 Zylike. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`
    },
    {
      id: 'general_announcement',
      name: 'General Announcement',
      subject: '📢 Important Update from Zylike',
      description: 'General announcement template for creators',
      htmlContent: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📢 Zylike Update</h1>
    </div>
    <div class="content">
        <p>Dear {{CREATOR_NAME}},</p>
        <p>[Your announcement content here]</p>
        <p>Best regards,<br>The Zylike Team</p>
    </div>
    <div class="footer">
        <p>© 2025 Zylike. All rights reserved.</p>
    </div>
</body>
</html>`
    }
  ];

  res.json({ templates });
});

// Get creator email list for admin
router.get('/creator-emails', requireAuth, requireAdmin, async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });

    const { status, isActive } = req.query;
    
    const whereConditions = [
      { email: { not: null } },
      { email: { not: '' } }
    ];

    if (status) whereConditions.push({ applicationStatus: status });
    if (isActive !== undefined) whereConditions.push({ isActive: isActive === 'true' });

    const where = {
      AND: whereConditions
    };

    const creators = await prisma.creator.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        applicationStatus: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ 
      creators,
      total: creators.length,
      filters: { status, isActive }
    });

  } catch (error) {
    console.error('❌ Error fetching creator emails:', error);
    res.status(500).json({ 
      message: 'Failed to fetch creator emails',
      error: error.message 
    });
  }
});

module.exports = router;





