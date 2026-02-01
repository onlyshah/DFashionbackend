/**
 * ============================================================================
 * UNIFIED AUTHENTICATION ROUTES
 * ============================================================================
 * Single route file for all authentication endpoints
 * Uses PostgreSQL authentication controller (authController.postgres)
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController.postgres');
const { auth, optionalAuth } = require('../middleware/auth');

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

/**
 * POST /api/auth/register
 * Register new user
 * Body: { username, email, password, passwordConfirm, fullName, role? }
 */
router.post('/register', async (req, res) => {
  try {
    await authController.register(req, res);
  } catch (error) {
    console.error('Register route error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/auth/login
 * User login
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    await authController.login(req, res);
  } catch (error) {
    console.error('Login route error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/auth/refresh-token
 * Refresh access token
 * Body: { refreshToken }
 */
router.post('/refresh-token', async (req, res) => {
  try {
    await authController.refreshToken(req, res);
  } catch (error) {
    console.error('Refresh token route error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/auth/request-password-reset
 * Request password reset
 * Body: { email }
 */
router.post('/request-password-reset', async (req, res) => {
  try {
    await authController.requestPasswordReset(req, res);
  } catch (error) {
    console.error('Request password reset route error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 * Body: { resetToken, newPassword, confirmPassword }
 */
router.post('/reset-password', async (req, res) => {
  try {
    await authController.resetPassword(req, res);
  } catch (error) {
    console.error('Reset password route error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email with token
 * Body: { verificationToken }
 */
router.post('/verify-email', async (req, res) => {
  try {
    await authController.verifyEmail(req, res);
  } catch (error) {
    console.error('Verify email route error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================================
// PROTECTED ROUTES (Authentication required)
// ============================================================================

/**
 * GET /api/auth/me
 * Get current authenticated user
 * Headers: { Authorization: Bearer <token> }
 */
router.get('/me', auth, async (req, res) => {
  try {
    await authController.getCurrentUser(req, res);
  } catch (error) {
    console.error('Get current user route error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/auth/logout
 * Logout current user (revoke session)
 * Headers: { Authorization: Bearer <token> }
 */
router.post('/logout', auth, async (req, res) => {
  try {
    await authController.logout(req, res);
  } catch (error) {
    console.error('Logout route error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * ADMIN ROUTES
 * These routes are accessible from /api/auth/* or /api/admin/auth/*
 */

// POST /api/auth/admin/login or /api/admin/auth/login
router.post('/admin/login', async (req, res) => {
  try {
    // This is an alias for the regular login endpoint
    // Admin role is determined by the user's role in the database
    await authController.login(req, res);
  } catch (error) {
    console.error('Admin login route error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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
