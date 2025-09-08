const express = require('express');
const bcrypt = require('bcrypt');
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
        applicationStatus: true,
        commissionRate: true,
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
        commissionRate: creator.commissionRate || 70, // Use actual rate from database, fallback to 70
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
  
  if (!currentCreator) {
    return res.status(404).json({ message: 'Creator not found' });
  }
  
  console.log(`📈 Rate change: ${currentCreator.commissionRate}% → ${newRate}%`);
  console.log(`👤 Creator: ${currentCreator.name} (${currentCreator.email})`);
  
  if (currentCreator.commissionRate !== newRate) {
    console.log(`✅ FORWARD-ONLY PROTECTION: Historical earnings will NOT be affected`);
    console.log(`✅ Point-in-time snapshots preserve past earnings at original rates`);
    console.log(`✅ Only future earnings will use the new ${newRate}% rate`);
    console.log(`✅ Creator trust maintained through historical accuracy`);
  }
  
  // Check if point-in-time system is active for this creator
  let hasSnapshots = false;
  try {
    const existingSnapshots = await prisma.earningsSnapshot.findFirst({
      where: { creatorId }
    });
    
    if (existingSnapshots) {
      hasSnapshots = true;
      console.log(`🛡️ Point-in-time system ACTIVE for this creator`);
      console.log(`🛡️ Historical earnings are protected by snapshots`);
    } else {
      console.log(`⚠️ No snapshots found - future earnings will be protected automatically`);
      console.log(`📝 Snapshots are created automatically on new earnings via webhooks`);
    }
  } catch (snapshotCheckError) {
    console.log(`⚠️ Could not verify snapshot protection:`, snapshotCheckError.message);
  }
  
  // SAFE: Apply the commission rate change (historical earnings protected)
  console.log(`✅ APPLYING COMMISSION RATE CHANGE: ${currentCreator.commissionRate}% → ${newRate}%`);
  console.log(`🛡️ Historical earnings remain protected at their original rates`);
  console.log(`🚀 Future earnings will use the new ${newRate}% rate`);
  
  const updatedCreator = await prisma.creator.update({ 
    where: { id: creatorId }, 
    data: { commissionRate: newRate } 
  });
  
  console.log(`✅ Commission rate change completed successfully`);
  console.log(`🛡️ Historical earnings protection: ${hasSnapshots ? 'ACTIVE via snapshots' : 'AUTOMATIC on new earnings'}`);
  
  return res.json({ 
    success: true,
    message: 'Commission rate updated successfully',
    creator: {
      id: updatedCreator.id,
      name: currentCreator.name,
      email: currentCreator.email,
      previousRate: currentCreator.commissionRate,
      newRate: updatedCreator.commissionRate
    },
    protection: {
      hasExistingSnapshots: hasSnapshots,
      forwardOnlySystem: true,
      historicalEarningsProtected: true
    },
    timestamp: new Date().toISOString()
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
    console.log('🔍 Admin: Loading creator profile for ID:', req.params.id);
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });
    
    const creatorId = req.params.id;
    
    // Add specific debugging for problematic creators
    if (creatorId === '9c96c390-23b4-4603-8c8e-b3ea5ce1d128') {
      console.log('🚨 DEBUGGING: Loading profile for Ijaz ahmed (problematic creator)');
    }
    if (creatorId === '3bbffc5d-e3f7-4c27-91e2-4aefaa063657') {
      console.log('🚨 DEBUGGING: Loading profile for Sohail Khan (problematic creator)');
    }
    
    // Get creator with basic data first (simplified to avoid Prisma issues)
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      include: {
        paymentAccount: true
      }
    });
    
    if (!creator) {
      console.log('❌ Admin: Creator not found for ID:', creatorId);
      return res.status(404).json({ message: 'Creator not found' });
    }
    
    console.log('✅ Admin: Creator found:', creator.name, creator.email);
    
    // Add specific debugging for problematic creators
    if (creatorId === '9c96c390-23b4-4603-8c8e-b3ea5ce1d128') {
      console.log('🚨 DEBUGGING: Creator data for Ijaz ahmed:', JSON.stringify(creator, null, 2));
    }
    if (creatorId === '3bbffc5d-e3f7-4c27-91e2-4aefaa063657') {
      console.log('🚨 DEBUGGING: Creator data for Sohail Khan:', JSON.stringify(creator, null, 2));
    }
    
    // Get performance data separately to avoid Prisma issues
    let earnings, shortLinks, referrals;
    
    try {
      [earnings, shortLinks, referrals] = await Promise.all([
        prisma.earning.findMany({
          where: { creatorId },
          select: { amount: true, type: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20
        }),
        prisma.shortLink.findMany({
          where: { creatorId },
          select: { clicks: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10
        }),
        prisma.referralEarning.findMany({
          where: { referrerId: creatorId },
          include: {
            referred: {
              select: { name: true, email: true }
            }
          }
        })
      ]);
      
      // Add specific debugging for Sohail Khan
      if (creatorId === '3bbffc5d-e3f7-4c27-91e2-4aefaa063657') {
        console.log('🚨 DEBUGGING: Sohail Khan performance data:', {
          earnings: earnings.length,
          shortLinks: shortLinks.length,
          referrals: referrals.length
        });
      }
    } catch (performanceError) {
      console.error('❌ Error fetching performance data for creator:', creatorId, performanceError);
      
      // Add specific debugging for Sohail Khan
      if (creatorId === '3bbffc5d-e3f7-4c27-91e2-4aefaa063657') {
        console.log('🚨 DEBUGGING: Sohail Khan performance data error:', performanceError);
      }
      
      // Set default values if performance data fails
      earnings = [];
      shortLinks = [];
      referrals = [];
    }
    
    // Calculate performance metrics
    const totalEarnings = earnings.reduce((sum, earning) => sum + Number(earning.amount), 0);
    const totalClicks = shortLinks.reduce((sum, link) => sum + (link.clicks || 0), 0);
    const totalConversions = 0; // We'll calculate this from earnings if needed
    
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
    
    // Calculate referral earnings from the referrals we already fetched
    const totalReferralEarnings = referrals.reduce((sum, earning) => sum + Number(earning.amount), 0);
    
    const responseData = {
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
        linksCount: shortLinks.length,
        referralsCount: referrals.length
      },
      recentLinks: shortLinks,
      recentEarnings: earnings,
      referrals: referrals,
      payoutRequests: creator.payouts
    };
    
    console.log('✅ Admin: Sending profile response for:', creator.name);
    
    // Add specific debugging for problematic creators
    if (creatorId === '9c96c390-23b4-4603-8c8e-b3ea5ce1d128') {
      console.log('🚨 DEBUGGING: Response data for Ijaz ahmed:', JSON.stringify(responseData, null, 2));
    }
    if (creatorId === '3bbffc5d-e3f7-4c27-91e2-4aefaa063657') {
      console.log('🚨 DEBUGGING: Response data for Sohail Khan:', JSON.stringify(responseData, null, 2));
    }
    
    res.json(responseData);
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
    
    // Check if Impact.com service is properly configured
    if (!impact.isConfigured()) {
      console.log('⚠️ Impact.com service not configured - missing credentials');
      return res.status(502).json({ 
        success: false, 
        message: 'Impact.com service not configured - missing API credentials',
        fallback: true
      });
    }
    
    // Optional ISO-Z date filters (e.g., 2025-08-01T00:00:00Z)
    const { startDate, endDate } = req.query || {};
    
    // Try Clicks endpoint first; fallback to Actions
    const analytics = await impact.getClickAnalytics(startDate, endDate);
    if (!analytics.success) {
      console.log('⚠️ Impact.com click analytics failed:', analytics);
      return res.status(502).json({ 
        success: false, 
        message: 'Impact analytics unavailable - API connection failed', 
        data: analytics,
        fallback: true
      });
    }
    
    console.log('✅ Impact.com click analytics successful');
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('❌ Error fetching Impact.com click data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch Impact.com click data', 
      error: error.message,
      fallback: true
    });
  }
});

// NEW: Admin endpoint to fetch detailed Actions with filters
router.get('/impact-actions', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Admin requesting Impact.com actions data...');
    const ImpactWebService = require('../services/impactWebService');
    const impact = new ImpactWebService();
    
    // Check if Impact.com service is properly configured
    if (!impact.isConfigured()) {
      console.log('⚠️ Impact.com service not configured - missing credentials');
      return res.status(502).json({ 
        success: false, 
        message: 'Impact.com service not configured - missing API credentials',
        fallback: true
      });
    }
    
    const { startDate, endDate, status, actionType, page, pageSize, subId1, campaignId } = req.query || {};
    const result = await impact.getActionsDetailed({ 
      startDate, 
      endDate, 
      status, 
      actionType, 
      page: page ? parseInt(page) : undefined, 
      pageSize: pageSize ? parseInt(pageSize) : undefined, 
      subId1, 
      campaignId 
    });
    
    if (!result.success) {
      console.log('⚠️ Impact.com actions failed:', result);
      return res.status(502).json({ 
        success: false, 
        message: 'Impact Actions unavailable - API connection failed', 
        data: result,
        fallback: true
      });
    }
    
    console.log('✅ Impact.com actions successful');
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error fetching Impact.com actions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch Impact.com actions', 
      error: error.message,
      fallback: true
    });
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
      const allCreators = await prisma.creator.findMany({
        where: {
          isActive: true,
          applicationStatus: 'APPROVED',
          ...creatorFilter
        },
        select: { name: true, email: true, id: true }
      });
      
      // Filter for valid emails (post-query filtering to avoid Prisma issues)
      const validCreators = allCreators.filter(creator => 
        creator.email && 
        creator.email.trim() !== '' && 
        creator.email.includes('@')
      );
      
      console.log(`📧 Send-email: Found ${allCreators.length} total, ${validCreators.length} with valid emails`);
      targetCreators = validCreators;
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

    console.log(`📧 Admin email: Starting async send to ${targetCreators.length} creators`);

    // For large batches, start async process and return immediately
    if (targetCreators.length > 10) {
      console.log(`📧 Large batch detected (${targetCreators.length} creators), starting background process`);
      
      // Start background email sending process
      setImmediate(async () => {
        const results = {
          successful: 0,
          failed: 0,
          errors: [],
          messageIds: []
        };

        console.log(`📧 Background process: Starting email send to ${targetCreators.length} creators`);

        for (let i = 0; i < targetCreators.length; i++) {
          const creator = targetCreators[i];
          
          try {
            // Replace {{CREATOR_NAME}} placeholder in content
            const personalizedHtml = htmlContent.replace(/\{\{CREATOR_NAME\}\}/g, creator.name || 'Creator');
            const personalizedText = textContent ? textContent.replace(/\{\{CREATOR_NAME\}\}/g, creator.name || 'Creator') : null;
            
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

        console.log(`📊 Background email process complete: ${results.successful} successful, ${results.failed} failed`);
      });

      // Return immediate response
      res.json({
        success: true,
        message: `Email sending started in background for ${targetCreators.length} creators`,
        status: 'processing',
        totalCreators: targetCreators.length,
        estimatedDuration: `${Math.ceil(targetCreators.length / 60)} minutes`
      });
      
    } else {
      // For small batches, send synchronously
      const results = {
        successful: 0,
        failed: 0,
        errors: [],
        messageIds: []
      };

      for (let i = 0; i < targetCreators.length; i++) {
        const creator = targetCreators[i];
        
        try {
          const personalizedHtml = htmlContent.replace(/\{\{CREATOR_NAME\}\}/g, creator.name || 'Creator');
          const personalizedText = textContent ? textContent.replace(/\{\{CREATOR_NAME\}\}/g, creator.name || 'Creator') : null;
          
          const result = await emailService.sendEmail(
            creator.email, 
            subject, 
            personalizedHtml, 
            personalizedText
          );

          if (result.success) {
            results.successful++;
            results.messageIds.push(result.messageId);
          } else {
            results.failed++;
            results.errors.push({ email: creator.email, error: result.error });
          }
        } catch (error) {
          results.failed++;
          results.errors.push({ email: creator.email, error: error.message });
        }
      }

      res.json({
        success: true,
        message: `Email sent to ${results.successful} creators`,
        results,
        totalSent: results.successful,
        totalFailed: results.failed
      });
    }

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
  try {
    const { EMAIL_TEMPLATES } = require('../templates/emailTemplates');
    res.json({ templates: EMAIL_TEMPLATES });
  } catch (error) {
    console.error('❌ Error loading email templates:', error);
    // Fallback templates
    const fallbackTemplates = [
      {
        id: 'maintenance_notice',
        name: 'Maintenance Notice',
        subject: '🔧 Important Notice: Temporary Analytics Display Issues (Your Earnings Are Safe!)',
        description: 'Notify creators about temporary analytics issues during maintenance',
        htmlContent: '<p>Dear {{CREATOR_NAME}},</p><p>We are experiencing temporary analytics display issues. Your earnings are 100% safe!</p><p>Best regards,<br>The Zylike Team</p>'
      }
    ];
    res.json({ templates: fallbackTemplates });
  }
});

// Get creator email list for admin
router.get('/creator-emails', requireAuth, requireAdmin, async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });

    const { status, isActive } = req.query;
    
    // Build where clause with simple approach to avoid Prisma issues
    const where = {};
    
    // Add status filter if provided (default to APPROVED)
    if (status) {
      where.applicationStatus = status;
    }
    
    // Add active filter if provided (default to true) 
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const allCreators = await prisma.creator.findMany({
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

    // Filter out creators with null or empty emails (post-query filtering)
    const creators = allCreators.filter(creator => 
      creator.email && 
      creator.email.trim() !== '' && 
      creator.email.includes('@')
    );

    console.log(`📧 Creator emails: Found ${allCreators.length} total, ${creators.length} with valid emails`);

    res.json({ 
      creators,
      total: creators.length,
      totalInDatabase: allCreators.length,
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

// NEW: Historical Analytics Endpoints
router.get('/analytics/historical', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { DailyAnalyticsService } = require('../services/dailyAnalyticsService');
    const analyticsService = new DailyAnalyticsService();

    const { startDate, endDate, creatorId, dateRange } = req.query;

    const analytics = await analyticsService.getHistoricalAnalytics({
      startDate,
      endDate,
      creatorId,
      dateRange
    });

    res.json(analytics);

  } catch (error) {
    console.error('❌ Historical analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch historical analytics',
      error: error.message
    });
  }
});

// Trigger daily analytics collection (manual)
router.post('/analytics/collect-daily', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { DailyAnalyticsService } = require('../services/dailyAnalyticsService');
    const analyticsService = new DailyAnalyticsService();

    const { targetDate } = req.body;
    const date = targetDate ? new Date(targetDate) : null;

    console.log('🔄 Admin triggered daily analytics collection...');
    
    // Start collection in background and return immediately
    analyticsService.collectDailyAnalytics(date).then(results => {
      console.log('✅ Daily analytics collection completed:', {
        date: results.date,
        successful: results.successful,
        failed: results.failed,
        totalSales: results.metrics.totalSales.toFixed(2),
        totalCommissions: results.metrics.totalCommissions.toFixed(2)
      });
    }).catch(error => {
      console.error('❌ Background daily analytics collection error:', error);
    });

    // Return immediately to prevent timeout
    res.json({
      success: true,
      message: 'Daily analytics collection started in background - fetching fresh data from Impact.com API',
      status: 'processing',
      dataSource: 'IMPACT_API'
    });

  } catch (error) {
    console.error('❌ Daily analytics collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start daily analytics collection',
      error: error.message
    });
  }
});

// Backfill historical data
router.post('/analytics/backfill', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { DailyAnalyticsService } = require('../services/dailyAnalyticsService');
    const analyticsService = new DailyAnalyticsService();

    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    console.log('🔄 Admin triggered historical data backfill...');
    
    // Start backfill in background for large date ranges
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end - start) / (24 * 60 * 60 * 1000));

    if (daysDiff > 7) {
      // Large backfill - run in background
      setImmediate(async () => {
        try {
          const results = await analyticsService.backfillHistoricalData(start, end);
          console.log('✅ Background backfill completed:', results);
        } catch (error) {
          console.error('❌ Background backfill failed:', error.message);
        }
      });

      res.json({
        success: true,
        message: `Backfill started for ${daysDiff} days (running in background)`,
        estimatedDuration: `${Math.ceil(daysDiff * 2)} minutes`
      });
    } else {
      // Small backfill - run synchronously
      const results = await analyticsService.backfillHistoricalData(start, end);
      
      res.json({
        success: true,
        message: 'Historical data backfill completed',
        results
      });
    }

  } catch (error) {
    console.error('❌ Historical data backfill error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to backfill historical data',
      error: error.message
    });
  }
});

// Get cron service status
router.get('/cron/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { getCronService } = require('../services/cronService');
    const cronService = getCronService();
    
    const status = cronService.getStatus();
    res.json(status);
    
  } catch (error) {
    console.error('❌ Cron status error:', error);
    res.status(500).json({
      error: 'Failed to get cron status',
      message: error.message
    });
  }
});

// Manually trigger daily job
router.post('/cron/trigger-daily', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { getCronService } = require('../services/cronService');
    const cronService = getCronService();
    
    console.log('🔄 Admin manually triggered daily cron job...');
    
    // Run in background to avoid timeout
    setImmediate(async () => {
      try {
        await cronService.triggerDailyJob();
        console.log('✅ Manual daily job completed');
      } catch (error) {
        console.error('❌ Manual daily job failed:', error.message);
      }
    });

    res.json({
      success: true,
      message: 'Daily job triggered (running in background)',
      status: 'processing'
    });
    
  } catch (error) {
    console.error('❌ Manual cron trigger error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger daily job',
      error: error.message
    });
  }
});

// Emergency admin password reset endpoint
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email and newPassword are required'
      });
    }

    if (!prisma) {
      return res.status(503).json({
        success: false,
        message: 'Database not configured'
      });
    }

    console.log(`🔧 Admin password reset requested for: ${email}`);

    // Find the admin user
    const admin = await prisma.creator.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    // Check if user has admin role
    if (!admin.adminRole || (admin.adminRole !== 'ADMIN' && admin.adminRole !== 'SUPER_ADMIN')) {
      return res.status(403).json({
        success: false,
        message: 'User is not an admin'
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password
    await prisma.creator.update({
      where: { id: admin.id },
      data: { password: hashedPassword }
    });

    console.log(`✅ Admin password reset successful for: ${email}`);

    res.json({
      success: true,
      message: 'Password reset successful',
      data: {
        email: admin.email,
        name: admin.name,
        role: admin.adminRole
      }
    });

  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message
    });
  }
});

module.exports = router;





