const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');

// Track failed login attempts
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Track active sessions
const activeSessions = new Map();

// Enhanced JWT token verification with security features
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const clientIP = req.ip || req.connection.remoteAddress;

    console.log('🔐 Auth middleware - Token present:', !!token);
    console.log('🔐 Auth middleware - Client IP:', clientIP);

    if (!token) {
      console.log('🔐 Auth middleware - No token provided');
      return res.status(401).json({
        success: false,
        message: 'No token, authorization denied'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET not found in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔐 Auth middleware - Token decoded, userId:', decoded.userId);

    const user = await User.findById(decoded.userId).select('-password');
    console.log('🔐 Auth middleware - User found:', !!user);

    if (!user) {
      console.log('🔐 Auth middleware - User not found in database');
      return res.status(401).json({ message: 'Token is not valid' });
    }

    if (!user.isActive) {
      console.log('🔐 Auth middleware - User account is deactivated');
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    console.log('🔐 Auth middleware - User authenticated:', user.email, 'Role:', user.role);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Check if user is vendor
const isVendor = (req, res, next) => {
  if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Vendor role required.' });
  }
  next();
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  const adminRoles = ['super_admin', 'admin'];
  if (!adminRoles.includes(req.user.role)) {
    console.log('🔐 isAdmin middleware - Access denied for role:', req.user.role);
    return res.status(403).json({
      message: 'Access denied. Admin role required.',
      userRole: req.user.role,
      requiredRoles: adminRoles
    });
  }
  console.log('🔐 isAdmin middleware - Access granted for role:', req.user.role);
  next();
};

// Require admin role (admin, sales, marketing, etc.)
const requireAdmin = (req, res, next) => {
  const adminRoles = ['admin', 'sales', 'marketing', 'accounting', 'support'];
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Require specific roles
const requireRole = (roles) => {
  return (req, res, next) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    console.log('🔐 Role check - User role:', req.user?.role, 'Required roles:', allowedRoles);

    if (!req.user) {
      console.log('🔐 Role check - No user object found');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.log('🔐 Role check - Access denied for role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }

    console.log('🔐 Role check - Access granted');
    next();
  };
};

// Check if vendor is approved
const isApprovedVendor = async (req, res, next) => {
  try {
    if (req.user.role === 'vendor') {
      const User = require('../models/User');
      const vendor = await User.findById(req.user.userId);

      if (!vendor || vendor.vendorVerification.status !== 'approved') {
        return res.status(403).json({
          success: false,
          message: 'Vendor verification required. Please complete verification process.'
        });
      }
    }
    next();
  } catch (error) {
    console.error('Vendor verification check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Check if user is customer
const requireCustomer = (req, res, next) => {
  if (req.user.role !== 'customer' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Customer role required.'
    });
  }
  next();
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token && process.env.JWT_SECRET) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');

      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

// Security enhancement functions
const recordFailedLogin = (identifier) => {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };

  // Reset count if last attempt was more than lockout duration ago
  if (now - attempts.lastAttempt > LOCKOUT_DURATION) {
    attempts.count = 0;
  }

  attempts.count++;
  attempts.lastAttempt = now;
  loginAttempts.set(identifier, attempts);

  console.warn(`Failed login attempt ${attempts.count} for ${identifier}`);
  return attempts.count;
};

const isAccountLocked = (identifier) => {
  const attempts = loginAttempts.get(identifier);
  if (!attempts) return false;

  const now = Date.now();
  const timeSinceLastAttempt = now - attempts.lastAttempt;

  // Clear old attempts if lockout period has passed
  if (timeSinceLastAttempt > LOCKOUT_DURATION) {
    loginAttempts.delete(identifier);
    return false;
  }

  return attempts.count >= MAX_LOGIN_ATTEMPTS;
};

const clearLoginAttempts = (identifier) => {
  loginAttempts.delete(identifier);
};

const createSession = (userId, token, clientIP, userAgent) => {
  const sessionKey = `${userId}_${token.slice(-10)}`;
  activeSessions.set(sessionKey, {
    userId,
    ip: clientIP,
    lastActivity: Date.now(),
    userAgent,
    createdAt: Date.now()
  });
  return sessionKey;
};

const destroySession = (sessionKey) => {
  activeSessions.delete(sessionKey);
};

const cleanupExpiredSessions = () => {
  const now = Date.now();
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  for (const [key, session] of activeSessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      activeSessions.delete(key);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

module.exports = {
  auth,
  isVendor,
  isAdmin,
  requireAdmin,
  requireRole,
  requireCustomer,
  isApprovedVendor,
  optionalAuth,
  recordFailedLogin,
  isAccountLocked,
  clearLoginAttempts,
  createSession,
  destroySession,
  cleanupExpiredSessions
};
