const jwt = require('jsonwebtoken');
const dbType = (process.env.DB_TYPE || 'postgres').toLowerCase();
const models = dbType.includes('postgres') ? require('../models_sql') : require('../models');
const User = models.User;

// Enhanced authentication middleware with better error handling
const auth = async (req, res, next) => {
  try {
    console.log('🔐 Auth middleware - Processing request to:', req.path);
    
    // Get token from header
    const authHeader = req.headers.authorization;
    console.log('🔐 Auth middleware - Authorization header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🔐 Auth middleware - No valid authorization header');
      return res.status(401).json({ 
        success: false,
        message: 'No token provided. Please login to access this resource.' 
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔐 Auth middleware - Token extracted:', token ? 'Yes' : 'No');
    console.log('🔐 Auth middleware - Token preview:', token ? token.substring(0, 20) + '...' : 'none');

    if (!token) {
      console.log('🔐 Auth middleware - No token in authorization header');
      return res.status(401).json({ 
        success: false,
        message: 'No token provided' 
      });
    }

    // Verify token
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    const jwtSecret = process.env.JWT_SECRET;
    console.log('🔐 Auth middleware - Verifying token with secret');
    
    const decoded = jwt.verify(token, jwtSecret);
    console.log('🔐 Auth middleware - Token decoded successfully, userId:', decoded.userId);

    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.log('🔐 Auth middleware - User not found for ID:', decoded.userId);
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (!user.isActive) {
      console.log('🔐 Auth middleware - User account is inactive:', user.email);
      return res.status(401).json({ 
        success: false,
        message: 'Account is inactive' 
      });
    }

    console.log('🔐 Auth middleware - User authenticated:', user.email, 'Role:', user.role);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token' 
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired. Please login again.' 
      });
    }
    
    res.status(401).json({ 
      success: false,
      message: 'Authentication failed' 
    });
  }
};

// Enhanced role checking with super_admin universal access
const requireRole = (roles) => {
  return (req, res, next) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    // Add super_admin as universal access (unless explicitly excluded)
    if (!allowedRoles.includes('super_admin') && !allowedRoles.includes('!super_admin')) {
      allowedRoles.push('super_admin');
    }
    
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
        message: `Access denied. Required roles: ${allowedRoles.filter(r => r !== 'super_admin').join(', ')}`,
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    console.log('🔐 Role check - Access granted');
    next();
  };
};

// Flexible admin check
const isAdmin = (req, res, next) => {
  const adminRoles = ['super_admin', 'admin', 'sales', 'marketing', 'accounting', 'support'];
  
  if (!adminRoles.includes(req.user.role)) {
    console.log('🔐 Admin check - Access denied for role:', req.user.role);
    return res.status(403).json({ 
      success: false,
      message: 'Admin access required',
      userRole: req.user.role,
      requiredRoles: adminRoles
    });
  }
  
  console.log('🔐 Admin check - Access granted for role:', req.user.role);
  next();
};

// Customer access (more flexible)
const requireCustomer = (req, res, next) => {
  const allowedRoles = ['customer', 'super_admin', 'admin']; // Allow admin to access customer features
  
  if (!allowedRoles.includes(req.user.role)) {
    console.log('🔐 Customer check - Access denied for role:', req.user.role);
    return res.status(403).json({
      success: false,
      message: 'Customer access required',
      userRole: req.user.role
    });
  }
  
  console.log('🔐 Customer check - Access granted for role:', req.user.role);
  next();
};

// Vendor access
const isVendor = (req, res, next) => {
  const allowedRoles = ['vendor', 'super_admin', 'admin'];
  
  if (!allowedRoles.includes(req.user.role)) {
    console.log('🔐 Vendor check - Access denied for role:', req.user.role);
    return res.status(403).json({ 
      success: false,
      message: 'Vendor access required',
      userRole: req.user.role
    });
  }
  
  console.log('🔐 Vendor check - Access granted for role:', req.user.role);
  next();
};

// Check if vendor is approved
const isApprovedVendor = (req, res, next) => {
  if (req.user.role === 'vendor' && !req.user.vendorInfo?.isApproved) {
    return res.status(403).json({ 
      success: false,
      message: 'Vendor account not approved yet.' 
    });
  }
  next();
};

// Optional authentication (for public endpoints that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🔐 Optional auth - No token provided, continuing as guest');
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log('🔐 Optional auth - Empty token, continuing as guest');
      return next();
    }

    if (!process.env.JWT_SECRET) {
      console.log('🔐 Optional auth - JWT_SECRET not set, continuing as guest');
      return next();
    }
    const jwtSecret = process.env.JWT_SECRET;
    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded.userId).select('-password');

    if (user && user.isActive) {
      console.log('🔐 Optional auth - User authenticated:', user.email);
      req.user = user;
    } else {
      console.log('🔐 Optional auth - Invalid user, continuing as guest');
    }
    
    next();
  } catch (error) {
    console.log('🔐 Optional auth - Token error, continuing as guest:', error.message);
    next();
  }
};

// Development bypass removed - production-ready authentication only

module.exports = {
  auth,
  requireRole,
  isAdmin,
  requireCustomer,
  isVendor,
  isApprovedVendor,
  optionalAuth
};
