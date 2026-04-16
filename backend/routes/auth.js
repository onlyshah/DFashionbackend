const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

/**
 * ============================================================================
 * UNIFIED AUTHENTICATION ROUTES
 * ============================================================================
 * Consolidated auth routes supporting both PostgreSQL and MongoDB controllers
 * All authentication endpoints centralized here
 */

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

// ✅ Use JWT secret from environment variables - MUST be set
if (!process.env.JWT_SECRET) {
  console.error('🔐 CRITICAL ERROR: JWT_SECRET environment variable is not set!');
  console.error('🔐 Please set JWT_SECRET in your .env file for security');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// Import external auth middleware
const { auth: externalAuth, optionalAuth } = require('../middleware/auth');

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

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is running',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

// @route   POST /api/auth/register
// @desc    Register new user
// @body    { username, email, password, passwordConfirm, fullName, role? }
router.post('/register', async (req, res) => {
  try {
    await controller.register(req, res);
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Registration error' });
  }
});

// @route   POST /api/auth/login
// @desc    User login
// @body    { email, password }
router.post('/login', async (req, res) => {
  try {
    await controller.login(req, res);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login error' });
  }
});

// @route   POST /api/auth/admin/login or /api/admin/auth/login
// @desc    Admin login
// @body    { email, password }
router.post('/admin/login', async (req, res) => {
  try {
    if (controller.adminLogin) {
      await controller.adminLogin(req, res);
    } else {
      // Fallback to regular login if controller doesn't have adminLogin
      await controller.login(req, res);
    }
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ success: false, message: 'Admin login error' });
  }
});

// @route   POST /api/auth/refresh-token
// @desc    Refresh access token
// @body    { refreshToken }
router.post('/refresh-token', async (req, res) => {
  try {
    if (controller.refreshToken) {
      await controller.refreshToken(req, res);
    } else {
      res.status(501).json({ success: false, message: 'Refresh token not implemented in current controller' });
    }
  } catch (error) {
    console.error('Refresh token route error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/request-password-reset
// @desc    Request password reset (send reset link via email)
// @body    { email }
router.post('/request-password-reset', async (req, res) => {
  try {
    if (controller.requestPasswordReset) {
      await controller.requestPasswordReset(req, res);
    } else if (controller.forgotPassword) {
      // Fallback to forgotPassword if available
      await controller.forgotPassword(req, res);
    } else {
      res.status(501).json({ success: false, message: 'Password reset not implemented' });
    }
  } catch (error) {
    console.error('Request password reset route error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @body    { resetToken, newPassword, confirmPassword } or { token, newPassword }
router.post('/reset-password', async (req, res) => {
  try {
    await controller.resetPassword(req, res);
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Reset password error' });
  }
});

// @route   POST /api/auth/verify-reset-token
// @desc    Verify that a reset token is valid
// @body    { token }
router.post('/verify-reset-token', async (req, res) => {
  try {
    if (controller.verifyResetToken) {
      await controller.verifyResetToken(req, res);
    } else {
      res.status(501).json({ success: false, message: 'Token verification not implemented' });
    }
  } catch (err) {
    console.error('Verify reset token error:', err);
    res.status(500).json({ success: false, message: 'Verify reset token error' });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify email with token
// @body    { verificationToken }
router.post('/verify-email', async (req, res) => {
  try {
    if (controller.verifyEmail) {
      await controller.verifyEmail(req, res);
    } else {
      res.status(501).json({ success: false, message: 'Email verification not implemented' });
    }
  } catch (error) {
    console.error('Verify email route error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Alternative password recovery endpoint (alias)
// @route   POST /api/auth/forgot-password
// @desc    Forgot password (legacy endpoint - use request-password-reset instead)
router.post('/forgot-password', async (req, res) => {
  try {
    if (controller.forgotPassword) {
      await controller.forgotPassword(req, res);
    } else if (controller.requestPasswordReset) {
      await controller.requestPasswordReset(req, res);
    } else {
      res.status(501).json({ success: false, message: 'Password recovery not implemented' });
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Forgot password error' });
  }
});

// ============================================================================
// PROTECTED ROUTES (Authentication required)
// ============================================================================

// @route   GET /api/auth/me
// @desc    Get current authenticated user
// @auth    Required (Authorization Bearer token)
router.get('/me', verifyToken, async (req, res) => {
  try {
    if (controller.getCurrentUser) {
      await controller.getCurrentUser(req, res);
    } else {
      res.json({ success: true, user: req.user });
    }
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ success: false, message: 'Get user error' });
  }
});

// Aliases for /me endpoint
router.get('/verify', verifyToken, async (req, res) => {
  try {
    res.json({ success: true, data: { user: req.user } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Verification error' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout current user (revoke session)
// @auth    Required (Authorization Bearer token)
router.post('/logout', async (req, res) => {
  try {
    await controller.logout(req, res);
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ success: false, message: 'Logout error' });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

router.use((err, req, res, next) => {
  console.error('Auth route error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = router;