const express = require('express');
const bcrypt = require('bcrypt');
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

router.post('/create-admin', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });
    
    const hashed = await bcrypt.hash(password, 10);
    const admin = await prisma.creator.create({
      data: { 
        name: name || 'Admin', 
        email, 
        password: hashed, 
        isActive: true, 
        commissionRate: 70, 
        adminRole: 'ADMIN',
        walletAddress: '0x0000000000000000000000000000000000000000'
      }
    });
    
    const token = signToken({ id: admin.id, role: 'ADMIN' });
    res.status(201).json({ id: admin.id, token });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Email already exists' });
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/profile', requireAuth, async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ message: 'Database not configured' });
    
    const user = await prisma.creator.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'Not found' });
    
    // Return the role from the database (adminRole field) instead of from JWT token
    const role = user.adminRole || 'USER';
    
    res.json({ 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      role: role, 
      isActive: user.isActive, 
      applicationStatus: user.applicationStatus 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/logout', async (req, res) => {
  res.json({ message: 'ok' });
});

module.exports = router;





