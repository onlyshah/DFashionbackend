const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');

// === CONFIG ===
const JWT_SECRET = process.env.JWT_SECRET || 'dfashion_secret_key';
const USER_TOKEN_EXPIRY = '24h';
const ADMIN_TOKEN_EXPIRY = '8h';
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; // 30 minutes

// === HELPERS ===
const generateToken = (userId, role, expiry) =>
  jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: expiry });

const getUserPermissions = (role) => {
  switch (role) {
    case 'super_admin':
      return ['all'];
    case 'admin':
      return ['manage_users', 'view_reports', 'manage_products'];
    case 'sales_manager':
      return ['view_orders', 'manage_sales'];
    case 'support_agent':
      return ['handle_tickets', 'view_users'];
    default:
      return [];
  }
};

// === TOKEN VERIFY ===
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token)
      return res.status(401).json({ success: false, message: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive)
      return res.status(401).json({ success: false, message: 'Invalid or inactive user' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// === USER AUTH ROUTES ===

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, fullName, role = 'customer' } = req.body;

    if (!email || !password || !username)
      return res.status(400).json({ message: 'Missing required fields' });

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing)
      return res.status(400).json({ message: 'User already exists' });

    const user = new User({ username, email, password, fullName, role });
    await user.save();

    const token = generateToken(user._id, user.role, USER_TOKEN_EXPIRY);
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !user.isActive)
      return res.status(400).json({ message: 'Invalid credentials or deactivated account' });

    // Lockout check
    if (user.accountLocked && user.lockUntil > Date.now()) {
      const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(403).json({ message: `Account locked. Try again in ${mins} min.` });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.accountLocked = true;
        user.lockUntil = Date.now() + LOCK_TIME;
      }
      await user.save();
      const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - (user.failedLoginAttempts || 0));
      return res.status(400).json({
        message: `Invalid credentials. ${remaining} attempt(s) remaining.`,
      });
    }

    // Reset lock info
    user.failedLoginAttempts = 0;
    user.accountLocked = false;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, user.role, USER_TOKEN_EXPIRY);
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Verify Token (User)
router.get('/verify', verifyToken, (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

// Profile (User)
router.get('/me', verifyToken, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// Logout
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// === ADMIN AUTH ROUTES ===

// Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const admin = await User.findOne({
      email: email.toLowerCase(),
      role: { $in: ['super_admin', 'admin', 'sales_manager', 'support_agent'] }
    });

    if (!admin)
      return res.status(401).json({ message: 'Invalid admin credentials' });
    if (!admin.isActive)
      return res.status(403).json({ message: 'Admin account is deactivated' });

    if (admin.accountLocked && admin.lockUntil > Date.now()) {
      const mins = Math.ceil((admin.lockUntil - Date.now()) / 60000);
      return res.status(403).json({ message: `Account locked. Try again in ${mins} min.` });
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
      if (admin.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        admin.accountLocked = true;
        admin.lockUntil = Date.now() + LOCK_TIME;
      }
      await admin.save();
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    admin.failedLoginAttempts = 0;
    admin.accountLocked = false;
    admin.lockUntil = null;
    admin.lastLogin = new Date();
    await admin.save();

    // Format permissions for frontend
    let permissions = [];
    if (admin.role === 'super_admin') {
      permissions = [{ module: 'all', actions: ['all'] }];
    } else if (admin.role === 'admin') {
      permissions = [
        { module: 'users', actions: ['view', 'manage'] },
        { module: 'reports', actions: ['view'] },
        { module: 'products', actions: ['manage'] }
      ];
    } else if (admin.role === 'sales_manager') {
      permissions = [
        { module: 'orders', actions: ['view'] },
        { module: 'sales', actions: ['manage'] }
      ];
    } else if (admin.role === 'support_agent') {
      permissions = [
        { module: 'tickets', actions: ['handle'] },
        { module: 'users', actions: ['view'] }
      ];
    }
    const token = generateToken(admin._id, admin.role, ADMIN_TOKEN_EXPIRY);

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        token,
        user: {
          id: admin._id,
          email: admin.email,
          fullName: admin.fullName,
          role: admin.role,
          permissions,
          avatar: admin.avatar
        }
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during admin login' });
  }
});

// Admin Verify
router.get('/admin/verify', verifyToken, (req, res) => {
  if (!['super_admin', 'admin', 'sales_manager', 'support_agent'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Not authorized as admin' });
  }
  res.json({ success: true, data: { user: req.user } });
});

// Admin Logout
router.post('/admin/logout', (req, res) => {
  res.json({ success: true, message: 'Admin logged out successfully' });
});

module.exports = router;
