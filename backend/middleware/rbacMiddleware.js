/**
 * ============================================================================
 * COMPREHENSIVE ROLE-BASED ACCESS CONTROL (RBAC) MIDDLEWARE
 * ============================================================================
 * Purpose: Enforce role-based access control across all API endpoints
 * - Role verification
 * - Permission checking
 * - Resource ownership validation
 * - Audit logging for critical actions
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dfashion_secret_key_change_in_production';

/**
 * Role hierarchy (lower number = more privileged)
 */
const ROLE_HIERARCHY = {
  super_admin: 0,
  admin: 1,
  moderator: 2,
  support_agent: 3,
  seller: 4,
  creator: 5,
  customer: 6
};

/**
 * Role-specific permissions matrix
 */
const ROLE_PERMISSIONS = {
  super_admin: {
    users: ['create', 'read', 'update', 'delete', 'ban', 'unban'],
    roles: ['create', 'read', 'update', 'delete'],
    permissions: ['create', 'read', 'update', 'delete'],
    products: ['create', 'read', 'update', 'delete', 'approve', 'reject', 'feature'],
    orders: ['create', 'read', 'update', 'delete', 'cancel', 'refund'],
    payments: ['create', 'read', 'update', 'delete', 'refund'],
    content: ['create', 'read', 'update', 'delete', 'approve', 'reject', 'moderate'],
    analytics: ['read', 'export'],
    reports: ['read', 'create', 'export'],
    settings: ['read', 'update'],
    audit: ['read', 'export'],
    support: ['read', 'update', 'close']
  },
  admin: {
    users: ['create', 'read', 'update', 'ban'],
    products: ['read', 'update', 'approve', 'reject', 'feature'],
    orders: ['read', 'update', 'cancel', 'refund'],
    payments: ['read', 'refund'],
    content: ['read', 'approve', 'reject', 'moderate'],
    analytics: ['read'],
    reports: ['read', 'create', 'export'],
    settings: ['read'],
    audit: ['read'],
    support: ['read', 'update']
  },
  moderator: {
    content: ['read', 'update', 'approve', 'reject', 'moderate'],
    users: ['read', 'ban'],  // Only their reports
    orders: ['read'],
    analytics: ['read']
  },
  support_agent: {
    users: ['read', 'update'],  // Limited user info
    orders: ['read', 'update'],
    payments: ['read', 'refund'],  // Refund requests
    support: ['create', 'read', 'update', 'close'],
    analytics: ['read']
  },
  seller: {
    products: ['create', 'read', 'update'],  // Own only
    orders: ['read', 'update'],  // Own only
    payments: ['read'],  // Own only
    analytics: ['read']  // Own only
  },
  creator: {
    content: ['create', 'read', 'update', 'delete'],  // Own only
    users: ['read'],  // Other creators/followers
    analytics: ['read']  // Own only
  },
  customer: {
    products: ['read'],
    orders: ['create', 'read', 'update'],  // Own only
    payments: ['create', 'read'],  // Own only
    content: ['read', 'create'],  // Comments, likes on others' content
    support: ['create', 'read', 'update']  // Own tickets
  }
};

/**
 * Authenticate user from JWT token
 * Middleware to extract and validate JWT
 */
const rbacAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided',
        code: 'NO_TOKEN'
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || [],
        type: decoded.type
      };
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
          expiredAt: error.expiredAt
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid authentication token',
      code: 'INVALID_TOKEN'
    });
  }
};

/**
 * Check if user has specific role(s)
 * @param {string|string[]} allowedRoles - Single role or array of roles
 */
const requireRoles = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`,
        code: 'INSUFFICIENT_ROLE',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Check if user has minimum role level (higher privilege = lower number)
 * @param {string} minimumRole - Minimum required role
 */
const requireMinimumRole = (minimumRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] ?? Infinity;
    const minimumLevel = ROLE_HIERARCHY[minimumRole] ?? Infinity;

    if (userLevel > minimumLevel) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Minimum role required: ${minimumRole}`,
        code: 'INSUFFICIENT_ROLE',
        minimumRole,
        userRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Check if user has specific permission for a resource
 * @param {string} resource - Resource type (e.g., 'products', 'orders')
 * @param {string|string[]} actions - Allowed action(s) (e.g., 'read', 'create')
 */
const requirePermission = (resource, actions) => {
  const allowedActions = Array.isArray(actions) ? actions : [actions];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const rolePermissions = ROLE_PERMISSIONS[req.user.role] || {};
    const resourcePermissions = rolePermissions[resource] || [];

    const hasPermission = allowedActions.some(action => 
      resourcePermissions.includes(action)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You don't have permission to ${allowedActions.join('/')} on ${resource}`,
        code: 'INSUFFICIENT_PERMISSION',
        resource,
        requiredActions: allowedActions,
        userRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Check if user owns the resource OR has admin role
 * @param {string} resourceOwnerId - Owner ID from resource
 */
const requireOwnershipOrAdmin = (resourceOwnerId) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const isOwner = req.user.userId === resourceOwnerId;
    const isAdmin = ROLE_HIERARCHY[req.user.role] <= ROLE_HIERARCHY['admin'];

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this resource',
        code: 'NOT_RESOURCE_OWNER',
        ownerId: resourceOwnerId,
        userId: req.user.userId
      });
    }

    req.isResourceOwner = isOwner;
    next();
  };
};

/**
 * Optional authentication - attach user if token is valid, continue if not
 */
const optionalRbacAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || [],
        type: decoded.type
      };
    }
  } catch (error) {
    console.log('Optional auth - token invalid or missing:', error.message);
  }

  next();
};

/**
 * Audit critical actions
 * @param {string} action - Action name
 * @param {string} resource - Resource type
 */
const auditAction = (action, resource) => {
  return async (req, res, next) => {
    // Store audit info in request for later logging
    req.audit = {
      action,
      resource,
      userId: req.user?.userId,
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      resourceId: req.params.id || req.body.id,
      changes: req.body
    };

    next();
  };
};

/**
 * Check if user can access seller routes (own seller profile)
 */
const requireOwnSeller = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }

  if (req.user.role !== 'seller' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Seller access required',
      code: 'SELLER_ACCESS_REQUIRED',
      userRole: req.user.role
    });
  }

  next();
};

/**
 * Check if user can access creator routes (own creator profile)
 */
const requireCreator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }

  if (req.user.role !== 'creator' && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Creator access required',
      code: 'CREATOR_ACCESS_REQUIRED',
      userRole: req.user.role
    });
  }

  next();
};

/**
 * Check if user is moderator (for moderation queue access)
 */
const requireModerator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }

  if (!['moderator', 'admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Moderator access required',
      code: 'MODERATOR_ACCESS_REQUIRED',
      userRole: req.user.role
    });
  }

  next();
};

/**
 * Check if user is support agent
 */
const requireSupportAgent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }

  if (!['support_agent', 'admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Support agent access required',
      code: 'SUPPORT_ACCESS_REQUIRED',
      userRole: req.user.role
    });
  }

  next();
};

/**
 * Get user permissions for a resource
 */
const getUserPermissions = (role, resource) => {
  return ROLE_PERMISSIONS[role]?.[resource] || [];
};

/**
 * Check if role can perform action on resource
 */
const canPerformAction = (role, resource, action) => {
  const permissions = getUserPermissions(role, resource);
  return permissions.includes(action);
};

module.exports = {
  // Middleware functions
  rbacAuth,
  optionalRbacAuth,
  requireRoles,
  requireMinimumRole,
  requirePermission,
  requireOwnershipOrAdmin,
  auditAction,
  requireOwnSeller,
  requireCreator,
  requireModerator,
  requireSupportAgent,
  // Utility functions
  getUserPermissions,
  canPerformAction,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS
};
