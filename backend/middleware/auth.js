const jwt = require('jsonwebtoken');
const { User: UserModel } = require('../models_sql')._raw;
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

    try {
      // Use Sequelize findByPk for Postgres
      const user = await UserModel.findByPk(decoded.userId, {
        attributes: { exclude: ['password'] }
      });
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
    } catch (dbError) {
      console.error('❌ Auth middleware - Database error:', dbError.message);
      // If user lookup fails, allow request to continue with decoded token data
      // This prevents blocking when MongoDB is unavailable
      req.user = {
        _id: decoded.userId,
        email: decoded.email || 'unknown',
        role: decoded.role || 'user'
      };
      console.log('🔐 Auth middleware - Using token data as fallback');
      next();
    }
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

// Optional authentication - doesn't fail if no token, but sets req.user if token is valid
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // No token provided, continue without authentication
      req.user = null;
      return next();
    }

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET not found in environment variables');
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    try {
      // Use Sequelize findByPk for Postgres
      const user = await UserModel.findByPk(decoded.userId, {
        attributes: { exclude: ['password'] }
      });
      
      if (user) {
        req.user = {
          userId: user.id,
          _id: user.id,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        };
      } else {
        req.user = null;
      }
    } catch (dbError) {
      console.warn('Optional auth: DB error, continuing without user:', dbError.message);
      req.user = null;
    }
    
    next();
  } catch (error) {
    // Invalid token, continue without authentication
    req.user = null;
    next();
  }
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

// Allow resource owner or specific roles middleware
// modelName: string path under ../models (e.g., 'Payment')
// idParam: request param name that contains the resource id (e.g., 'paymentId')
// ownerField: field on the resource that references the owner user id (e.g., 'customer')
// roles: array of role names allowed to access
const allowResourceOwnerOrRoles = (modelName, idParam, ownerField, roles) => {
  return async (req, res, next) => {
    try {
      const models = require('../models');
      const Model = models[modelName];
      if (!Model) return res.status(500).json({ success: false, message: 'Server misconfiguration' });

      const resourceId = req.params[idParam];
      if (!resourceId) return res.status(400).json({ success: false, message: 'Missing resource identifier' });

      const resource = await Model.findById(resourceId).select(ownerField);
      if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });

      const ownerId = resource[ownerField] ? resource[ownerField].toString() : null;

      if (ownerId && ownerId === (req.user._id || req.user.userId).toString()) {
        return next();
      }

      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      if (allowedRoles.includes(req.user.role)) return next();

      return res.status(403).json({ success: false, message: 'Access denied' });
    } catch (error) {
      console.error('allowResourceOwnerOrRoles error:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  };
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
  , allowResourceOwnerOrRoles
};
