// Import dependencies - no fallbacks, require database
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Admin roles that can access dashboard
const ADMIN_ROLES = [
  'super_admin', 'admin', 'sales_manager', 'sales_executive', 
  'marketing_manager', 'marketing_executive', 'account_manager', 
  'accountant', 'support_manager', 'support_agent', 'content_manager', 
  'vendor_manager'
];

// Role hierarchy for permission inheritance
const ROLE_HIERARCHY = {
  super_admin: 10,
  admin: 9,
  sales_manager: 7,
  marketing_manager: 7,
  account_manager: 7,
  support_manager: 7,
  content_manager: 6,
  vendor_manager: 6,
  sales_executive: 5,
  marketing_executive: 5,
  accountant: 5,
  support_agent: 4
};

// Verify JWT token and admin access
exports.verifyAdminToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.adminToken ||
                  req.query?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Check if account is locked
    if (user.accountLocked && user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(401).json({
        success: false,
        message: 'Account is temporarily locked.',
        code: 'ACCOUNT_LOCKED'
      });
    }

    // Check if user has admin privileges
    if (!ADMIN_ROLES.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.',
        code: 'TOKEN_EXPIRED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Token verification failed.',
      error: error.message
    });
  }
};

// Check specific permission
exports.requirePermission = (module, action) => {
  return (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
          code: 'AUTH_REQUIRED'
        });
      }

      // Super admin has all permissions
      if (user.role === 'super_admin') {
        return next();
      }

      // Check if user has specific permission
      const hasPermission = checkUserPermission(user, module, action);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${module}.${action}`,
          code: 'PERMISSION_DENIED',
          required_permission: `${module}.${action}`
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Permission check failed.',
        error: error.message
      });
    }
  };
};

// Check role hierarchy
exports.requireRole = (requiredRole) => {
  return (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
          code: 'AUTH_REQUIRED'
        });
      }

      const userLevel = ROLE_HIERARCHY[user.role] || 0;
      const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${requiredRole}`,
          code: 'ROLE_INSUFFICIENT',
          required_role: requiredRole,
          user_role: user.role
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Role check failed.',
        error: error.message
      });
    }
  };
};

// Check department access
exports.requireDepartment = (departments) => {
  return (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
          code: 'AUTH_REQUIRED'
        });
      }

      // Super admin can access all departments
      if (user.role === 'super_admin') {
        return next();
      }

      const allowedDepartments = Array.isArray(departments) ? departments : [departments];
      
      if (!allowedDepartments.includes(user.department)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required department: ${allowedDepartments.join(' or ')}`,
          code: 'DEPARTMENT_ACCESS_DENIED',
          required_departments: allowedDepartments,
          user_department: user.department
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Department check failed.',
        error: error.message
      });
    }
  };
};

// Helper function to check user permission
function checkUserPermission(user, module, action) {
  // Check custom permissions first
  if (user.permissions && user.permissions.length > 0) {
    const modulePermission = user.permissions.find(p => p.module === module);
    if (modulePermission && modulePermission.actions.includes(action)) {
      return true;
    }
  }

  // Check role-based permissions
  const rolePermissions = getRolePermissions(user.role);
  return rolePermissions[module] && rolePermissions[module].includes(action);
}

// Get permissions for a role
function getRolePermissions(role) {
  const permissions = {
    super_admin: {
      dashboard: ['view', 'analytics', 'reports'],
      users: ['view', 'create', 'edit', 'delete', 'ban', 'roles'],
      products: ['view', 'create', 'edit', 'delete', 'approve', 'featured', 'inventory'],
      orders: ['view', 'edit', 'cancel', 'refund', 'shipping', 'reports'],
      finance: ['view', 'transactions', 'payouts', 'reports', 'taxes', 'reconciliation'],
      marketing: ['campaigns', 'promotions', 'content', 'social', 'analytics', 'email'],
      support: ['tickets', 'chat', 'knowledge_base', 'announcements'],
      vendors: ['view', 'approve', 'commission', 'performance', 'payouts'],
      settings: ['general', 'security', 'integrations', 'backup', 'logs']
    },
    admin: {
      dashboard: ['view', 'analytics', 'reports'],
      users: ['view', 'create', 'edit', 'ban'],
      products: ['view', 'create', 'edit', 'approve', 'featured'],
      orders: ['view', 'edit', 'cancel', 'refund', 'shipping'],
      finance: ['view', 'transactions', 'reports'],
      marketing: ['campaigns', 'promotions', 'content'],
      support: ['tickets', 'chat', 'knowledge_base'],
      vendors: ['view', 'approve', 'performance'],
      settings: ['general']
    },
    sales_manager: {
      dashboard: ['view', 'analytics'],
      users: ['view'],
      products: ['view', 'edit'],
      orders: ['view', 'edit', 'shipping', 'reports'],
      finance: ['view', 'reports'],
      vendors: ['view', 'performance']
    },
    sales_executive: {
      dashboard: ['view'],
      users: ['view'],
      products: ['view'],
      orders: ['view', 'edit'],
      vendors: ['view']
    },
    marketing_manager: {
      dashboard: ['view', 'analytics'],
      users: ['view'],
      products: ['view'],
      marketing: ['campaigns', 'promotions', 'content', 'social', 'analytics', 'email'],
      support: ['announcements']
    },
    marketing_executive: {
      dashboard: ['view'],
      products: ['view'],
      marketing: ['campaigns', 'content', 'social']
    },
    account_manager: {
      dashboard: ['view', 'analytics'],
      users: ['view'],
      orders: ['view', 'reports'],
      finance: ['view', 'transactions', 'payouts', 'reports', 'reconciliation'],
      vendors: ['view', 'payouts']
    },
    accountant: {
      dashboard: ['view'],
      orders: ['view'],
      finance: ['view', 'transactions', 'reports']
    },
    support_manager: {
      dashboard: ['view'],
      users: ['view'],
      support: ['tickets', 'chat', 'knowledge_base', 'announcements']
    },
    support_agent: {
      dashboard: ['view'],
      users: ['view'],
      support: ['tickets', 'chat']
    }
  };

  return permissions[role] || {};
}

module.exports = exports;
