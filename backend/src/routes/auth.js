const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getPrisma } = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth');
const { EmailService } = require('../services/emailService');

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

// Password reset request endpoint
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });

    const creator = await prisma.creator.findUnique({ where: { email } });
    if (!creator) {
      // Don't reveal if user exists for security
      return res.json({ message: 'If the email exists, a password reset link has been sent' });
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token (you may want to add this to your database schema)
    // For now, we'll use JWT with expiration
    const resetJWT = jwt.sign(
      { 
        userId: creator.id, 
        email: creator.email,
        type: 'password_reset'
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    // Send password reset email (non-blocking)
    try {
      const emailService = new EmailService();
      await emailService.initialize();
      await emailService.sendPasswordResetEmail(creator, resetJWT);
      console.log(`✅ Password reset email sent to ${creator.email}`);
    } catch (emailError) {
      console.error('⚠️ Failed to send password reset email:', emailError.message);
      return res.status(500).json({ message: 'Failed to send reset email' });
    }

    res.json({ message: 'If the email exists, a password reset link has been sent' });
  } catch (err) {
    console.error('Password reset request error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Password reset confirmation endpoint
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== 'password_reset') {
        return res.status(400).json({ message: 'Invalid reset token' });
      }
    } catch (jwtError) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.creator.update({
      where: { id: decoded.userId },
      data: { password: hashedPassword }
    });

    console.log(`✅ Password reset completed for user ${decoded.email}`);
    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;





