const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPrisma } = require('../utils/prisma');
const ImpactWebService = require('../services/impactWebService');
const { LinkShortener } = require('../services/linkShortener');
const { QRCodeService } = require('../services/qrcodeService');
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
    
    const paymentAccount = await prisma.paymentAccount.findUnique({
      where: { creatorId: req.user.id }
    });
    
    console.log('✅ Payment account query result:', paymentAccount ? 'Found' : 'Not found');
    
    if (!paymentAccount) {
      return res.json({ hasPaymentMethod: false });
    }
    
    // Map schema enum values back to frontend values
    const frontendTypeMapping = {
      'BANK_ACCOUNT': 'BANK',
      'PAYPAL': 'PAYPAL', 
      'CRYPTO_WALLET': 'CRYPTO'
    };
    
    const type = frontendTypeMapping[paymentAccount.accountType];
    console.log('✅ Mapped account type:', paymentAccount.accountType, '->', type);
    
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
    
    const accountType = accountTypeMapping[type];
    if (!accountType) return res.status(400).json({ message: 'Invalid payment type' });
    
    const upserted = await prisma.paymentAccount.upsert({
      where: { creatorId: req.user.id },
      update: { accountType, accountDetails },
      create: { creatorId: req.user.id, accountType, accountDetails },
    });
    res.status(201).json({ paymentAccountId: upserted.id });
  } catch (error) {
    console.error('Payment setup error:', error);
    res.status(500).json({ message: 'Failed to save payment method', error: error.message });
  }
});

router.get('/analytics', requireAuth, requireApprovedCreator, async (req, res) => {
  const prisma = getPrisma();
  if (!prisma) return res.json({ clicks: 0, conversions: 0, revenue: 0, topLinks: [], recentActivity: [] });
  
  try {
    // Get aggregate stats from Link table (conversions, revenue)
    const linkAgg = await prisma.link.aggregate({
      where: { creatorId: req.user.id },
      _sum: { conversions: true, revenue: true },
    });
    
    // Get aggregate clicks from ShortLink table (where clicks are actually tracked)
    const shortLinkAgg = await prisma.shortLink.aggregate({
      where: { creatorId: req.user.id },
      _sum: { clicks: true },
    });
    
    // Combine the data safely
    const agg = {
      _sum: {
        clicks: shortLinkAgg._sum.clicks || 0,
        conversions: linkAgg._sum.conversions || 0,
        revenue: linkAgg._sum.revenue || 0
      }
    };
    
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

module.exports = router;


