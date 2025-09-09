const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  console.log('🔐 [Auth] Checking admin access for user:', {
    userId: req.user?.id,
    email: req.user?.email,
    role: req.user?.role,
    adminRole: req.user?.adminRole,
    hasUser: !!req.user
  });
  
  if (!req.user) {
    console.log('❌ [Auth] No user found in request');
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Check both role and adminRole fields
  const userRole = req.user.role || req.user.adminRole;
  if (!userRole || (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN')) {
    console.log('❌ [Auth] User role not admin:', { role: req.user.role, adminRole: req.user.adminRole });
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  console.log('✅ [Auth] Admin access granted');
  next();
}

function requireApprovedCreator(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  
  // Admin users can always proceed
  if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
    return next();
  }
  
  // For regular users, check if they are approved
  const { getPrisma } = require('../utils/prisma');
  const prisma = getPrisma();
  
  if (!prisma) return res.status(503).json({ message: 'Database not configured' });
  
  prisma.creator.findUnique({ where: { id: req.user.id } })
    .then(creator => {
      if (!creator) {
        return res.status(404).json({ message: 'Creator not found' });
      }
      
      // Allow creators with PENDING status to create links (they can test the system)
      // Only block REJECTED creators
      if (creator.applicationStatus === 'REJECTED') {
        return res.status(403).json({ 
          message: 'Your application was rejected. Please contact support.',
          status: creator.applicationStatus
        });
      }
      
      // For PENDING creators, show a warning but allow them to proceed
      if (creator.applicationStatus === 'PENDING') {
        console.log(`⚠️ Creator ${creator.id} creating link with PENDING status`);
      }
      
      next();
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    });
}

module.exports = { requireAuth, requireAdmin, requireApprovedCreator };





