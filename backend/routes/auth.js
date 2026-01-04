const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Determine controller based on DB_TYPE or runtime detection
const dbTypeEnv = (process.env.DB_TYPE || '').toLowerCase();
let controller;
try {
  if (dbTypeEnv === 'postgres') {
    controller = require('../controllers/authController.postgres');
  } else if (dbTypeEnv === 'mongo') {
    controller = require('../controllers/authController.mongo');
  } else {
    // Auto-detect: prefer MongoDB if connected, otherwise Postgres
    const mongoose = require('mongoose');
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      controller = require('../controllers/authController.mongo');
    } else {
      controller = require('../controllers/authController.postgres');
    }
  }
} catch (err) {
  console.error('Error loading auth controllers:', err.message);
  // Fallback to postgres controller if available
  controller = require('../controllers/authController.postgres');
}

console.log('[routes/auth] Using controller:', controller && controller.login ? (controller.adminLogin ? 'postgres/mongo-detected' : 'unknown') : 'none');

const JWT_SECRET = process.env.JWT_SECRET || 'dfashion_secret_key';

// Verify token middleware that fetches user via selected controller
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await controller.getUserById(decoded.userId);
    if (!user || (user.isActive !== undefined && !user.isActive)) return res.status(401).json({ success: false, message: 'Invalid or inactive user' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Routes delegate to selected controller
router.post('/register', async (req, res) => {
  try {
    await controller.register(req, res);
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Registration error' });
  }
});
router.post('/login', async (req, res) => {
  try {
    await controller.login(req, res);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login error' });
  }
});
router.post('/admin/login', async (req, res) => {
  try {
    await controller.adminLogin(req, res);
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ success: false, message: 'Admin login error' });
  }
});
router.get('/verify', verifyToken, (req, res) => res.json({ success: true, data: { user: req.user } }));
router.get('/me', verifyToken, (req, res) => res.json({ success: true, user: req.user }));
router.post('/logout', (req, res) => controller.logout(req, res));

// Password recovery routes
router.post('/forgot-password', async (req, res) => {
  try {
    await controller.forgotPassword(req, res);
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Forgot password error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    await controller.resetPassword(req, res);
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Reset password error' });
  }
});

router.post('/verify-reset-token', async (req, res) => {
  try {
    await controller.verifyResetToken(req, res);
  } catch (err) {
    console.error('Verify reset token error:', err);
    res.status(500).json({ success: false, message: 'Verify reset token error' });
  }
});

module.exports = router;
