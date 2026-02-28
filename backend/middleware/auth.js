const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ✅ Delay-load User model to ensure Sequelize is connected
const getUserModel = async () => {
  const models = require('../models_sql');
  let User = models._raw && models._raw.User ? models._raw.User : models.User;
  
  if (!User || (User && typeof User.findByPk !== 'function')) {
    console.log('[auth] User model is stub, attempting to reload...');
    await models.getSequelizeInstance();
    
    delete require.cache[require.resolve('../models_sql')];
    const freshModels = require('../models_sql');
    User = freshModels._raw && freshModels._raw.User ? freshModels._raw.User : freshModels.User;
  }
  
  return User;
};

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

    // ✅ Use same JWT secret as login controller (with fallback)
    const JWT_SECRET = process.env.JWT_SECRET || 'dfashion_secret_key';
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('🔐 Auth middleware - Token decoded, userId:', decoded.userId);

    try {
      // ✅ Load User model dynamically to ensure it's initialized
      const User = await getUserModel();
      if (!User) {
        throw new Error('User model not available');
      }

      // Use Sequelize findByPk for Postgres
      const user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ['passwordHash', 'password'] }
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
      // This prevents blocking when database is unavailable
      req.user = {
        _id: decoded.userId,
        id: decoded.userId,
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

    // ✅ Use same JWT secret as login controller (with fallback)
    const JWT_SECRET = process.env.JWT_SECRET || 'dfashion_secret_key';
    const decoded = jwt.verify(token, JWT_SECRET);
    
    try {
      // ✅ Load User model dynamically to ensure it's initialized
      const User = await getUserModel();
      if (!User) {
        req.user = null;
        return next();
      }

      const user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ['passwordHash', 'password'] }
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

// Require specific roles - CHECKS DATABASE, not just token
const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      console.log('🔐 Role check - Required roles:', allowedRoles);

      if (!req.user) {
        console.log('🔐 Role check - No user object found');
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Fetch CURRENT user role from database (gets updates immediately)
      try {
        const models = require('../models_sql');
        const User = models._raw?.User || models.User;
        const Role = models._raw?.Role || models.Role;

        if (User && Role) {
          const currentUser = await User.findByPk(req.user.id || req.user.userId);
          const userRole = await Role.findByPk(currentUser.roleId);

          if (!currentUser || !userRole) {
            return res.status(401).json({
              success: false,
              message: 'User or role not found'
            });
          }

          console.log('🔐 Role check - Current DB role:', userRole.name, 'Required roles:', allowedRoles);

          // Check if user's role is in allowed roles
          if (!allowedRoles.includes(userRole.name)) {
            console.log('🔐 Role check - Access denied for role:', userRole.name);
            return res.status(403).json({
              success: false,
              message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
              userRole: userRole.name
            });
          }

          // Update req.user with current role from DB
          req.user.role = userRole.name;
        }
      } catch (dbError) {
        console.warn('⚠️ Role check - DB lookup failed, using token role:', dbError.message);
        // Fallback to token role if DB fails
        if (!allowedRoles.includes(req.user.role)) {
          return res.status(403).json({
            success: false,
            message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
          });
        }
      }

      console.log('🔐 Role check - Access granted');
      next();
    } catch (error) {
      console.error('❌ Role check error:', error.message);
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
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
