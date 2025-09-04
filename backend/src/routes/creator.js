const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getPrisma } = require('../utils/prisma');
const ImpactWebService = require('../services/impactWebService');
const { LinkShortener } = require('../services/linkShortener');
const { QRCodeService } = require('../services/qrcodeService');
const { EmailService } = require('../services/emailService');
const { requireAuth, requireApprovedCreator } = require('../middleware/auth');

const router = express.Router();

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, adminRole } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });
    
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });
    
    const hashed = await bcrypt.hash(password, 10);
    
    // Determine the role based on adminRole parameter
    let role = 'USER';
    if (adminRole === 'ADMIN' || adminRole === 'SUPER_ADMIN') {
      role = adminRole;
    }
    
    const creator = await prisma.creator.create({ 
      data: { 
        name, 
        email, 
        password: hashed,
        adminRole: role === 'USER' ? null : role,
        walletAddress: '0x0000000000000000000000000000000000000000' // Default value
      } 
    });
    
    // Send welcome email (non-blocking)
    try {
      const emailService = new EmailService();
      await emailService.initialize();
      await emailService.sendWelcomeEmail(creator);
      console.log(`✅ Welcome email sent to ${creator.email}`);
    } catch (emailError) {
      // Don't fail signup if email fails
      console.error('⚠️ Failed to send welcome email:', emailError.message);
    }
    
    const token = signToken({ id: creator.id, role });
    res.status(201).json({ token, creator: { id: creator.id, name: creator.name, email: creator.email } });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Email already exists' });
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Referral code generation for the current user (if missing)
router.get('/referral-code', requireAuth, async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });
    
    const existing = await prisma.creator.findUnique({ where: { id: req.user.id } });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    
    if (existing.referralCode) return res.json({ referralCode: existing.referralCode });
    
    // Generate a unique referral code
    let code;
    let isUnique = false;
    while (!isUnique) {
      code = (Math.random().toString(36).slice(2, 10)).toUpperCase();
      const existingCode = await prisma.creator.findFirst({ where: { referralCode: code } });
      if (!existingCode) isUnique = true;
    }
    
    const updated = await prisma.creator.update({ 
      where: { id: req.user.id }, 
      data: { referralCode: code } 
    });
    
    res.json({ referralCode: updated.referralCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST endpoint for referral code (for compatibility)
router.post('/referral-code', requireAuth, async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });
    
    const existing = await prisma.creator.findUnique({ where: { id: req.user.id } });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    
    if (existing.referralCode) return res.json({ referralCode: existing.referralCode });
    
    // Generate a unique referral code
    let code;
    let isUnique = false;
    while (!isUnique) {
      code = (Math.random().toString(36).slice(2, 10)).toUpperCase();
      const existingCode = await prisma.creator.findFirst({ where: { referralCode: code } });
      if (!existingCode) isUnique = true;
    }
    
    const updated = await prisma.creator.update({ 
      where: { id: req.user.id }, 
      data: { referralCode: code } 
    });
    
    res.json({ referralCode: updated.referralCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login endpoint removed - using /api/auth/login instead

router.get('/profile', requireAuth, async (req, res) => {
  try {
    console.log('🔍 Creator profile endpoint called - checking for role field fix');
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });
    
    const creator = await prisma.creator.findUnique({
      where: { id: req.user.id }
    });

    if (!creator) {
      return res.status(404).json({ message: 'Creator not found' });
    }

    console.log('👤 Creator found:', { id: creator.id, email: creator.email, adminRole: creator.adminRole });

    res.json({
      id: creator.id,
      name: creator.name,
      email: creator.email,
      bio: creator.bio,
      socialMediaLinks: creator.socialMediaLinks,
      groupLinks: creator.groupLinks,
      isActive: creator.isActive,
      applicationStatus: creator.applicationStatus,
      role: creator.adminRole || 'USER', // This should fix the admin detection
    });
  } catch (err) {
    console.error('❌ Error in creator profile:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });
    
    const { name, bio, socialMediaLinks, groupLinks } = req.body || {};
    
    // Get current creator to check if this is an application submission
    const currentCreator = await prisma.creator.findUnique({ where: { id: req.user.id } });
    if (!currentCreator) return res.status(404).json({ message: 'Creator not found' });
    
    // If submitting application data (bio + social links) and status is null, set to PENDING
    const isApplicationSubmission = bio && socialMediaLinks && 
      (currentCreator.applicationStatus === null || currentCreator.applicationStatus === undefined);
    
    const updateData = { name, bio, socialMediaLinks, groupLinks };
    if (isApplicationSubmission) {
      updateData.applicationStatus = 'PENDING';
      console.log('📝 Setting application status to PENDING for creator:', req.user.id);
    }
    
    const updated = await prisma.creator.update({
      where: { id: req.user.id },
      data: updateData,
    });
    
    res.json({ 
      id: updated.id, 
      name: updated.name, 
      bio: updated.bio, 
      socialMediaLinks: updated.socialMediaLinks, 
      groupLinks: updated.groupLinks 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/links', requireAuth, requireApprovedCreator, async (req, res) => {
  try {
    console.log('🔗 Link creation started for user:', req.user.id);
    const { destinationUrl, sharedId, subId2, subId3, subId4, campaign, platform, contentId } = req.body;
    
    if (!destinationUrl) {
      console.log('❌ No destination URL provided');
      return res.status(400).json({ message: 'destinationUrl required' });
    }
    
    console.log('✅ URL validation passed:', destinationUrl);
    
    const impact = new ImpactWebService();
    const shortener = new LinkShortener();
    const qr = new QRCodeService();

    // Validate URL
    if (!impact.isValidUrl(destinationUrl)) {
      console.log('❌ Invalid URL format:', destinationUrl);
      
      // Provide specific error message for common issues
      let errorMessage = 'Invalid destination URL format';
      if (destinationUrl.includes('wwhttps://') || destinationUrl.includes('https://https://')) {
        errorMessage = 'URL contains duplicate protocol (https://). Please check the URL format.';
      } else if (destinationUrl.match(/\/ip\/[^\/\?]+/g)?.length > 1) {
        errorMessage = 'URL contains multiple product IDs. Please use a single product URL.';
      }
      
      return res.status(400).json({ 
        message: errorMessage,
        invalidUrl: destinationUrl,
        suggestion: 'Please provide a clean Walmart product URL like: https://www.walmart.com/ip/PRODUCT-NAME/PRODUCT-ID'
      });
    }

    console.log('🔗 Creating short link...');
    // Create short link
    let { shortCode, shortLink } = shortener.createShortLink(destinationUrl, req.user.id);
    console.log('✅ Short link created:', shortLink);
    
    console.log('📱 Generating QR code...');
    // Generate QR code
    const qrCodeUrl = await qr.generateQRCode(shortLink);
    console.log('✅ QR code generated:', qrCodeUrl);

    // Create Impact.com tracking link BEFORE DB branch so it is available for both code paths
    console.log('🌐 Creating Impact.com tracking link...');
    const impactResult = await impact.createTrackingLink(destinationUrl, req.user.id, { 
      sharedId, subId2, subId3, subId4, campaign, platform, contentId 
    });
    console.log('✅ Impact.com API result:', {
      success: impactResult.success,
      method: impactResult.method,
      trackingUrl: impactResult.trackingUrl
    });
    const impactLink = impactResult.trackingUrl;

    // Enforce true Impact API tracking by default; allow opt-out via env
    // Set DISABLE_IMPACT_FALLBACK=false to allow fallback links
    const disableFallback = String(process.env.DISABLE_IMPACT_FALLBACK ?? 'true').toLowerCase() === 'true';
    if (disableFallback && impactResult?.method === 'fallback_generation') {
      return res.status(502).json({
        success: false,
        message: 'Tracking link unavailable via API. Please try again, pick another product, or contact support.',
        impactApiUsed: false,
        impactMethod: impactResult?.method
      });
    }

    const prisma = getPrisma();
    if (prisma) {
      console.log('💾 Database available, saving links...');
      // Detect whether ShortLink.originalUrl column exists; if not, skip ShortLink writes to avoid 500s
      let shortLinkTableSupportsOriginalUrl = false;
      try {
        const columnCheck = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'ShortLink' AND column_name = 'originalUrl'`;
        shortLinkTableSupportsOriginalUrl = Array.isArray(columnCheck) && columnCheck.length > 0;
      } catch (e) {
        console.warn('⚠️ Unable to verify ShortLink.originalUrl column, proceeding cautiously:', e?.message);
      }
      
      // Collision-safe insert for short link
      let attempts = 0;
      while (attempts < 5) {
        try {
          if (!shortLinkTableSupportsOriginalUrl) {
            console.log('⚠️ Skipping ShortLink persistence (missing originalUrl column).');
            break;
          }
          const code = shortLink.split('/').pop();
          await prisma.shortLink.create({
            data: {
              shortCode: code,
              shortLink: shortLink,
              originalUrl: destinationUrl,
              creatorId: req.user.id
            }
          });
          console.log('✅ Short link saved to database');
          break;
        } catch (e) {
          if (e.code === 'P2002') {
            console.log('⚠️ Short code collision, retrying...');
            const next = shortener.createShortLink(destinationUrl, req.user.id);
            shortLink = next.shortLink;
            shortCode = next.shortCode;
            attempts++;
            continue;
          }
          throw e;
        }
      }

      try {
        // Create the main link record
        const link = await prisma.link.create({
          data: {
            creatorId: req.user.id,
            destinationUrl: destinationUrl,
            impactLink: impactLink,
            shortLink: shortLink,
            createdAt: new Date()
          }
        });
        
        console.log('✅ Link created successfully:', {
          linkId: link.id,
          impactLink: impactLink,
          shortLink: shortLink
        });
        
        const usedImpact = impactResult?.method !== 'fallback_generation';
        return res.json({
          success: true,
          link: {
            id: link.id,
            destinationUrl: destinationUrl,
            impactLink: impactLink,
            shortLink: shortLink,
            qrCodeUrl: qrCodeUrl
          },
          message: usedImpact ? 'Link created (Impact API)' : 'Link created (fallback)',
          impactApiUsed: usedImpact,
          impactMethod: impactResult?.method
        });
        
      } catch (error) {
        console.error('❌ Failed to save link record:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to save link record',
          error: error.message
        });
      }
    }

    console.log('⚠️ Database not available, using in-memory store');
    // Fallback to in-memory store when DB is not configured
    const { saveShortLink } = require('../utils/memoryStore');
    saveShortLink(shortCode, destinationUrl);
    const usedImpact = impactResult?.method !== 'fallback_generation';
    return res.status(201).json({
      link: { destinationUrl, impactLink, shortLink, qrCodeUrl },
      impactApiUsed: usedImpact,
      impactMethod: impactResult?.method,
      fallbackUsed: impactResult?.method === 'fallback_generation',
      message: usedImpact ? 'Link created (Impact API)' : 'Link created (fallback)',
      ...(impactResult?.error && { apiError: impactResult.error })
    });
  } catch (err) {
    console.error('❌ Link creation error:', err);
    console.error('❌ Error stack:', err.stack);
    
    // Provide more specific error messages
    if (err.message?.includes('Impact.com API')) {
      res.status(500).json({ 
        message: 'Failed to create tracking link. Please try again.',
        details: 'Impact.com API temporarily unavailable'
      });
    } else if (err.message?.includes('Database')) {
      res.status(503).json({ 
        message: 'Database connection issue. Please try again.',
        details: 'Service temporarily unavailable'
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to create link. Please try again.',
        details: err.message || 'Unknown error occurred'
      });
    }
  }
});

router.get('/links', requireAuth, async (req, res) => {
  const prisma = getPrisma();
  if (!prisma) return res.json({ links: [] });
  try {
    const links = await prisma.link.findMany({ where: { creatorId: req.user.id } });
    // Enrich each link with real click counts from ShortLink table
    const enriched = await Promise.all((links || []).map(async (link) => {
      try {
        const shortCode = (link.shortLink || '').split('/').pop();
        let clicks = 0;
        if (shortCode) {
          const sl = await prisma.shortLink.findUnique({ where: { shortCode }, select: { clicks: true } });
          clicks = sl?.clicks || 0;
        }
        return { ...link, clicks };
      } catch {
        return { ...link, clicks: 0 };
      }
    }));
    res.json({ links: enriched });
  } catch (err) {
    console.error('Error fetching links:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Test endpoint to check if authentication and middleware are working
router.get('/test-auth', requireAuth, async (req, res) => {
  res.json({ 
    message: 'Authentication working',
    user: { id: req.user.id, role: req.user.role },
    timestamp: new Date().toISOString()
  });
});

router.get('/earnings', requireAuth, requireApprovedCreator, async (req, res) => {
  const prisma = getPrisma();
  if (!prisma) return res.json({ earnings: [], total: 0, byType: {}, byStatus: {}, summary: { total: 0, breakdown: { commissions: { gross: 0, net: 0, count: 0 }, salesBonuses: { total: 0, count: 0 }, referralBonuses: { total: 0, count: 0 } }, eligibleForPayout: false, count: 0 }, creator: { commissionRate: 0, salesBonus: 0 } });

  try {
    const { calculateTotalEarnings } = require('../utils/commissionCalculator');

    // Fetch creator for commission rate
    const creator = await prisma.creator.findUnique({
      where: { id: req.user.id },
      select: { commissionRate: true, salesBonus: true }
    });

    const earnings = await prisma.earning.findMany({
      where: { creatorId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        link: { select: { id: true, destinationUrl: true, shortLink: true } }
      }
    });

    // Legacy aggregates for backward compatibility
    const total = earnings.reduce((s, e) => s + Number(e.amount || 0), 0);
    const byType = earnings.reduce((acc, e) => ({ ...acc, [e.type]: (acc[e.type] || 0) + Number(e.amount || 0) }), {});
    const byStatus = earnings.reduce((acc, e) => ({ ...acc, [e.status]: (acc[e.status] || 0) + Number(e.amount || 0) }), {});

    // Comprehensive summary
    const earningsData = {
      commissions: earnings.filter(e => e.type === 'COMMISSION'),
      salesBonuses: earnings.filter(e => e.type === 'SALES_BONUS'),
      referralBonuses: earnings.filter(e => e.type === 'REFERRAL_BONUS'),
      creatorCommissionRate: creator?.commissionRate ?? 70
    };
    const totalEarnings = calculateTotalEarnings(earningsData);
    const formattedEarnings = earnings.map(earning => ({
      id: earning.id,
      amount: parseFloat(earning.amount),
      type: earning.type,
      status: earning.status,
      impactTransactionId: earning.impactTransactionId,
      createdAt: earning.createdAt,
      link: earning.link ? { id: earning.link.id, destinationUrl: earning.link.destinationUrl, shortLink: earning.link.shortLink } : null
    }));

    res.json({
      // Legacy fields for existing UIs
      total,
      byType,
      byStatus,
      // New comprehensive payload
      earnings: formattedEarnings,
      summary: {
        total: totalEarnings.totalEarnings,
        breakdown: totalEarnings.breakdown,
        eligibleForPayout: totalEarnings.eligibleForPayout,
        count: earnings.length
      },
      creator: {
        commissionRate: creator?.commissionRate ?? 70,
        salesBonus: parseFloat(creator?.salesBonus || 0)
      }
    });
  } catch (err) {
    console.error('Creator earnings (compat) error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// NEW: Pending earnings (net) derived from network PENDING/LOCKED actions
router.get('/pending-earnings', requireAuth, requireApprovedCreator, async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return res.json({ pendingNet: 0 });

    // CRITICAL FIX: Use the same SubId1 computation as tracking links
    const ImpactWebService = require('../services/impactWebService');
    const impact = new ImpactWebService();
    
    // Declare variables at function scope
    let correctSubId1;
    let rate = 70; // Default commission rate
    
    // Get creator's actual Impact.com SubId1 from database, or compute it
    try {
      // First, try to get the actual Impact.com SubId1 if stored
      const creatorWithSubId = await prisma.creator.findUnique({ 
        where: { id: req.user.id }, 
        select: { 
          commissionRate: true,
          impactSubId: true  // This field exists in the schema
        } 
      });
      
      if (creatorWithSubId?.impactSubId) {
        // Use the stored Impact.com SubId1
        correctSubId1 = creatorWithSubId.impactSubId;
        console.log(`[Pending Earnings] Using stored Impact.com SubId1: ${correctSubId1}`);
      } else {
        // Fallback to computed SubId1 (for backward compatibility)
        correctSubId1 = impact.computeObfuscatedSubId(req.user.id);
        console.log(`[Pending Earnings] Using computed SubId1: ${correctSubId1}`);
        
        // Log warning about missing SubId1 mapping
        console.warn(`[Pending Earnings] WARNING: No Impact.com SubId1 stored for user ${req.user.id}. Consider updating the database.`);
      }
      
      // Update commission rate
      rate = creatorWithSubId?.commissionRate ?? 70;
      
    } catch (dbError) {
      console.error('[Pending Earnings] Database error:', dbError.message);
      // Fallback to computed SubId1
      correctSubId1 = impact.computeObfuscatedSubId(req.user.id);
      rate = 70; // Default rate
    }
    
    // SAFETY CHECK: Validate SubId1
    if (!correctSubId1 || correctSubId1 === 'default') {
      console.error(`[Pending Earnings] CRITICAL: Invalid SubId1 for user ${req.user.id}: ${correctSubId1}`);
      return res.status(500).json({ 
        error: 'Unable to determine creator identifier',
        pendingNet: 0 
      });
    }
    
    // ADDITIONAL SAFETY: Check if this creator has any Impact.com activity
    // This prevents showing big numbers for creators with zero activity
    console.log(`[Pending Earnings] User ID: ${req.user.id}, Final SubId1: ${correctSubId1}`);
    
    // Validate that the SubId1 is actually associated with this creator
    // This prevents data mixing between different creators
    if (correctSubId1 === req.user.id) {
      console.warn(`[Pending Earnings] WARNING: SubId1 matches user ID - possible data mixing risk`);
    }
    
    console.log(`[Pending Earnings] User ID: ${req.user.id}, Final SubId1: ${correctSubId1}`);
    
    const now = new Date();
    const fmt = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
    const isYmd = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
    const qsStart = isYmd(req.query.startDate) ? req.query.startDate : null;
    const qsEnd = isYmd(req.query.endDate) ? req.query.endDate : null;
    
    // FIXED: Proper date range calculation
    let startDateYmd, endDateYmd;
    if (qsStart && qsEnd) {
      // Use exact dates if provided
      startDateYmd = qsStart;
      endDateYmd = qsEnd;
    } else {
      // Calculate relative date range
      const days = Math.max(1, Math.min(90, Number(req.query.days) || 30));
      endDateYmd = fmt(now);
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days + 1); // +1 to include today
      startDateYmd = fmt(startDate);
    }
    
    console.log(`[Pending Earnings] Date range: ${startDateYmd} to ${endDateYmd}`);

    let source = 'reports';
    let gross = 0;
    try {
      const report = await impact.getPendingFromActionListingReport({
        subId1: correctSubId1, // FIXED: Use computed SubId1, not database ID
        startDate: startDateYmd,
        endDate: endDateYmd
      });
      if (report.success) gross = report.gross || 0;
      console.log(`[Pending Earnings] Reports API result:`, { success: report.success, gross: report.gross, count: report.count, error: report.error, subId1: correctSubId1 });
    } catch (error) {
      console.error('[Pending Earnings] Reports API error:', error.message);
    }

    // Fallback to Actions API if Reports returned 0 (some accounts restrict reports)
    if (!gross) {
      source = 'actions_fallback';
      console.log('[Pending Earnings] Falling back to Actions API...');
      // Fetch actions page by page with safe fallback (cap to avoid heavy calls)
      const fetchAll = async (status) => {
        const collected = [];
        let page = 1;
        let total = Infinity;
        const pageSize = 100;
        while ((page - 1) * pageSize < total && page <= 10) {
          // Build ISO-Z range from start/end YMD
          const startIso = `${startDateYmd}T00:00:00Z`;
          const endIso = `${endDateYmd}T23:59:59Z`;
          const r = await impact.getActionsDetailed({ startDate: startIso, endDate: endIso, status, actionType: 'SALE', subId1: correctSubId1, page, pageSize, noRetry: false }); // FIXED: Use computed SubId1
          const arr = Array.isArray(r.actions) ? r.actions : [];
          collected.push(...arr);
          total = r.totalResults || total;
          if (arr.length < pageSize) break;
          page += 1;
        }
        return collected;
      };

      let actions = await fetchAll('PENDING');
      const getActionDate = (a) => new Date(a.EventDate || a.CreatedDate || a.CreationDate || a.LockingDate || a.EventTime || now);
      const startBound = new Date(`${startDateYmd}T00:00:00Z`);
      const endBound = new Date(`${endDateYmd}T23:59:59Z`);
      actions = actions.filter(a => {
        const d = getActionDate(a);
        return d >= startBound && d <= endBound;
      });
      const readNumber = (v) => {
        if (v === null || v === undefined) return 0;
        const s = String(v).replace(/[^0-9.-]/g, '');
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : 0;
      };
      const getCommissionValue = (a) => {
        const payout = readNumber(a.Payout);
        if (payout) return payout;
        return readNumber(a.Commission);
      };
      const seen = new Set();
      const unique = [];
      for (const a of actions) {
        const id = a.Id || a.ActionId || a.TransactionId || `${a.CampaignId || ''}:${a.EventDate || ''}:${a.Payout || a.Commission || ''}`;
        if (seen.has(id)) continue;
        seen.add(id);
        unique.push(a);
      }
      gross = unique.reduce((sum, a) => sum + getCommissionValue(a), 0);
      console.log(`[Pending Earnings] Actions API fallback: ${unique.length} unique actions, gross: ${gross}, subId1: ${correctSubId1}`);
    }

    // CRITICAL SAFETY: If both APIs return 0, ensure we don't show big numbers
    if (gross === 0) {
      console.log(`[Pending Earnings] No Impact.com activity found for SubId1: ${correctSubId1} in date range: ${startDateYmd} to ${endDateYmd}`);
      console.log(`[Pending Earnings] Creator ${req.user.id} has zero pending earnings - returning 0`);
      
      // Return zero with debug info
      const debugInfo = {
        source: 'zero_activity',
        days: req.query.days || 'custom',
        startDate: startDateYmd,
        endDate: endDateYmd,
        gross: 0,
        subId1: correctSubId1,
        userId: req.user.id,
        commissionRate: rate,
        reason: 'No Impact.com activity found'
      };
      res.set('X-Pending-Debug', JSON.stringify(debugInfo));
      res.set('Cache-Control', 'no-store');
      return res.json({ pendingNet: 0, count: 0, reason: 'No pending earnings found' });
    }

    const net = parseFloat(((gross * rate) / 100).toFixed(2));
    console.log(`[Pending Earnings] Final calculation: gross=${gross}, rate=${rate}%, net=${net}, subId1=${correctSubId1}`);

    // Debug header for admins
    const debugInfo = {
      source,
      days: req.query.days || 'custom',
      startDate: startDateYmd,
      endDate: endDateYmd,
      gross,
      subId1: correctSubId1,
      userId: req.user.id,
      commissionRate: rate
    };
    res.set('X-Pending-Debug', JSON.stringify(debugInfo));
    res.set('Cache-Control', 'no-store');
    res.json({ pendingNet: net, count: undefined });
  } catch (error) {
    console.error('[Pending Earnings] Critical error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
    
    // Return safe error response
    res.status(500).json({ 
      error: 'Unable to fetch pending earnings',
      pendingNet: 0,
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// NEW: Professional Earnings Summary - Combines pending + approved + analytics
router.get('/earnings-summary', requireAuth, requireApprovedCreator, async (req, res) => {
  console.log(`[Earnings Summary] 🚀 ENDPOINT CALLED - Creator ID: ${req.user.id}`);
  console.log(`[Earnings Summary] 🔍 REQUEST DETAILS - User: ${JSON.stringify(req.user)}`);
  try {
    const prisma = getPrisma();
    if (!prisma) return res.json({ 
      commissionEarned: 0, 
      availableForWithdraw: 0, 
      pendingApproval: 0, 
      totalEarnings: 0,
      payoutsRequested: 0,
      analytics: { conversionRate: 0, averageOrderValue: 0, totalActions: 0 }
    });

    // Get creator info
    const creator = await prisma.creator.findUnique({
      where: { id: req.user.id },
      select: { commissionRate: true, impactSubId: true, email: true }
    });
    const rate = creator?.commissionRate ?? 70;
    
    // DEBUG: Special logging for sohailkhan521456@gmail.com
    console.log(`[Earnings Summary] 🔍 ALL CREATORS - Creator ID: ${req.user.id}, Email: ${creator?.email || 'UNKNOWN'}`);
    
    // Check if this is Sohail's account by ID or email
    const isSohail = req.user.id === '3bbffc5d-e3f7-4c27-91e2-4aefaa063657' || creator?.email === 'sohailkhan521456@gmail.com';
    
    if (isSohail) {
      console.log(`[Earnings Summary] 🔍 DEBUGGING Sohail's Account:`);
      console.log(`[Earnings Summary] 👤 Creator ID: ${req.user.id}`);
      console.log(`[Earnings Summary] 📧 Email: ${creator?.email || 'UNKNOWN'}`);
      console.log(`[Earnings Summary] 💰 Commission Rate: ${rate}%`);
      console.log(`[Earnings Summary] 🆔 Impact SubId: ${creator?.impactSubId || 'NULL (will compute)'}`);
      console.log(`[Earnings Summary] 🎯 ID Match: ${req.user.id === '3bbffc5d-e3f7-4c27-91e2-4aefaa063657'}`);
      console.log(`[Earnings Summary] 🎯 Email Match: ${creator?.email === 'sohailkhan521456@gmail.com'}`);
    }

    // Proper date range logic with custom date support
    const now = new Date();
    
    // Use ISO date format for consistency and avoid timezone issues
    const fmt = (d) => d.toISOString().split('T')[0];
    const isYmd = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
    
    let startDate, endDate, effectiveDays;
    
    // Check if custom date range is provided
    const customStart = req.query.startDate;
    const customEnd = req.query.endDate;
    let requestedDays; // Define this for both branches
    
    if (isYmd(customStart) && isYmd(customEnd)) {
      // Use custom date range
      startDate = customStart;
      endDate = customEnd;
      const startDateObj = new Date(customStart);
      const endDateObj = new Date(customEnd);
      effectiveDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      requestedDays = effectiveDays; // Set to the same as effective days for custom ranges
      console.log(`[Earnings Summary] Using CUSTOM date range: ${customStart} to ${customEnd} (${effectiveDays} days)`);
      } else {
      // Use days parameter for preset ranges
      const rawDays = Number(req.query.days) || 30;
      requestedDays = Math.max(1, Math.min(90, rawDays));
        effectiveDays = requestedDays;
      endDate = fmt(now);
      
      // FIXED: Subtract (days - 1) to include the current day in the range
      // 30 days = today + 29 previous days = 30 days total
      // 90 days = today + 89 previous days = 90 days total
      const startDateObj = new Date(now.getTime() - ((effectiveDays - 1) * 24 * 60 * 60 * 1000));
      startDate = fmt(startDateObj);
      
      console.log(`[Earnings Summary] Using PRESET range: ${requestedDays} days (${startDate} to ${endDate})`);
      console.log(`[Earnings Summary] DEBUG: rawDays=${rawDays}, requestedDays=${requestedDays}, effectiveDays=${effectiveDays}, startDate=${startDate}, endDate=${endDate}`);
      
      // Special debugging for 90 days
      if (rawDays === 90) {
        console.log(`[Earnings Summary] 🔍 90 DAYS DEBUG:`);
        console.log(`[Earnings Summary] 📅 Now: ${now.toISOString()}`);
        console.log(`[Earnings Summary] 📅 Start date object: ${startDateObj.toISOString()}`);
        console.log(`[Earnings Summary] 📅 Days difference: ${Math.ceil((now.getTime() - startDateObj.getTime()) / (24 * 60 * 60 * 1000))} days`);
        console.log(`[Earnings Summary] 📅 Expected: 90 days, Actual: ${Math.ceil((now.getTime() - startDateObj.getTime()) / (24 * 60 * 60 * 1000))} days`);
      }
    }

    console.log(`[Earnings Summary] Final date range: ${startDate} to ${endDate} (${effectiveDays} days)`);
    console.log(`[Earnings Summary] Date calculation debug: now=${now.toISOString()}, effectiveDays=${effectiveDays}, strategy=custom_and_preset_support`);

    // Set cache control headers to prevent caching issues
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');

    // 1. Get Pending Earnings from Impact.com (COMMISSIONABLE ONLY - same as analytics)
    let pendingGross = 0;
    let pendingActions = 0;
    try {
      const ImpactWebService = require('../services/impactWebService');
      const impact = new ImpactWebService();
      
      // Use stored SubId1 or compute it
      const correctSubId1 = creator?.impactSubId || impact.computeObfuscatedSubId(req.user.id);
      
      // DEBUG: Special logging for sohailkhan521456@gmail.com
      if (creator?.email === 'sohailkhan521456@gmail.com') {
        console.log(`[Earnings Summary] 🔍 Sohail's SubId1 Analysis:`);
        console.log(`[Earnings Summary] 📊 Stored SubId1: ${creator.impactSubId || 'NULL'}`);
        console.log(`[Earnings Summary] 🧮 Computed SubId1: ${impact.computeObfuscatedSubId(req.user.id)}`);
        console.log(`[Earnings Summary] ✅ Using SubId1: ${correctSubId1}`);
      }
      
      if (correctSubId1 && correctSubId1 !== 'default') {
        console.log(`[Earnings Summary] Fetching commissionable actions for SubId1: ${correctSubId1}`);
        
        // DEBUG: Special logging for sohailkhan521456@gmail.com
        if (creator?.email === 'sohailkhan521456@gmail.com') {
          console.log(`[Earnings Summary] 🔍 Sohail's API Call Details:`);
          console.log(`[Earnings Summary] 📅 Date range: ${startDate} to ${endDate}`);
          console.log(`[Earnings Summary] 🆔 SubId1: ${correctSubId1}`);
          console.log(`[Earnings Summary] 📊 Page size: 1000`);
          console.log(`[Earnings Summary] 🔍 API endpoint: getActionsDetailed`);
          console.log(`[Earnings Summary] 🔍 Impact.com Dashboard shows: $954.18 commission, 619 sales, 6,544 clicks`);
          console.log(`[Earnings Summary] 🔍 API returning: $63.33 commission, 20 sales, 1,822 clicks`);
          console.log(`[Earnings Summary] ⚠️ MAJOR DISCREPANCY DETECTED!`);
        }
        
        // DEBUG: Date format is now handled properly in ImpactWebService.getActionsDetailed()
        // The service now uses ISO 8601 format with time and Z suffix as per documentation
        console.log(`[Earnings Summary] 🔍 Using date range: ${startDate} to ${endDate}`);
        console.log(`[Earnings Summary] 📚 ImpactWebService will convert to proper ISO 8601 format`);
        
        // Get detailed actions to filter for commissionable only (same as analytics-enhanced)
        const detailedActions = await impact.getActionsDetailed({
          startDate: startDate,
          endDate: endDate,
          subId1: correctSubId1,
          pageSize: 1000
        });
        
        if (detailedActions.success && detailedActions.actions) {
          const actions = detailedActions.actions;
          
          // DEBUG: Special logging for sohailkhan521456@gmail.com
          if (creator?.email === 'sohailkhan521456@gmail.com') {
            console.log(`[Earnings Summary] 🔍 Sohail's API Response Analysis:`);
            console.log(`[Earnings Summary] 📊 Total actions received: ${actions.length}`);
            console.log(`[Earnings Summary] 🎯 Looking for SubId1: ${correctSubId1}`);
            
            // If we're getting significantly less data than expected, try Reports API
            if (actions.length < 500) { // Expected around 600+ based on Impact.com dashboard
              console.log(`[Earnings Summary] ⚠️ Low action count detected, trying Reports API as fallback`);
              try {
                const reportsData = await impact.getImpactReportsData({
                  startDate,
                  endDate,
                  subId1: correctSubId1
                });
                
                if (reportsData.success && reportsData.data) {
                  console.log(`[Earnings Summary] 📊 Reports API returned ${reportsData.data.length} records`);
                  // Use Reports API data if it has more records
                  if (reportsData.data.length > actions.length) {
                    console.log(`[Earnings Summary] ✅ Using Reports API data (${reportsData.data.length} vs ${actions.length})`);
                    // Convert Reports API format to Actions format for compatibility
                    const convertedActions = reportsData.data.map(record => ({
                      SubId1: record.SubId1,
                      Payout: record.Commission || record.Payout,
                      Commission: record.Commission || record.Payout,
                      Amount: record.Sales || record.Amount,
                      SaleAmount: record.Sales || record.Amount,
                      IntendedAmount: record.Sales || record.Amount,
                      EventDate: record.Date || record.EventDate,
                      ActionDate: record.Date || record.ActionDate,
                      CreationDate: record.Date || record.CreationDate,
                      Id: record.Id || record.ActionId,
                      ActionId: record.Id || record.ActionId,
                      State: record.Status || record.State,
                      Status: record.Status || record.State,
                      ActionStatus: record.Status || record.ActionStatus,
                      ProductName: record.Product || record.ProductName,
                      Product: record.Product || record.ProductName,
                      CampaignName: record.Campaign || record.CampaignName
                    }));
                    
                    // Replace actions with converted Reports API data
                    actions.length = 0;
                    actions.push(...convertedActions);
                    console.log(`[Earnings Summary] ✅ Converted ${convertedActions.length} Reports API records to Actions format`);
                  }
                }
              } catch (reportsError) {
                console.log(`[Earnings Summary] ⚠️ Reports API fallback failed: ${reportsError.message}`);
              }
            }
          }
          
          // Filter for this creator's actions
          const creatorActions = actions.filter(action => 
            action.SubId1 === correctSubId1
          );
          
          // DEBUG: Special logging for sohailkhan521456@gmail.com
          if (creator?.email === 'sohailkhan521456@gmail.com') {
            console.log(`[Earnings Summary] 🔍 Sohail's Action Filtering:`);
            console.log(`[Earnings Summary] 📊 Creator actions found: ${creatorActions.length}`);
            if (creatorActions.length === 0 && actions.length > 0) {
              console.log(`[Earnings Summary] ⚠️ No actions match SubId1! Sample SubId1s from actions:`);
              actions.slice(0, 5).forEach((action, i) => {
                console.log(`[Earnings Summary] 📋 Action ${i+1}: SubId1="${action.SubId1}"`);
              });
            }
          }
          
          // Filter for ONLY commissionable actions (commission > 0) - same as analytics
          const commissionableActions = creatorActions.filter(action => {
            const commission = parseFloat(action.Payout || action.Commission || 0);
            return commission > 0;
          });
          
          pendingActions = commissionableActions.length;
          
          // Calculate gross commission from commissionable actions
          pendingGross = commissionableActions.reduce((sum, action) => {
            return sum + parseFloat(action.Payout || action.Commission || 0);
          }, 0);
          
          // DEBUG: Special logging for sohailkhan521456@gmail.com
          if (creator?.email === 'sohailkhan521456@gmail.com') {
            console.log(`[Earnings Summary] 🔍 Sohail's Commission Analysis:`);
            console.log(`[Earnings Summary] 📊 Total actions: ${creatorActions.length}`);
            console.log(`[Earnings Summary] 📊 Commissionable actions: ${pendingActions}`);
            console.log(`[Earnings Summary] 💰 Gross commission from Impact.com: $${pendingGross}`);
            console.log(`[Earnings Summary] 💰 Expected from Impact.com dashboard: $954.18`);
            console.log(`[Earnings Summary] 🔍 Sample commissionable actions:`);
            commissionableActions.slice(0, 5).forEach((action, i) => {
              const commission = parseFloat(action.Payout || action.Commission || 0);
              const saleAmount = parseFloat(action.Amount || action.SaleAmount || action.IntendedAmount || 0);
              console.log(`[Earnings Summary] 📋 Action ${i+1}: Commission=$${commission}, Sale=$${saleAmount}, SubId1=${action.SubId1}`);
            });
            
            // Calculate total sales amount for comparison
            const totalSalesAmount = commissionableActions.reduce((sum, action) => {
              return sum + parseFloat(action.Amount || action.SaleAmount || action.IntendedAmount || 0);
            }, 0);
            console.log(`[Earnings Summary] 💰 Total sales amount: $${totalSalesAmount.toFixed(2)}`);
            console.log(`[Earnings Summary] 💰 Expected total sales from network: $27,940.89`);
            console.log(`[Earnings Summary] 🔍 Sales data match: ${Math.abs(totalSalesAmount - 27940.89) < 100 ? '✅ MATCH' : '❌ MISMATCH'}`);
          }
          
          console.log(`[Earnings Summary] ✅ Filtered to COMMISSIONABLE ONLY:`);
          console.log(`  - Total actions: ${creatorActions.length}`);
          console.log(`  - Commissionable actions: ${pendingActions}`);
          console.log(`  - Gross commission: $${pendingGross}`);
        } else {
          console.log(`[Earnings Summary] ⚠️ Could not get detailed actions, using fallback`);
          
          // Fallback to basic pending report
          const allActionsReport = await impact.getPendingFromActionListingReport({
            subId1: correctSubId1,
            startDate,
            endDate
          });
          
          if (allActionsReport.success) {
            pendingGross = allActionsReport.gross || 0;
            pendingActions = allActionsReport.count || 0;
            console.log(`[Earnings Summary] Fallback - ALL Actions: $${pendingGross} from ${pendingActions} actions`);
          }
        }
      }
    } catch (error) {
      console.error('[Earnings Summary] Error fetching pending earnings:', error.message);
    }

    // 2. Get All Approved Earnings (COMPLETED + PROCESSING status) from Database
    // FIXED: Remove date filtering to get all historical earnings (not just date range)
    const approvedEarnings = await prisma.earning.findMany({
      where: { 
        creatorId: req.user.id,
        status: { in: ['COMPLETED', 'PROCESSING'] } // Include completed and processing earnings
        // REMOVED: Date filtering - get all historical earnings
      },
      select: { 
        amount: true, 
        status: true
      }
    });
    
    // Separate approved earnings: ready for withdrawal vs total approved
    // SAFETY: Use existing amount field (already calculated correctly when created)
    const completedEarnings = approvedEarnings.filter(e => e.status === 'COMPLETED');
    const availableForWithdraw = completedEarnings.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalApprovedAmount = approvedEarnings.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    // CRITICAL DEBUG: Show actual earnings data
    console.log(`[Earnings Summary] 🔍 DEBUGGING EARNINGS:`)
    console.log(`[Earnings Summary] 📊 Total approved earnings found: ${approvedEarnings.length}`);
    console.log(`[Earnings Summary] 💰 Total approved amount: $${totalApprovedAmount}`);
    console.log(`[Earnings Summary] 💰 Available for withdraw: $${availableForWithdraw}`);
    console.log(`[Earnings Summary] 📅 Date range: ${startDate} to ${endDate}`);
    
    // Check if there are ANY earnings for this creator (not just in date range)
    const allEarnings = await prisma.earning.findMany({
      where: { creatorId: req.user.id },
      select: { amount: true, status: true, createdAt: true }
    });
    console.log(`[Earnings Summary] 🔍 Total earnings in database: ${allEarnings.length}`);
    console.log(`[Earnings Summary] 🔍 All earnings amounts:`, allEarnings.map(e => ({ amount: e.amount, status: e.status, date: e.createdAt })));
    
    // EMERGENCY DISABLE: Remove all snapshot logic that might be causing inflated earnings
    console.log(`[Earnings Summary] 🚨 EMERGENCY MODE: All snapshot logic disabled`);
    console.log(`[Earnings Summary] 🛡️ Using safe legacy calculation only`);
    
    console.log(`[Earnings Summary] 🔍 Database earnings analysis complete`);
    
    // EMERGENCY: Disable all snapshot logic - using only safe legacy calculation
    let useSnapshotSystem = false;
    let snapshotEarnings = 0;
    console.log(`[Earnings Summary] 🚨 EMERGENCY: Snapshot system completely disabled`);
    
    // IMPORTANT: We use existing 'amount' field which is already correctly calculated
    // This ensures no retroactive changes to historical earnings
    
    console.log(`[Earnings Summary] Total approved earnings (COMPLETED + PROCESSING): $${totalApprovedAmount}`);
    console.log(`[Earnings Summary] Available for withdraw (COMPLETED only): $${availableForWithdraw}`);

    // 3. Get Payouts Requested
    const payoutsRequested = await prisma.payoutRequest.findMany({
      where: { 
        creatorId: req.user.id,
        status: 'PENDING'
      },
      select: { amount: true }
    });
    
    const totalPayoutsRequested = payoutsRequested.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // 4. Calculate Totals - Commission Earned should show Pending + ALL Approved (as stated in UI)
    // NEW: Forward-only commission rate calculation with safety fallbacks
    let pendingNet = 0;
    
    // URGENT FIX: Prevent retroactive commission calculation until schema is migrated
    // Instead of using current rate for pending calculations, use a fixed approach
    console.log(`[Earnings Summary] 🛡️ ANTI-RETROACTIVE PROTECTION: Using fixed calculation`);
    
    // Check if this creator has had their commission rate recently changed
    // If so, we need to be more careful about calculations
    console.log(`[Earnings Summary] 📊 Current creator rate: ${rate}%`);
    console.log(`[Earnings Summary] 💰 Pending gross from Impact.com: $${pendingGross}`);
    
    // PHASE 4: Use snapshots if available, with complete fallback protection
    if (useSnapshotSystem && snapshotEarnings > 0) {
      // Use point-in-time snapshots (immune to commission rate changes)
      pendingNet = snapshotEarnings;
      console.log(`[Earnings Summary] ✅ Using snapshot earnings: $${pendingNet} (point-in-time preserved)`);
      console.log(`[Earnings Summary] 🛡️ These earnings are locked and immune to rate changes`);
    } else {
      // SAFETY FALLBACK: Use current calculation method
      pendingNet = parseFloat(((pendingGross * rate) / 100).toFixed(2));
      console.log(`[Earnings Summary] 🔄 Using legacy calculation: $${pendingGross} gross × ${rate}% = $${pendingNet} net`);
      console.log(`[Earnings Summary] ⚠️ This calculation may change if commission rate is modified`);
    }
    
    const commissionEarned = pendingNet + totalApprovedAmount; // Use total approved, not just available for withdraw
    const totalEarnings = commissionEarned;

    // DEBUG: Special logging for sohailkhan521456@gmail.com
    if (creator?.email === 'sohailkhan521456@gmail.com') {
      console.log(`[Earnings Summary] 🔍 Sohail's Final Calculation for ${requestedDays} days:`);
      console.log(`[Earnings Summary] 📅 Date range: ${startDate} to ${endDate}`);
      console.log(`[Earnings Summary] 💰 Pending gross from Impact.com: $${pendingGross}`);
      console.log(`[Earnings Summary] 💰 Commission rate: ${rate}%`);
      console.log(`[Earnings Summary] 💰 Pending net (after rate): $${pendingNet}`);
      console.log(`[Earnings Summary] 💰 Database earnings: $${totalApprovedAmount}`);
      console.log(`[Earnings Summary] 💰 Final commission earned: $${commissionEarned}`);
      console.log(`[Earnings Summary] 🔍 Calculation: $${pendingGross} × ${rate}% + $${totalApprovedAmount} = $${commissionEarned}`);
      console.log(`[Earnings Summary] ✅ FIXED: Using both Impact.com and ALL database earnings (no date filter)`);
    }

    // 5. Get Analytics Data
    const analytics = {
      conversionRate: pendingActions > 0 ? ((pendingActions / (pendingActions * 10)) * 100).toFixed(1) : 0, // Estimate
      averageOrderValue: pendingActions > 0 ? parseFloat((pendingGross / pendingActions).toFixed(2)) : 0,
      totalActions: pendingActions,
      totalClicks: pendingActions * 10, // Estimate based on typical conversion rates
      revenue: pendingGross
    };

    const summary = {
      commissionEarned: parseFloat(commissionEarned.toFixed(2)), // Pending + All approved commissions (COMPLETED + PROCESSING)
      availableForWithdraw: parseFloat(availableForWithdraw.toFixed(2)), // Only COMPLETED earnings ready for withdrawal
      pendingApproval: parseFloat(pendingNet.toFixed(2)), // Pending commissions from Impact.com with business rate applied
      totalEarnings: parseFloat(totalEarnings.toFixed(2)),
      payoutsRequested: parseFloat(totalPayoutsRequested.toFixed(2)),
      analytics,
      period: {
        requestedDays,
        effectiveDays,
        startDate,
        endDate
      },
      creator: {
        commissionRate: rate,
        impactSubId: creator?.impactSubId
      }
    };

    console.log(`[Earnings Summary] Final summary:`, summary);

    res.json(summary);

  } catch (error) {
    console.error('[Earnings Summary] Error:', error.message);
    res.status(500).json({ 
      error: 'Unable to fetch earnings summary',
      commissionEarned: 0,
      availableForWithdraw: 0,
      pendingApproval: 0,
      totalEarnings: 0
    });
  }
});

// GET payment setup - retrieve existing payment details
router.get('/payment-setup', requireAuth, async (req, res) => {
  try {
    console.log('🔍 Payment setup endpoint called for user:', req.user.id);
    
    const prisma = getPrisma();
    if (!prisma) {
      console.log('❌ No Prisma client available');
      return res.status(503).json({ message: 'Database not configured' });
    }
    
    console.log('✅ Prisma client available, querying payment account...');
    
    let paymentAccount = null;
    
    // Try to find in main table first
    try {
      paymentAccount = await prisma.paymentAccount.findUnique({
      where: { creatorId: req.user.id }
    });
      console.log('✅ Main table query result:', paymentAccount ? 'Found' : 'Not found');
    } catch (mainTableError) {
      console.log('⚠️ Main table query failed:', mainTableError.message);
    }
    
    // If not found in main table, try fallback table
    if (!paymentAccount) {
      console.log('🔄 No data in main table, checking fallback table...');
      try {
        const fallbackResult = await prisma.$queryRaw`
          SELECT * FROM "PaymentAccountFallback" WHERE "creatorId" = ${req.user.id}
        `;
        
        if (fallbackResult && fallbackResult.length > 0) {
          paymentAccount = fallbackResult[0];
          console.log('✅ Fallback table query result: Found');
        } else {
          console.log('✅ Fallback table query result: Not found');
        }
      } catch (fallbackError) {
        console.log('⚠️ Fallback table query failed:', fallbackError.message);
      }
    }
    
    if (!paymentAccount) {
      console.log('📝 No payment method found in any table');
      return res.json({ hasPaymentMethod: false });
    }
    
    // Map schema enum values back to frontend values
    const frontendTypeMapping = {
      'BANK_ACCOUNT': 'BANK',
      'PAYPAL': 'PAYPAL', 
      'CRYPTO_WALLET': 'CRYPTO'
    };
    
    const type = frontendTypeMapping[paymentAccount.accountType] || paymentAccount.accountType;
    console.log('✅ Mapped account type:', paymentAccount.accountType, '->', type);
    console.log('✅ Account details preview:', JSON.stringify(paymentAccount.accountDetails).substring(0, 100));
    
    res.json({
      hasPaymentMethod: true,
      id: paymentAccount.id,
      type: type,
      accountDetails: paymentAccount.accountDetails,
      isVerified: paymentAccount.isVerified || false,
      createdAt: paymentAccount.createdAt
    });
  } catch (error) {
    console.error('❌ Payment retrieval error:', error);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    res.status(500).json({ message: 'Failed to retrieve payment method', error: error.message });
  }
});

router.post('/payment-setup', requireAuth, async (req, res) => {
  try {
    console.log('🔍 Payment setup endpoint called for user:', req.user.id);
    console.log('📝 Request body:', req.body);
    
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });
    const { type, accountDetails } = req.body || {};
    if (!type || !accountDetails) return res.status(400).json({ message: 'type and accountDetails required' });
    
    // Map frontend type to schema enum values
    const accountTypeMapping = {
      'BANK': 'BANK_ACCOUNT',
      'PAYPAL': 'PAYPAL', 
      'CRYPTO': 'CRYPTO_WALLET'
    };
    
    // Only allow BANK and PAYPAL from frontend (even though CRYPTO exists in DB schema)
    if (type !== 'BANK' && type !== 'PAYPAL') {
      return res.status(400).json({ message: 'Invalid payment type. Only BANK and PAYPAL are supported.' });
    }
    
    const accountType = accountTypeMapping[type];
    if (!accountType) return res.status(400).json({ message: 'Invalid payment type.' });
    
    // Validate account details based on type
    if (type === 'BANK') {
      const { accountName, accountNumber, routingNumber, bankName } = accountDetails;
      if (!accountName || !accountNumber || !routingNumber || !bankName) {
        return res.status(400).json({ message: 'Missing required bank account fields' });
      }
    } else if (type === 'PAYPAL') {
      const { email } = accountDetails;
      if (!email) {
        return res.status(400).json({ message: 'PayPal email address is required' });
      }
    }
    
    console.log('✅ Validation passed, upserting payment account...');
    console.log('📝 Upserting with data:', { creatorId: req.user.id, accountType, accountDetails });
    
    // Try to find existing payment account first
    let upserted;
    try {
      const existing = await prisma.paymentAccount.findUnique({
        where: { creatorId: req.user.id }
      });
      
      if (existing) {
        // Update existing record
        console.log('📝 Updating existing payment account:', existing.id);
        upserted = await prisma.paymentAccount.update({
      where: { creatorId: req.user.id },
          data: { accountType, accountDetails, updatedAt: new Date() }
        });
      } else {
        // Create new record
        console.log('📝 Creating new payment account');
        upserted = await prisma.paymentAccount.create({
          data: { creatorId: req.user.id, accountType, accountDetails }
        });
      }
      
      console.log('✅ Payment account operation successful:', upserted.id);
      console.log('📤 Sending success response');
      res.status(201).json({ paymentAccountId: upserted.id, message: 'Payment method saved successfully' });
      
    } catch (dbError) {
      console.error('❌ Database operation failed:', dbError);
      console.error('❌ Error details:', {
        name: dbError.name,
        message: dbError.message,
        code: dbError.code,
        meta: dbError.meta
      });
      
      // If it's a schema-related error, try to create the enum first, then insert
      if (dbError.message && (dbError.message.includes('Invalid `prisma.paymentAccount') || dbError.message.includes('column: None') || dbError.message.includes('does not exist'))) {
        console.log('🔄 Database schema issue detected. Creating enum and table if needed...');
        try {
          // First, create the enum if it doesn't exist
          await prisma.$executeRaw`
            DO $$ BEGIN
              CREATE TYPE "PaymentAccountType" AS ENUM ('BANK_ACCOUNT', 'PAYPAL', 'CRYPTO_WALLET');
            EXCEPTION
              WHEN duplicate_object THEN null;
            END $$;
          `;
          
          // Ensure the table exists with correct structure
          await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "PaymentAccount" (
              "id" TEXT NOT NULL,
              "creatorId" TEXT NOT NULL,
              "accountType" "PaymentAccountType" NOT NULL,
              "accountDetails" JSONB NOT NULL,
              "isVerified" BOOLEAN NOT NULL DEFAULT false,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL,
              CONSTRAINT "PaymentAccount_pkey" PRIMARY KEY ("id"),
              CONSTRAINT "PaymentAccount_creatorId_key" UNIQUE ("creatorId")
            );
          `;
          
          console.log('✅ Database schema created/verified');
          
          // Now try the insert with proper enum
          const paymentId = crypto.randomUUID();
          await prisma.$executeRaw`
            INSERT INTO "PaymentAccount" ("id", "creatorId", "accountType", "accountDetails", "isVerified", "createdAt", "updatedAt")
            VALUES (${paymentId}, ${req.user.id}, ${accountType}::"PaymentAccountType", ${JSON.stringify(accountDetails)}::jsonb, false, NOW(), NOW())
            ON CONFLICT ("creatorId") 
            DO UPDATE SET 
              "accountType" = ${accountType}::"PaymentAccountType",
              "accountDetails" = ${JSON.stringify(accountDetails)}::jsonb,
              "updatedAt" = NOW()
          `;
          
          console.log('✅ Payment account created successfully with schema fix, ID:', paymentId);
          res.status(201).json({ paymentAccountId: paymentId, message: 'Payment method saved successfully (with schema fix)' });
          return;
          
        } catch (schemaError) {
          console.error('❌ Schema creation failed:', schemaError);
          
          // Final fallback - store as text without enum
          try {
            console.log('🔄 Final fallback: storing without enum...');
            const paymentId3 = crypto.randomUUID();
            
            // Create table without enum constraint as absolute fallback
            await prisma.$executeRaw`
              CREATE TABLE IF NOT EXISTS "PaymentAccountFallback" (
                "id" TEXT NOT NULL,
                "creatorId" TEXT NOT NULL,
                "accountType" TEXT NOT NULL,
                "accountDetails" JSONB NOT NULL,
                "isVerified" BOOLEAN NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL,
                CONSTRAINT "PaymentAccountFallback_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "PaymentAccountFallback_creatorId_key" UNIQUE ("creatorId")
              );
            `;
            
            await prisma.$executeRaw`
              INSERT INTO "PaymentAccountFallback" ("id", "creatorId", "accountType", "accountDetails", "isVerified", "createdAt", "updatedAt")
              VALUES (${paymentId3}, ${req.user.id}, ${accountType}, ${JSON.stringify(accountDetails)}::jsonb, false, NOW(), NOW())
              ON CONFLICT ("creatorId") 
              DO UPDATE SET 
                "accountType" = ${accountType},
                "accountDetails" = ${JSON.stringify(accountDetails)}::jsonb,
                "updatedAt" = NOW()
            `;
            
            console.log('✅ Fallback table created and data saved, ID:', paymentId3);
            res.status(201).json({ paymentAccountId: paymentId3, message: 'Payment method saved successfully (via fallback table)' });
            return;
            
          } catch (fallbackError) {
            console.error('❌ All attempts failed:', fallbackError);
          }
        }
      }
      
      throw dbError; // Re-throw to be caught by outer catch block
    }
  } catch (error) {
    console.error('❌ Payment setup error:', error);
    res.status(500).json({ message: 'Failed to save payment method', error: error.message });
  }
});

// NEW: Enhanced Analytics with Real Impact.com Data
router.get('/analytics-enhanced', requireAuth, requireApprovedCreator, async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return res.json({ 
      earningsTrend: [], 
      performanceMetrics: { clicks: 0, conversions: 0, revenue: 0, conversionRate: 0 },
      topLinks: [],
      recentActivity: []
    });
    
    // Use the SAME date calculation method as earnings-summary (proven working)
    const requestedDays = Math.max(1, Math.min(90, Number(req.query.days) || 30));
    const now = new Date();
    
    console.log(`[Analytics Enhanced] Using SAME method as earnings-summary for ${requestedDays} days`);
    
    // Use the same simple, proven date calculation as earnings-summary
    const effectiveDays = requestedDays;
    const endDate = now.toISOString().split('T')[0];
    // FIXED: Subtract (days - 1) to include the current day in the range
    const startDateObj = new Date(now.getTime() - ((effectiveDays - 1) * 24 * 60 * 60 * 1000));
    const startDate = startDateObj.toISOString().split('T')[0];
    
    console.log(`[Analytics Enhanced] Using proven date range: ${startDate} to ${endDate} (${effectiveDays} days)`);
    console.log(`[Analytics Enhanced] DEBUG: requestedDays=${requestedDays}, effectiveDays=${effectiveDays}, startDate=${startDate}, endDate=${endDate}`);
    console.log(`[Analytics Enhanced] This matches earnings-summary date calculation`);
    
    // Special debugging for 90 days
    if (requestedDays === 90) {
      console.log(`[Analytics Enhanced] 🔍 90 DAYS DEBUG:`);
      console.log(`[Analytics Enhanced] 📅 Now: ${now.toISOString()}`);
      console.log(`[Analytics Enhanced] 📅 Start date object: ${startDateObj.toISOString()}`);
      console.log(`[Analytics Enhanced] 📅 Days difference: ${Math.ceil((now.getTime() - startDateObj.getTime()) / (24 * 60 * 60 * 1000))} days`);
    }

    // Set cache control headers to prevent caching issues
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    
    // 1. Get Real Impact.com Data (Real Clicks + Commissionable Sales Only)
    let impactData = { clicks: 0, conversions: 0, revenue: 0, conversionRate: 0 };
    let correctSubId1; // Declare at function scope
    let creator; // Declare at function scope
    let impact; // Declare at function scope
    
    try {
      const ImpactWebService = require('../services/impactWebService');
      impact = new ImpactWebService();
      
      // Get creator's SubId1
      creator = await prisma.creator.findUnique({
        where: { id: req.user.id },
        select: { impactSubId: true, commissionRate: true }
      });
      
      correctSubId1 = creator?.impactSubId || impact.computeObfuscatedSubId(req.user.id);
      
      if (correctSubId1 && correctSubId1 !== 'default') {
        console.log(`[Analytics Enhanced] Fetching REAL clicks + COMMISSIONABLE sales for SubId1: ${correctSubId1}`);
        
        // Step 1: Get REAL clicks from Performance by SubId report
        const performanceData = await impact.getPerformanceBySubId({
          startDate,
          endDate,
          subId1: correctSubId1
        });
        
        let realClicks = 0;
        if (performanceData.success && performanceData.data) {
          realClicks = performanceData.data.clicks || 0;
          console.log(`[Analytics Enhanced] ✅ Real clicks from Performance report: ${realClicks}`);
        }
        
        // Step 2: Get COMMISSIONABLE sales only from Actions API
        let realConversions = 0;
        let realRevenue = 0;
        
        const detailedActions = await impact.getActionsDetailed({
          startDate: startDate + 'T00:00:00Z',
          endDate: endDate + 'T23:59:59Z',
          subId1: correctSubId1,
          actionType: 'SALE',
          pageSize: 1000
        });
        
        if (detailedActions.success && detailedActions.actions) {
          // Filter for this creator's actions
          const creatorActions = detailedActions.actions.filter(action => 
            action.SubId1 === correctSubId1
          );
          
          // Filter for ONLY commissionable actions (commission > 0)
          const commissionableActions = creatorActions.filter(action => {
            const commission = parseFloat(action.Payout || action.Commission || 0);
            return commission > 0;
          });
          
          realConversions = commissionableActions.length;
          
          // Calculate revenue from commissionable actions only
          const grossRevenue = commissionableActions.reduce((sum, action) => {
            return sum + parseFloat(action.Payout || action.Commission || 0);
          }, 0);
          
          const businessRate = creator?.commissionRate || 70;
          realRevenue = (grossRevenue * businessRate) / 100;
          
          console.log(`[Analytics Enhanced] ✅ COMMISSIONABLE ONLY filtering:`);
          console.log(`  - Total actions: ${creatorActions.length}`);
          console.log(`  - Commissionable actions: ${realConversions}`);
          console.log(`  - Gross commission: $${grossRevenue.toFixed(2)}`);
          console.log(`  - Creator revenue (${businessRate}%): $${realRevenue.toFixed(2)}`);
          console.log(`  - Real clicks: ${realClicks}`);
        }
        
        // Calculate real conversion rate from real data
        const realConversionRate = realClicks > 0 ? 
          parseFloat(((realConversions / realClicks) * 100).toFixed(2)) : 0;
        
        impactData = {
          clicks: realClicks,
          conversions: realConversions,
          revenue: realRevenue,
          conversionRate: realConversionRate
        };
        
        console.log(`[Analytics Enhanced] ✅ FINAL REAL DATA:`, {
          clicks: realClicks,
          commissionableConversions: realConversions,
          revenue: realRevenue.toFixed(2),
          conversionRate: realConversionRate + '%'
        });
      }
    } catch (error) {
      console.error('[Analytics Enhanced] Error fetching Impact.com data:', error.message);
    }
    
    // 2. Get Database Data as Fallback
    const linkAgg = await prisma.link.aggregate({
      where: { creatorId: req.user.id },
      _sum: { conversions: true, revenue: true },
    });
    
    const shortLinkAgg = await prisma.shortLink.aggregate({
      where: { creatorId: req.user.id },
      _sum: { clicks: true },
    });
    
    // 3. Prioritize Impact.com Data - Only use database as absolute fallback
    const hasImpactData = impactData.clicks > 0 || impactData.conversions > 0 || impactData.revenue > 0;
    
    const finalData = {
      clicks: hasImpactData ? impactData.clicks : (shortLinkAgg._sum.clicks || 0),
      conversions: hasImpactData ? impactData.conversions : (linkAgg._sum.conversions || 0),
      revenue: hasImpactData ? impactData.revenue : Number(linkAgg._sum.revenue || 0),
      conversionRate: hasImpactData ? impactData.conversionRate : 0
    };
    
    // Recalculate conversion rate with final data
    if (finalData.clicks > 0 && finalData.conversions > 0) {
      finalData.conversionRate = parseFloat(((finalData.conversions / finalData.clicks) * 100).toFixed(2));
    }
    
    console.log(`[Analytics Enhanced] Using ${hasImpactData ? 'Impact.com' : 'database fallback'} data:`, {
      clicks: finalData.clicks,
      conversions: finalData.conversions,
      revenue: finalData.revenue.toFixed(2),
      conversionRate: finalData.conversionRate + '%'
    });
    
    console.log(`[Analytics Enhanced] 📊 Chart data distribution for ${requestedDays} days:`, {
      totalRevenue: finalData.revenue,
      totalCommission: (finalData.revenue * (creator?.commissionRate || 70) / 100),
      dailyRevenue: (finalData.revenue / requestedDays).toFixed(2),
      dailyCommission: ((finalData.revenue * (creator?.commissionRate || 70) / 100) / requestedDays).toFixed(2)
    });
    
    // 4. Generate Earnings Trend Data with Real Daily Data
    const earningsTrend = [];
    
    // Get real daily data from Impact.com if available
    let dailyData = {};
    if (hasImpactData && correctSubId1) {
      try {
        console.log(`[Analytics Enhanced] 🔍 Fetching all actions for ${requestedDays} days to group by day...`);
        
        // Fetch all actions for the entire period at once (more efficient)
        const allActions = await impact.getActionsDetailed({
          startDate: startDate + 'T00:00:00Z',
          endDate: endDate + 'T23:59:59Z',
          subId1: correctSubId1,
          actionType: 'SALE',
          pageSize: 1000
        });
        
        if (allActions.success && allActions.actions) {
          console.log(`[Analytics Enhanced] ✅ Fetched ${allActions.actions.length} total actions for period`);
          console.log(`[Analytics Enhanced] 🔍 Looking for SubId1: ${correctSubId1}`);
          
          // Debug: Show first few actions to understand the data structure
          if (allActions.actions.length > 0) {
            console.log(`[Analytics Enhanced] 🔍 First action sample:`, {
              SubId1: allActions.actions[0].SubId1,
              ActionDate: allActions.actions[0].ActionDate,
              Payout: allActions.actions[0].Payout,
              Commission: allActions.actions[0].Commission
            });
          }
          
          // Group actions by date
          const actionsByDate = {};
          let matchingActions = 0;
          allActions.actions.forEach(action => {
            if (action.SubId1 === correctSubId1) {
              matchingActions++;
              const actionDate = action.ActionDate ? action.ActionDate.split('T')[0] : null;
              console.log(`[Analytics Enhanced] 🔍 Action date: ${action.ActionDate} -> ${actionDate}`);
              if (actionDate) {
                if (!actionsByDate[actionDate]) {
                  actionsByDate[actionDate] = [];
                }
                actionsByDate[actionDate].push(action);
              }
            }
          });
          
          console.log(`[Analytics Enhanced] 📊 Found ${matchingActions} actions for SubId1: ${correctSubId1}`);
          console.log(`[Analytics Enhanced] 📊 Grouped actions by date:`, Object.keys(actionsByDate));
          
          // Process each day in the requested period
          for (let i = (requestedDays - 1); i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
            const dayActions = actionsByDate[dateStr] || [];
            const commissionableActions = dayActions.filter(action => {
              const commission = parseFloat(action.Payout || action.Commission || 0);
              return commission > 0;
            });
            
            const dailyGrossRevenue = commissionableActions.reduce((sum, action) => {
              return sum + parseFloat(action.Payout || action.Commission || 0);
            }, 0);
            
            const businessRate = creator?.commissionRate || 70;
            const dailyCommission = (dailyGrossRevenue * businessRate) / 100;
            const dailyConversions = commissionableActions.length;
            
            dailyData[dateStr] = {
              sales: dailyGrossRevenue,
              commission: dailyCommission,
              clicks: 0, // We don't have daily click data from Impact.com
              conversions: dailyConversions
            };
            
            console.log(`[Analytics Enhanced] 📅 ${dateStr}: ${dayActions.length} actions, ${dailyConversions} commissionable, $${dailyGrossRevenue.toFixed(2)} sales, $${dailyCommission.toFixed(2)} commission`);
          }
        } else {
          console.log(`[Analytics Enhanced] ⚠️ No actions data from Impact.com for period`);
        }
      } catch (error) {
        console.error('[Analytics Enhanced] Error fetching daily data:', error.message);
      }
    }
    
    // Generate trend data with real daily data or fallback distribution
    for (let i = (requestedDays - 1); i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Use real daily data if available, otherwise show zero (no simulated data)
      const dayData = dailyData[dateStr] || {
        sales: 0,
        commission: 0,
        clicks: 0,
        conversions: 0
      };
      
      earningsTrend.push({
        date: dateStr,
        revenue: parseFloat(dayData.sales.toFixed(2)), // Sales (gross revenue)
        commission: parseFloat(dayData.commission.toFixed(2)), // Commission (creator's share)
        clicks: dayData.clicks,
        conversions: dayData.conversions,
        pending: parseFloat(dayData.commission.toFixed(2)),
        approved: 0,
        total: parseFloat(dayData.commission.toFixed(2))
      });
    }
    
    // 5. Get Top Performing Links
    const topLinks = await prisma.link.findMany({
      where: { creatorId: req.user.id },
      take: 5,
      select: {
        id: true,
        destinationUrl: true,
        shortLink: true,
        conversions: true,
        revenue: true,
        createdAt: true
      }
    });
    
    const enrichedTopLinks = await Promise.all(topLinks.map(async (link) => {
      const shortCode = link.shortLink.split('/').pop();
      const shortLinkData = await prisma.shortLink.findUnique({
        where: { shortCode },
        select: { clicks: true }
      });
      
      return {
        id: link.id,
        url: link.destinationUrl,
        shortUrl: link.shortLink,
        clicks: shortLinkData?.clicks || 0,
        conversions: link.conversions || 0,
        revenue: Number(link.revenue || 0),
        conversionRate: (shortLinkData?.clicks || 0) > 0 ? 
          parseFloat(((link.conversions || 0) / (shortLinkData?.clicks || 1) * 100).toFixed(2)) : 0,
        createdAt: link.createdAt
      };
    }));
    
    // Sort by actual performance
    enrichedTopLinks.sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
    
    // 6. Get Recent Activity
    const recentActivity = await prisma.shortLink.findMany({
      where: { creatorId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        shortCode: true,
        clicks: true,
        createdAt: true
      }
    });
    
    const response = {
      earningsTrend,
      performanceMetrics: {
        clicks: finalData.clicks,
        conversions: finalData.conversions,
        revenue: finalData.revenue,
        conversionRate: finalData.conversionRate,
        averageOrderValue: finalData.conversions > 0 ? 
          parseFloat((finalData.revenue / finalData.conversions).toFixed(2)) : 0
      },
      topLinks: enrichedTopLinks,
      recentActivity: recentActivity.map(activity => ({
        shortCode: activity.shortCode,
        url: `https://s.zylike.com/${activity.shortCode}`,
        clicks: activity.clicks || 0,
        lastClick: activity.createdAt,
        createdAt: activity.createdAt
      })),
      dataSource: impactData.conversions > 0 ? 'impact_com' : 'database_fallback'
    };
    
    console.log(`[Analytics Enhanced] Response:`, {
      clicks: response.performanceMetrics.clicks,
      conversions: response.performanceMetrics.conversions,
      revenue: response.performanceMetrics.revenue,
      dataSource: response.dataSource
    });
    
    console.log(`[Analytics Enhanced] 🔍 earningsTrend sample:`, {
      firstItem: earningsTrend[0],
      lastItem: earningsTrend[earningsTrend.length - 1],
      totalItems: earningsTrend.length
    });
    
    res.json(response);
    
  } catch (error) {
    console.error('[Analytics Enhanced] Error:', error.message);
    res.status(500).json({ 
      message: 'Failed to load enhanced analytics', 
      error: error.message,
      earningsTrend: [],
      performanceMetrics: { clicks: 0, conversions: 0, revenue: 0, conversionRate: 0 },
      topLinks: [],
      recentActivity: []
    });
  }
});

router.get('/analytics', requireAuth, requireApprovedCreator, async (req, res) => {
  const prisma = getPrisma();
  if (!prisma) return res.json({ clicks: 0, conversions: 0, revenue: 0, topLinks: [], recentActivity: [] });
  
  try {
    // Get Real Impact.com Data (Real Clicks + Commissionable Sales Only)
    let realData = { clicks: 0, conversions: 0, revenue: 0 };
    
    try {
      const ImpactWebService = require('../services/impactWebService');
      const impact = new ImpactWebService();
      
      // Get creator's SubId1
      const creator = await prisma.creator.findUnique({
        where: { id: req.user.id },
        select: { impactSubId: true, commissionRate: true }
      });
      
      const correctSubId1 = creator?.impactSubId || impact.computeObfuscatedSubId(req.user.id);
      
      if (correctSubId1 && correctSubId1 !== 'default') {
        console.log(`[Analytics Basic] Fetching REAL clicks + COMMISSIONABLE sales for SubId1: ${correctSubId1}`);
        
        // Use same date calculation as analytics-enhanced
        const requestedDays = Math.max(1, Math.min(90, Number(req.query.days) || 30));
        const now = new Date();
        const endDate = now.toISOString().split('T')[0];
        const startDate = new Date(now.getTime() - (requestedDays * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        
        // Get real clicks from Performance by SubId report
        const performanceData = await impact.getPerformanceBySubId({
          startDate,
          endDate,
          subId1: correctSubId1
        });
        
        if (performanceData.success && performanceData.data) {
          realData.clicks = performanceData.data.clicks || 0;
          console.log(`[Analytics Basic] ✅ Real clicks: ${realData.clicks}`);
        }
        
        // Get COMMISSIONABLE sales only from Actions API
        const detailedActions = await impact.getActionsDetailed({
          startDate: startDate + 'T00:00:00Z',
          endDate: endDate + 'T23:59:59Z',
          subId1: correctSubId1,
          actionType: 'SALE',
          pageSize: 1000
        });
        
        if (detailedActions.success && detailedActions.actions) {
          const creatorActions = detailedActions.actions.filter(action => 
            action.SubId1 === correctSubId1
          );
          
          // Filter for ONLY commissionable actions (commission > 0)
          const commissionableActions = creatorActions.filter(action => {
            const commission = parseFloat(action.Payout || action.Commission || 0);
            return commission > 0;
          });
          
          realData.conversions = commissionableActions.length;
          
          // Calculate revenue from commissionable actions only
          const grossRevenue = commissionableActions.reduce((sum, action) => {
            return sum + parseFloat(action.Payout || action.Commission || 0);
          }, 0);
          
          const businessRate = creator?.commissionRate || 70;
          realData.revenue = (grossRevenue * businessRate) / 100;
          
          console.log(`[Analytics Basic] ✅ COMMISSIONABLE ONLY: ${realData.conversions} conversions, $${realData.revenue.toFixed(2)} revenue`);
        }
      }
    } catch (impactError) {
      console.log(`[Analytics Basic] Impact.com error, using database fallback: ${impactError.message}`);
    }
    
    // Fallback to database data if Impact.com fails
    const hasRealData = realData.clicks > 0 || realData.conversions > 0 || realData.revenue > 0;
    
    let agg;
    if (hasRealData) {
      // Use real Impact.com data
      agg = {
        _sum: {
          clicks: realData.clicks,
          conversions: realData.conversions,
          revenue: realData.revenue
        }
      };
      console.log(`[Analytics Basic] ✅ Using real Impact.com data`);
    } else {
      // Fallback to database aggregates
      const linkAgg = await prisma.link.aggregate({
        where: { creatorId: req.user.id },
        _sum: { conversions: true, revenue: true },
      });
      
      const shortLinkAgg = await prisma.shortLink.aggregate({
        where: { creatorId: req.user.id },
        _sum: { clicks: true },
      });
      
      agg = {
        _sum: {
          clicks: shortLinkAgg._sum.clicks || 0,
          conversions: linkAgg._sum.conversions || 0,
          revenue: linkAgg._sum.revenue || 0
        }
      };
      console.log(`[Analytics Basic] ⚠️ Using database fallback`);
    }
    
    // Get top performing links with real click data from ShortLink table
    const topLinks = await prisma.link.findMany({
      where: { creatorId: req.user.id },
      take: 5,
      select: {
        id: true,
        destinationUrl: true,
        shortLink: true,
        conversions: true,
        revenue: true,
        createdAt: true
      }
    });
    
    // Enrich with real click data from ShortLink table
    const enrichedTopLinks = await Promise.all(topLinks.map(async (link) => {
      const shortCode = link.shortLink.split('/').pop();
      const shortLinkData = await prisma.shortLink.findUnique({
        where: { shortCode },
        select: { clicks: true }
      });
      
      return {
        ...link,
        clicks: shortLinkData?.clicks || 0
      };
    }));
    
    // Sort by actual clicks
    enrichedTopLinks.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
    
    // Get recent click activity from short links
    const recentActivity = await prisma.shortLink.findMany({
      where: { creatorId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        shortCode: true,
        clicks: true,
        createdAt: true
      }
    });
    
    res.json({
      clicks: agg._sum.clicks || 0,
      conversions: agg._sum.conversions || 0,
      revenue: Number(agg._sum.revenue || 0),
      topLinks: enrichedTopLinks.map(link => ({
        id: link.id,
        url: link.destinationUrl,
        shortUrl: link.shortLink,
        clicks: link.clicks || 0,
        conversions: link.conversions || 0,
        revenue: Number(link.revenue || 0),
        conversionRate: link.clicks > 0 ? ((link.conversions || 0) / link.clicks * 100).toFixed(2) : 0,
        createdAt: link.createdAt
      })),
      recentActivity: recentActivity.map(activity => ({
        shortCode: activity.shortCode,
        url: `https://s.zylike.com/${activity.shortCode}`, // Use the short URL instead
        clicks: activity.clicks || 0,
        lastClick: activity.createdAt,
        createdAt: activity.createdAt
      }))
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Failed to load analytics', error: error.message });
  }
});

// Payouts for the current creator
router.get('/payouts', requireAuth, async (req, res) => {
  const prisma = getPrisma();
  if (!prisma) return res.json({ payouts: [] });
  const payouts = await prisma.payoutRequest.findMany({ where: { creatorId: req.user.id }, orderBy: { requestedAt: 'desc' } });
  res.json({ payouts });
});

router.post('/payouts/request', requireAuth, async (req, res) => {
  const prisma = getPrisma();
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  const { amount } = req.body || {};
  if (!amount || Number(amount) <= 0) return res.status(400).json({ message: 'amount required' });
  const pr = await prisma.payoutRequest.create({ data: { creatorId: req.user.id, amount: Number(amount) } });
  res.status(201).json(pr);
});

// Referral summary for current user
router.get('/referrals', requireAuth, async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return res.json({ 
      count: 0, 
      total: 0, 
      pending: 0, 
      thisMonth: 0, 
      referrals: [] 
    });
    
    // Get referral earnings
    const referralEarnings = await prisma.referralEarning.findMany({ 
      where: { referrerId: req.user.id },
      include: {
        referred: {
          select: { name: true, email: true, createdAt: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Calculate totals
    const total = referralEarnings.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const pending = referralEarnings
      .filter(r => r.status === 'PENDING')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    
    // Calculate this month's earnings
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = referralEarnings
      .filter(r => new Date(r.createdAt) >= startOfMonth)
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    
    // Format referrals for display
    const referrals = referralEarnings.map(earning => ({
      id: earning.id,
      date: earning.createdAt,
      referralName: earning.referred?.name || 'Unknown',
      referralEmail: earning.referred?.email || 'Unknown',
      status: earning.status || 'ACTIVE',
      monthlyBonus: earning.amount || 0,
      remainingMonths: Math.max(0, 6 - Math.floor((now - new Date(earning.referred?.createdAt || now)) / (1000 * 60 * 60 * 24 * 30))),
      totalEarned: earning.amount || 0
    }));
    
    res.json({ 
      count: referralEarnings.length, 
      total, 
      pending, 
      thisMonth, 
      referrals 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get creator earnings - as specified in docs: GET /api/creator/earnings
// (removed duplicate earnings route to avoid ambiguity)

// NEW: Get creator's commissionable sales history - SIMPLIFIED VERSION
router.get('/sales-history', requireAuth, requireApprovedCreator, async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return res.json({ 
      totalSales: 0, 
      salesCount: 0, 
      recentSales: [],
      period: { days: 30 }
    });

    // Get creator info
    const creator = await prisma.creator.findUnique({
      where: { id: req.user.id },
      select: { commissionRate: true, impactSubId: true }
    });

    if (!creator) {
      return res.status(404).json({ message: 'Creator not found' });
    }

    // Parse date parameters (simplified)
    const now = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];
    const isYmd = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
    
    let startDate, endDate, effectiveDays;
    const customStart = req.query.startDate;
    const customEnd = req.query.endDate;
    let requestedDays;
    
    if (isYmd(customStart) && isYmd(customEnd)) {
      startDate = customStart;
      endDate = customEnd;
      const startDateObj = new Date(customStart);
      const endDateObj = new Date(customEnd);
      effectiveDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      requestedDays = effectiveDays;
    } else {
      requestedDays = Math.max(1, Math.min(90, Number(req.query.days) || 30));
      effectiveDays = requestedDays;
      endDate = fmt(now);
      // FIXED: Subtract (days - 1) to include the current day in the range
      const startDateObj = new Date(now.getTime() - ((effectiveDays - 1) * 24 * 60 * 60 * 1000));
      startDate = fmt(startDateObj);
      console.log(`[Sales History] DEBUG: requestedDays=${requestedDays}, effectiveDays=${effectiveDays}, startDate=${startDate}, endDate=${endDate}`);
      
      // Special debugging for 90 days
      if (requestedDays === 90) {
        console.log(`[Sales History] 🔍 90 DAYS DEBUG:`);
        console.log(`[Sales History] 📅 Now: ${now.toISOString()}`);
        console.log(`[Sales History] 📅 Start date object: ${startDateObj.toISOString()}`);
        console.log(`[Sales History] 📅 Days difference: ${Math.ceil((now.getTime() - startDateObj.getTime()) / (24 * 60 * 60 * 1000))} days`);
      }
    }

    // Parse limit parameter
    const limit = req.query.limit;
    const limitNumber = limit === 'all' ? 1000 : Math.max(1, Math.min(100, parseInt(limit) || 10));

    console.log(`[Sales History] Fetching sales for ${effectiveDays} days: ${startDate} to ${endDate}`);
    console.log(`[Sales History] 🔍 ALL CREATORS - Creator ID: ${req.user.id}, Email: ${creator?.email || 'UNKNOWN'}`);

    // Get commissionable sales from Impact.com (original working approach)
    let totalSales = 0;
    let salesCount = 0;
    let recentSales = [];

    try {
      const ImpactWebService = require('../services/impactWebService');
      const impact = new ImpactWebService();
      
      // Use stored SubId1 or compute it
      const correctSubId1 = creator?.impactSubId || impact.computeObfuscatedSubId(req.user.id);
      
      if (correctSubId1 && correctSubId1 !== 'default') {
        console.log(`[Sales History] Fetching commissionable sales for SubId1: ${correctSubId1}`);
        
        // Use the same Actions API that was working before
        const actionsResponse = await impact.getActionsDetailed({
          subId1: correctSubId1,
          startDate,
          endDate,
          pageSize: 1000 // Get more records to calculate totals
        });
        
        if (actionsResponse.success) {
          const actions = actionsResponse.actions || [];
          
          // Filter for this creator's actions
          const creatorActions = actions.filter(action => {
            const actionSubId1 = action.SubId1 || action.Subid1 || action.SubID1 || action.TrackingValue || '';
            return actionSubId1.toString().trim() === correctSubId1.toString().trim();
          });
          
          // Filter for ONLY commissionable actions (commission > 0) - this was working before
          const commissionableActions = creatorActions.filter(action => {
            const commission = parseFloat(action.Payout || action.Commission || 0);
            return commission > 0;
          });

          // Calculate totals using the same field names that were working
          let calculatedSales = 0;
          let calculatedCommission = 0;
          const processedSales = [];

          for (const action of commissionableActions) {
            const saleAmount = parseFloat(action.Amount || action.SaleAmount || action.IntendedAmount || 0);
            const commission = parseFloat(action.Payout || action.Commission || 0);
            
            calculatedSales += saleAmount;
            calculatedCommission += commission;

            // Apply business commission rate to individual sale commission (creator's actual share)
            const creatorCommission = parseFloat((commission * creator.commissionRate / 100).toFixed(2));
            
            // Mask product/campaign names for cleaner display
            let productName = action.ProductName || action.Product || action.CampaignName || 'Product Sale';
            if (productName.toLowerCase().includes('walmartcreator') || productName.toLowerCase().includes('walmart')) {
              productName = 'Walmart';
            }

            // Try to get original product URL
            let productUrl = 'https://www.walmart.com'; // Default fallback
            try {
              // Look for URL fields in the action data
              const urlFields = [
                'TargetUrl', 'ProductUrl', 'LandingPageUrl', 'DestinationUrl',
                'Url', 'ProductLink', 'AffiliateUrl', 'TrackingUrl', 'ActionUrl'
              ];
              
              for (const field of urlFields) {
                if (action[field] && typeof action[field] === 'string') {
                  let potentialUrl = action[field];
                  
                  // Check if it contains a Walmart product URL
                  if (potentialUrl.includes('walmart.com/ip/')) {
                    // Try to extract direct product URL
                    if (potentialUrl.includes('u=')) {
                      try {
                        const urlObj = new URL(potentialUrl);
                        const encodedUrl = urlObj.searchParams.get('u');
                        if (encodedUrl) {
                          const decodedUrl = decodeURIComponent(encodedUrl);
                          if (decodedUrl.includes('walmart.com/ip/')) {
                            productUrl = decodedUrl;
                            break;
                          }
                        }
                      } catch (error) {
                        // Continue with fallback
                      }
                    } else if (potentialUrl.startsWith('https://www.walmart.com/ip/')) {
                      productUrl = potentialUrl;
                      break;
                    }
                  }
                }
              }
              
              // If no URL found in action data, try to find from our links
              if (productUrl === 'https://www.walmart.com') {
                const linkWithAction = await prisma.link.findFirst({
                  where: {
                    creatorId: req.user.id,
                    OR: [
                      { impactLink: { contains: action.Id } },
                      { impactLink: { contains: correctSubId1 } }
                    ]
                  },
                  select: { destinationUrl: true },
                  orderBy: { createdAt: 'desc' }
                });
                
                if (linkWithAction?.destinationUrl) {
                  productUrl = linkWithAction.destinationUrl;
                }
              }
            } catch (error) {
              // Keep default fallback
            }

            // Collect recent sales data
            processedSales.push({
              date: action.EventDate || action.ActionDate || action.CreationDate,
              orderValue: saleAmount,
              commission: creatorCommission, // Show creator's actual share
              status: action.ActionStatus || action.Status || 'Pending',
              actionId: action.Id || action.ActionId,
              product: productName,
              productUrl: productUrl
            });
          }

          // Sort by date and handle pagination
          processedSales.sort((a, b) => new Date(b.date) - new Date(a.date));
          
          // Apply limit
          if (limit === 'all') {
            recentSales = processedSales; // Show all sales
          } else {
            recentSales = processedSales.slice(0, Math.min(limitNumber, 100)); // Cap at 100 for performance
          }

          totalSales = parseFloat(calculatedSales.toFixed(2));
          salesCount = commissionableActions.length;

          console.log(`[Sales History] ✅ Found ${salesCount} commissionable sales totaling $${totalSales.toFixed(2)}`);
        }
      }
    } catch (error) {
      console.error('[Sales History] Error fetching sales data:', error.message);
      // Continue with empty data rather than failing
    }

    const response = {
      totalSales: parseFloat(totalSales.toFixed(2)),
      salesCount,
      recentSales,
      period: {
        requestedDays,
        effectiveDays,
        startDate,
        endDate
      },
      creator: {
        commissionRate: creator.commissionRate
      },
      dataSource: salesCount > 0 ? 'impact_com_api' : 'no_data'
    };

    console.log(`[Sales History] Response summary: ${salesCount} sales, $${totalSales.toFixed(2)} total, source: ${response.dataSource}`);
    res.json(response);

  } catch (error) {
    console.error('[Sales History Simplified] Error:', error.message);
    res.status(500).json({ 
      error: 'Unable to fetch sales history',
      totalSales: 0,
      salesCount: 0,
      recentSales: [],
      dataSource: 'error'
    });
  }
});

// DEBUG: Check Impact.com data for specific SubId1
router.get('/debug-impact/:subId1', requireAuth, requireApprovedCreator, async (req, res) => {
  try {
    const subId1 = req.params.subId1;
    console.log(`[DEBUG Impact] Checking Impact.com data for SubId1: ${subId1}`);
    
    const ImpactWebService = require('../services/impactWebService');
    const impact = new ImpactWebService();
    
    // Get current date range (last 30 days)
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    const startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    
    console.log(`[DEBUG Impact] Date range: ${startDate} to ${endDate}`);
    
    const results = {};
    
    // 1. Check Performance by SubId (clicks data)
    try {
      const performanceData = await impact.getPerformanceBySubId({
        startDate,
        endDate,
        subId1: subId1
      });
      
      results.performanceReport = {
        success: performanceData.success,
        clicks: performanceData.data?.clicks || 0,
        data: performanceData.data,
        error: performanceData.error
      };
      
      console.log(`[DEBUG Impact] Performance data:`, results.performanceReport);
    } catch (error) {
      results.performanceReport = { error: error.message };
    }
    
    // 2. Check Actions Detailed (sales data)
    try {
      const actionsData = await impact.getActionsDetailed({
        startDate: startDate + 'T00:00:00Z',
        endDate: endDate + 'T23:59:59Z',
        subId1: subId1,
        pageSize: 100
      });
      
      if (actionsData.success && actionsData.actions) {
        const creatorActions = actionsData.actions.filter(action => 
          action.SubId1 === subId1
        );
        
        const commissionableActions = creatorActions.filter(action => {
          const commission = parseFloat(action.Payout || action.Commission || 0);
          return commission > 0;
        });
        
        results.actionsReport = {
          success: true,
          totalActions: creatorActions.length,
          commissionableActions: commissionableActions.length,
          actions: creatorActions.slice(0, 5), // Show first 5 for debugging
          commissionableActionsDetails: commissionableActions.map(action => ({
            id: action.Id,
            date: action.EventDate || action.ActionDate,
            commission: parseFloat(action.Payout || action.Commission || 0),
            amount: parseFloat(action.Amount || action.SaleAmount || 0),
            status: action.ActionStatus || action.Status
          }))
        };
      } else {
        results.actionsReport = {
          success: false,
          error: actionsData.error || 'No actions data'
        };
      }
      
      console.log(`[DEBUG Impact] Actions data:`, results.actionsReport);
    } catch (error) {
      results.actionsReport = { error: error.message };
    }
    
    // 3. Check Reports API (admin dashboard data)
    try {
      const reportsData = await impact.getImpactReportsData({
        startDate,
        endDate,
        subId1: subId1
      });
      
      if (reportsData.success && reportsData.data) {
        const creatorData = reportsData.data.find(row => row.SubId1 === subId1);
        results.reportsData = {
          success: true,
          found: !!creatorData,
          data: creatorData
        };
      } else {
        results.reportsData = {
          success: false,
          error: reportsData.error || 'No reports data'
        };
      }
      
      console.log(`[DEBUG Impact] Reports data:`, results.reportsData);
    } catch (error) {
      results.reportsData = { error: error.message };
    }
    
    const summary = {
      subId1: subId1,
      dateRange: { startDate, endDate },
      clicks: results.performanceReport?.clicks || 0,
      totalActions: results.actionsReport?.totalActions || 0,
      commissionableActions: results.actionsReport?.commissionableActions || 0,
      reportsFound: results.reportsData?.found || false,
      timestamp: new Date().toISOString()
    };
    
    console.log(`[DEBUG Impact] SUMMARY for ${subId1}:`, summary);
    
    res.json({
      summary,
      details: results
    });
    
  } catch (error) {
    console.error('[DEBUG Impact] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Check what's actually in the database for this creator
router.get('/debug-earnings', requireAuth, requireApprovedCreator, async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return res.json({ error: 'No database connection' });

    const creatorId = req.user.id;
    console.log(`[DEBUG] Checking earnings for creator: ${creatorId}`);

    // Get ALL earnings for this creator (no date filter)
    const allEarnings = await prisma.earning.findMany({
      where: { creatorId },
      orderBy: { createdAt: 'desc' },
      include: {
        link: {
          select: {
            id: true,
            destinationUrl: true,
            shortLink: true
          }
        }
      }
    });

    // Get ALL commission earnings specifically
    const commissionEarnings = await prisma.earning.findMany({
      where: { 
        creatorId,
        type: 'COMMISSION'
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get recent earnings (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentEarnings = await prisma.earning.findMany({
      where: {
        creatorId,
        type: 'COMMISSION',
        createdAt: { gte: thirtyDaysAgo }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get creator info
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        commissionRate: true,
        impactSubId: true,
        createdAt: true
      }
    });

    const debugInfo = {
      creator: creator,
      totalEarnings: allEarnings.length,
      commissionEarnings: commissionEarnings.length,
      recentEarnings: recentEarnings.length,
      thirtyDaysAgo: thirtyDaysAgo.toISOString(),
      allEarningsDetails: allEarnings.map(earning => ({
        id: earning.id,
        amount: earning.amount,
        type: earning.type,
        status: earning.status,
        createdAt: earning.createdAt,
        impactTransactionId: earning.impactTransactionId,
        linkId: earning.linkId,
        link: earning.link
      })),
      commissionEarningsDetails: commissionEarnings.map(earning => ({
        id: earning.id,
        amount: earning.amount,
        status: earning.status,
        createdAt: earning.createdAt,
        impactTransactionId: earning.impactTransactionId
      })),
      recentEarningsDetails: recentEarnings.map(earning => ({
        id: earning.id,
        amount: earning.amount,
        status: earning.status,
        createdAt: earning.createdAt,
        impactTransactionId: earning.impactTransactionId
      }))
    };

    console.log('[DEBUG] Earnings debug info:', JSON.stringify(debugInfo, null, 2));
    res.json(debugInfo);

  } catch (error) {
    console.error('[DEBUG] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
