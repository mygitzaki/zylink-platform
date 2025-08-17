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
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  if (!req.user.role || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN')) {
    return res.status(403).json({ message: 'Forbidden' });
  }
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
      
      if (creator.applicationStatus !== 'APPROVED' || !creator.isActive) {
        return res.status(403).json({ 
          message: 'Your application is pending approval. Please wait for admin review.',
          status: creator.applicationStatus,
          isActive: creator.isActive
        });
      }
      
      next();
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    });
}

module.exports = { requireAuth, requireAdmin, requireApprovedCreator };





