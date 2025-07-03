const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('🔐 Auth middleware - Token present:', !!token);
    console.log('🔐 Auth middleware - JWT_SECRET available:', !!process.env.JWT_SECRET);

    if (!token) {
      console.log('🔐 Auth middleware - No token provided');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET not found in environment variables');
      return res.status(500).json({ message: 'Server configuration error' });
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
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
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
const isApprovedVendor = (req, res, next) => {
  if (req.user.role === 'vendor' && !req.user.vendorInfo.isApproved) {
    return res.status(403).json({ message: 'Vendor account not approved yet.' });
  }
  next();
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

module.exports = {
  auth,
  isVendor,
  isAdmin,
  requireAdmin,
  requireRole,
  requireCustomer,
  isApprovedVendor,
  optionalAuth
};
