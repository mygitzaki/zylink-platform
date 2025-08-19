const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPrisma } = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });
    
    const creator = await prisma.creator.findUnique({ where: { email } });
    if (!creator) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, creator.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    // Use adminRole field from database, fallback to 'USER' if not set
    const role = creator.adminRole || 'USER';
    const token = signToken({ id: creator.id, role });
    
    res.json({ token, role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});



router.get('/profile', requireAuth, async (req, res) => {
  try {
    console.log('🔍 Auth profile endpoint called - checking for role field fix');
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });
    
    const user = await prisma.creator.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ message: 'Creator not found' });
    }

    console.log('👤 Auth profile - Creator found:', { id: user.id, email: user.email, adminRole: user.adminRole });

    // Return the role from the database (adminRole field) instead of from JWT token
    const role = user.adminRole || 'USER';
    
    res.json({ 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      bio: user.bio,
      socialMediaLinks: user.socialMediaLinks,
      groupLinks: user.groupLinks,
      isActive: user.isActive, 
      applicationStatus: user.applicationStatus,
      role: role, // This should fix the admin detection
    });
  } catch (err) {
    console.error('❌ Error in auth profile:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/logout', async (req, res) => {
  res.json({ message: 'ok' });
});

// Password reset request
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });
    
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });
    
    const creator = await prisma.creator.findUnique({ where: { email } });
    if (!creator) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If an account with this email exists, a password reset link has been sent' });
    }
    
    // Generate reset token (valid for 1 hour)
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Store reset token in database
    await prisma.creator.update({
      where: { id: creator.id },
      data: {
        resetToken,
        resetTokenExpiry: resetExpiry
      }
    });
    
    // Send password reset email
    const { EmailService } = require('../services/emailService');
    const emailService = new EmailService();
    await emailService.initialize();
    await emailService.sendPasswordResetEmail(creator, resetToken);
    
    res.json({ message: 'If an account with this email exists, a password reset link has been sent' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Password reset with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: 'Token and new password required' });
    
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });
    
    const creator = await prisma.creator.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() }
      }
    });
    
    if (!creator) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    
    // Hash new password and clear reset token
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.creator.update({
      where: { id: creator.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });
    
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;





