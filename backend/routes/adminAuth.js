const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Admin Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password, employeeId } = req.body;

    // Validate input
    if ((!email && !employeeId) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/Employee ID and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find user by email or employee ID
    let query = {};
    if (email) {
      query.email = email.toLowerCase();
    } else if (employeeId) {
      query.employeeId = employeeId;
    }

    const user = await User.findOne(query);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if user has admin privileges
    const adminRoles = [
      'super_admin', 'admin', 'sales_manager', 'sales_executive',
      'marketing_manager', 'marketing_executive', 'account_manager',
      'accountant', 'support_manager', 'support_agent'
    ];

    if (!adminRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Contact administrator.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Check if account is locked
    if (user.accountLocked && user.lockUntil && user.lockUntil > Date.now()) {
      const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / (1000 * 60));
      return res.status(401).json({
        success: false,
        message: `Account is locked. Try again in ${lockTimeRemaining} minutes.`,
        code: 'ACCOUNT_LOCKED',
        lockTimeRemaining
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Increment login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        user.accountLocked = true;
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }
      
      await user.save();

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        attemptsRemaining: Math.max(0, 5 - user.loginAttempts)
      });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.accountLocked = false;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role,
        department: user.department,
        permissions: user.permissions || []
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '8h' } // 8 hours for admin sessions
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.loginAttempts;
    delete userResponse.accountLocked;
    delete userResponse.lockUntil;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: userResponse,
        permissions: getUserPermissions(user.role),
        expiresIn: '8h'
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      error: error.message
    });
  }
});

// Admin Logout Route
router.post('/logout', (req, res) => {
  // In a real application, you might want to blacklist the token
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Verify Token Route
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.adminToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
        code: 'NO_TOKEN'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or inactive user',
        code: 'INVALID_TOKEN'
      });
    }

    res.json({
      success: true,
      data: {
        user,
        permissions: getUserPermissions(user.role)
      }
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
});

// Demo users removed - use registration endpoint instead

// Helper function to get user permissions based on role
function getUserPermissions(role) {
  const permissions = {
    super_admin: ['all'],
    admin: ['dashboard.*', 'users.*', 'products.*', 'orders.*', 'settings.*'],
    sales_manager: ['dashboard.view', 'dashboard.analytics', 'orders.*', 'users.view'],
    sales_executive: ['dashboard.view', 'orders.view', 'orders.edit'],
    marketing_manager: ['dashboard.view', 'dashboard.analytics', 'marketing.*', 'products.view'],
    marketing_executive: ['dashboard.view', 'marketing.campaigns', 'marketing.content'],
    account_manager: ['dashboard.view', 'dashboard.analytics', 'finance.*', 'orders.view'],
    accountant: ['dashboard.view', 'finance.view', 'finance.reports'],
    support_manager: ['dashboard.view', 'support.*', 'users.view'],
    support_agent: ['dashboard.view', 'support.tickets', 'support.chat']
  };

  return permissions[role] || ['dashboard.view'];
}

module.exports = router;
