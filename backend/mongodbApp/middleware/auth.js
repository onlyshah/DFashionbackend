/**
 * Auth Middleware - JWT Token Verification & Role-Based Access Control
 * MongoDB/Mongoose Version
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Verify JWT token and attach user to request
 */
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
        timestamp: new Date().toISOString()
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Optional auth - doesn't block if no token
 */
const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    }
    next();
  } catch (error) {
    // Token invalid but optional, so continue without user
    next();
  }
};

/**
 * Require specific role(s)
 * Usage: requireRole(['admin', 'super_admin'])
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions. Required role: ' + allowedRoles.join(' or '),
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

/**
 * Check if user is vendor with approved status
 */
const isApprovedVendor = async (req, res, next) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can perform this action',
        timestamp: new Date().toISOString()
      });
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account is not active',
        timestamp: new Date().toISOString()
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error verifying vendor status',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Allow resource owner or specific roles
 * Usage: allowResourceOwnerOrRoles(Model, idParam, ownerField, allowedRoles)
 * Example: allowResourceOwnerOrRoles('Product', 'id', 'vendor', ['admin', 'super_admin'])
 */
const allowResourceOwnerOrRoles = (modelName, idParam, ownerField, allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
      }

      // Admins and super admins can always access
      if (['admin', 'super_admin'].includes(req.user.role)) {
        return next();
      }

      // Check if user has required role
      if (allowedRoles && allowedRoles.includes(req.user.role)) {
        return next();
      }

      // Check if user is resource owner
      const resourceId = req.params[idParam];
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID not provided',
          timestamp: new Date().toISOString()
        });
      }

      // Verify resource ownership
      const Model = require(`../models/${modelName}`);
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: `${modelName} not found`,
          timestamp: new Date().toISOString()
        });
      }

      const ownerId = resource[ownerField]?.toString() || resource[ownerField];
      const userId = req.user.id?.toString() || req.user.id;

      if (ownerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource',
          timestamp: new Date().toISOString()
        });
      }

      next();
    } catch (error) {
      console.error('❌ allowResourceOwnerOrRoles error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verifying permissions',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Verify resource ownership
 */
const verifyOwnership = (modelName, idParam, ownerField) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
      }

      const resourceId = req.params[idParam];
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID not provided',
          timestamp: new Date().toISOString()
        });
      }

      const Model = require(`../models/${modelName}`);
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: `${modelName} not found`,
          timestamp: new Date().toISOString()
        });
      }

      const ownerId = resource[ownerField]?.toString() || resource[ownerField];
      const userId = req.user.id?.toString() || req.user.id;

      // Admins can access any resource
      if (['admin', 'super_admin'].includes(req.user.role)) {
        return next();
      }

      if (ownerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource',
          timestamp: new Date().toISOString()
        });
      }

      next();
    } catch (error) {
      console.error('❌ verifyOwnership error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verifying ownership',
        timestamp: new Date().toISOString()
      });
    }
  };
};

const ApiError = require('../utils/ApiError');

module.exports = {
  auth,
  optionalAuth,
  requireRole,
  isApprovedVendor,
  allowResourceOwnerOrRoles,
  verifyOwnership,

  // compatibility wrappers requested by new services
  verifyToken: (required = true) => async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        if (required) return next(new ApiError('Authorization token missing', 401, 'ERR_NO_TOKEN'));
        req.user = null; return next();
      }
      const decoded = jwt.verify(token, JWT_SECRET);
      // attach decoded payload and attempt to load user id if present
      req.user = decoded;
      req.role = decoded.role || decoded.user_role || decoded.roleName || null;
      req.permissions = decoded.permissions || [];
      return next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') return next(new ApiError('Token expired', 401, 'ERR_TOKEN_EXPIRED'));
      return next(new ApiError('Invalid token', 401, 'ERR_INVALID_TOKEN'));
    }
  },

  verifyRole: (roles = []) => (req, res, next) => {
    if (!req.user) return next(new ApiError('Authentication required', 401, 'ERR_AUTH_REQUIRED'));
    const userRole = req.role || req.user.role;
    if (!roles || roles.length === 0) return next();
    if (roles.includes(userRole)) return next();
    return next(new ApiError('Forbidden: insufficient role', 403, 'ERR_FORBIDDEN'));
  },

  verifyPermission: (permission) => (req, res, next) => {
    if (!req.user) return next(new ApiError('Authentication required', 401, 'ERR_AUTH_REQUIRED'));
    const permissions = req.permissions || [];
    if (!permission) return next();
    if (permissions.includes(permission)) return next();
    return next(new ApiError('Forbidden: insufficient permission', 403, 'ERR_FORBIDDEN'));
  },

  extractUserFromToken: async (token) => {
    try {
      if (!token) return null;
      const t = token.split(' ')[1] || token;
      const decoded = jwt.verify(t, JWT_SECRET);
      return decoded;
    } catch (err) { return null; }
  },

  signToken: (payload, expiresIn = process.env.JWT_EXPIRES_IN || '1h') => jwt.sign(payload, JWT_SECRET, { expiresIn })
};
