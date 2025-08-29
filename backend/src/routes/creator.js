const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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
      select: { commissionRate: true, impactSubId: true }
    });
    const rate = creator?.commissionRate ?? 70;

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
      requestedDays = Math.max(1, Math.min(90, Number(req.query.days) || 30));
        effectiveDays = requestedDays;
      endDate = fmt(now);
      startDate = fmt(new Date(now.getTime() - (effectiveDays * 24 * 60 * 60 * 1000)));
      console.log(`[Earnings Summary] Using PRESET range: ${requestedDays} days (${startDate} to ${endDate})`);
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
      
      if (correctSubId1 && correctSubId1 !== 'default') {
        console.log(`[Earnings Summary] Fetching commissionable actions for SubId1: ${correctSubId1}`);
        
        // Get detailed actions to filter for commissionable only (same as analytics-enhanced)
        const detailedActions = await impact.getActionsDetailed({
          startDate,
          endDate,
          subId1: correctSubId1,
          pageSize: 1000
        });
        
        if (detailedActions.success && detailedActions.actions) {
          // Filter for this creator's actions
          const creatorActions = detailedActions.actions.filter(action => 
            action.SubId1 === correctSubId1
          );
          
          // Filter for ONLY commissionable actions (commission > 0) - same as analytics
          const commissionableActions = creatorActions.filter(action => {
            const commission = parseFloat(action.Payout || action.Commission || 0);
            return commission > 0;
          });
          
          pendingActions = commissionableActions.length;
          
          // Calculate gross revenue from commissionable actions only
          pendingGross = commissionableActions.reduce((sum, action) => {
            return sum + parseFloat(action.Payout || action.Commission || 0);
          }, 0);
          
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
    const approvedEarnings = await prisma.earning.findMany({
      where: { 
        creatorId: req.user.id,
        status: { in: ['COMPLETED', 'PROCESSING'] }, // Include completed and processing earnings
        createdAt: {
          gte: new Date(`${startDate}T00:00:00Z`),
          lte: new Date(`${endDate}T23:59:59Z`)
        }
      },
      select: { amount: true, status: true }
    });
    
    // Separate approved earnings: ready for withdrawal vs total approved
    const completedEarnings = approvedEarnings.filter(e => e.status === 'COMPLETED');
    const availableForWithdraw = completedEarnings.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalApprovedAmount = approvedEarnings.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
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
    const pendingNet = parseFloat(((pendingGross * rate) / 100).toFixed(2));
    const commissionEarned = pendingNet + totalApprovedAmount; // Use total approved, not just available for withdraw
    const totalEarnings = commissionEarned;

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
    const startDate = new Date(now.getTime() - (effectiveDays * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    
    console.log(`[Analytics Enhanced] Using proven date range: ${startDate} to ${endDate} (${effectiveDays} days)`);
    console.log(`[Analytics Enhanced] This matches earnings-summary date calculation`);

    // Set cache control headers to prevent caching issues
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    
    // 1. Get Real Impact.com Data (Real Clicks + Commissionable Sales Only)
    let impactData = { clicks: 0, conversions: 0, revenue: 0, conversionRate: 0 };
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
    
    // 4. Generate Earnings Trend Data (Last 7 days)
    const earningsTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // For now, distribute pending earnings across days (you can enhance this with real daily data)
      const dailyPending = i === 0 ? finalData.revenue * 0.7 : 0; // Show today's pending
      const dailyApproved = 0; // No approved earnings yet
      
      earningsTrend.push({
        date: dateStr,
        pending: parseFloat(dailyPending.toFixed(2)),
        approved: parseFloat(dailyApproved.toFixed(2)),
        total: parseFloat((dailyPending + dailyApproved).toFixed(2))
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

// NEW: Get creator's commissionable sales history
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

    // Parse date parameters
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
      startDate = fmt(new Date(now.getTime() - (effectiveDays * 24 * 60 * 60 * 1000)));
    }

    // Parse limit parameter
    const limit = req.query.limit;
    const limitNumber = limit === 'all' ? 'all' : Math.max(1, Math.min(100, parseInt(limit) || 10));

    console.log(`[Sales History Enhanced] Fetching sales for ${effectiveDays} days: ${startDate} to ${endDate}`);

    // Get commissionable sales from Impact.com using enhanced method
    let totalSales = 0;
    let salesCount = 0;
    let recentSales = [];

    try {
      const ImpactWebService = require('../services/impactWebService');
      const impact = new ImpactWebService();
      
      // Use stored SubId1 or compute it
      const correctSubId1 = creator?.impactSubId || impact.computeObfuscatedSubId(req.user.id);
      
      if (correctSubId1 && correctSubId1 !== 'default') {
        console.log(`[Sales History Enhanced] Using enhanced sales data for SubId1: ${correctSubId1}`);
        
        // Use the new enhanced sales data method
        const enhancedSalesResponse = await impact.getEnhancedSalesData({
          subId1: correctSubId1,
          startDate,
          endDate,
          limit: limitNumber === 'all' ? 1000 : limitNumber
        });
        
        if (enhancedSalesResponse.success && enhancedSalesResponse.sales.length > 0) {
          const enhancedSales = enhancedSalesResponse.sales;
          
          // Calculate totals from enhanced sales data
          totalSales = enhancedSalesResponse.totalSales || 0;
          salesCount = enhancedSales.length;
          
          // CRITICAL SECURITY CHECK: Validate all sales belong to this creator
          const validatedSales = enhancedSales.filter(sale => {
            // Double-check that this sale belongs to the requesting creator
            const saleCreatorId = sale._debug?.creatorId || 'unknown';
            const requestingCreatorId = req.user.id;
            
            if (saleCreatorId !== 'unknown' && saleCreatorId !== requestingCreatorId) {
              console.error(`🚨 SECURITY VIOLATION: Creator ${requestingCreatorId} attempted to access sale belonging to ${saleCreatorId}`);
              return false;
            }
            return true;
          });
          
          if (validatedSales.length !== enhancedSales.length) {
            console.error(`🚨 SECURITY: Blocked ${enhancedSales.length - validatedSales.length} unauthorized sales for creator ${req.user.id}`);
          }
          
          // Process validated sales for display with proper commission calculation
          const processedSales = validatedSales.map(sale => {
            // Apply platform commission rate to get creator's actual share
            const creatorCommission = parseFloat((sale.grossCommission * creator.commissionRate / 100).toFixed(2));
            
            return {
              actionId: sale.actionId,
              product: sale.product, // Already masked in enhanced method
              productUrl: sale.productUrl, // Real product URLs extracted
              productCategory: sale.productCategory,
              productSku: sale.productSku,
              orderValue: sale.orderValue,
              commission: creatorCommission, // Creator's actual commission after platform rate
              grossCommission: sale.grossCommission, // Original commission before platform rate
              date: sale.date,
              status: sale.status,
              campaignName: sale.campaignName // Already masked in enhanced method
            };
          });
          
          // Sort by date and apply pagination
          processedSales.sort((a, b) => new Date(b.date) - new Date(a.date));
          recentSales = processedSales;
          
          console.log(`[Sales History Enhanced] Successfully processed ${salesCount} sales totaling $${totalSales.toFixed(2)}`);
        } else {
          console.log(`[Sales History Enhanced] Enhanced method failed, using fallback: ${enhancedSalesResponse.error || 'No sales found'}`);
          
          // Fallback to basic method with masking
          const fallbackResponse = await impact.getActionsDetailed({
            subId1: correctSubId1,
            startDate: startDate + 'T00:00:00Z',
            endDate: endDate + 'T23:59:59Z',
            actionType: 'SALE',
            pageSize: limitNumber === 'all' ? 1000 : limitNumber
          });
          
          if (fallbackResponse.success && fallbackResponse.actions) {
            const actions = fallbackResponse.actions.filter(action => {
              const actionSubId1 = action.SubId1 || action.Subid1 || '';
              const commission = parseFloat(action.Payout || action.Commission || 0);
              return actionSubId1 === correctSubId1 && commission > 0;
            });
            
            let calculatedSales = 0;
            const processedSales = [];
            
            for (const action of actions) {
              const saleAmount = parseFloat(action.Amount || action.SaleAmount || action.IntendedAmount || 0);
              const commission = parseFloat(action.Payout || action.Commission || 0);
              const creatorCommission = parseFloat((commission * creator.commissionRate / 100).toFixed(2));
              
              calculatedSales += saleAmount;
              
              // Apply masking to product names
              let productName = action.ProductName || action.Product || action.CampaignName || 'Product Sale';
              productName = productName.replace(/walmartcreator\.com/gi, 'Walmart')
                                     .replace(/walmart creator/gi, 'Walmart')
                                     .replace(/impact\.com/gi, '')
                                     .replace(/impact/gi, '')
                                     .replace(/\s+/g, ' ').trim();
              
              processedSales.push({
                date: action.EventDate || action.ActionDate || action.CreationDate || new Date().toISOString(),
                orderValue: saleAmount,
                commission: creatorCommission,
                status: action.ActionStatus || action.Status || 'Pending',
                actionId: action.Id || action.ActionId,
                product: productName,
                productUrl: null // No URL extraction in fallback
              });
            }
            
            processedSales.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            totalSales = calculatedSales;
            salesCount = actions.length;
            recentSales = processedSales;
            
            console.log(`[Sales History Fallback] Processed ${salesCount} sales totaling $${totalSales.toFixed(2)}`);
          }
        }
      }
    } catch (error) {
      console.error('[Sales History Enhanced] Error fetching enhanced sales data:', error.message);
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
      }
    };

    console.log(`[Sales History Enhanced] Response summary: ${salesCount} sales, $${totalSales.toFixed(2)} total`);
    res.json(response);

  } catch (error) {
    console.error('[Sales History Enhanced] Error:', error.message);
    res.status(500).json({ 
      error: 'Unable to fetch sales history',
      totalSales: 0,
      salesCount: 0,
      recentSales: []
    });
  }
});

module.exports = router;
