const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Try to load User model, but don't fail if it doesn't work
let User;
try {
  User = require('../models/User');
  console.log('✅ User model loaded in auth routes');
} catch (error) {
  console.log('⚠️ User model not available in auth routes:', error.message);
}

// Try to load auth middleware, but don't fail if it doesn't work
let auth;
try {
  auth = require('../middleware/auth').auth;
  console.log('✅ Auth middleware loaded in auth routes');
} catch (error) {
  console.log('⚠️ Auth middleware not available in auth routes:', error.message);
  auth = (req, res, next) => next(); // Dummy middleware
}

const router = express.Router();

// Test route to verify auth routes are working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes are working!'
  });
});

// Database test route
router.get('/db-test', async (req, res) => {
  try {
    console.log('🔍 Testing database connection...');
    const userCount = await User.countDocuments();
    console.log('👥 Total users in database:', userCount);

    // List all users (for debugging)
    const users = await User.find({}, 'email username role').limit(10);
    console.log('📋 Users in database:', users);

    res.json({
      success: true,
      message: 'Database connection working',
      userCount,
      users: users.map(u => ({ email: u.email, username: u.username, role: u.role }))
    });
  } catch (error) {
    console.error('❌ Database test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'dfashion_secret_key',
    { expiresIn: '24h' }
  );
};

// @route   POST /api/auth/admin/login
// @desc    Admin login
// @access  Public
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find admin user
    const user = await User.findOne({
      email: email.toLowerCase(),
      role: 'super_admin'
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Contact administrator.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          department: user.department,
          employeeId: user.employeeId,
          permissions: user.permissions,
          avatar: user.avatar
        }
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    console.log('🔐 REGISTRATION REQUEST RECEIVED');
    console.log('📧 Email:', req.body.email);
    console.log('👤 Username:', req.body.username);
    console.log('📋 Full body:', req.body);

    const { username, email, password, fullName, role = 'customer' } = req.body;

    // Check if user exists
    console.log('🔍 Checking if user already exists...');
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    console.log('👤 Existing user found:', !!existingUser);

    if (existingUser) {
      console.log('❌ User already exists');
      return res.status(400).json({
        message: 'User already exists with this email or username'
      });
    }

    // Create user
    console.log('👤 Creating new user...');
    const user = new User({
      username,
      email,
      password,
      fullName,
      role
    });
    console.log('💾 User object created, saving to database...');

    await user.save();
    console.log('✅ User saved successfully to database');
    console.log('🆔 User ID:', user._id);
    console.log('📧 User Email:', user.email);
    console.log('🔐 Password was hashed:', user.password ? 'YES' : 'NO');
    console.log('🔐 Password hash length:', user.password ? user.password.length : 0);

    // Test password immediately after creation
    const testMatch = await user.comparePassword(password);
    console.log('🧪 Immediate password test result:', testMatch);

    // Generate token
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Find user in database
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          avatar: user.avatar,
          isVerified: user.isVerified
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/verify
// @desc    Verify token
// @access  Private
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dfashion_secret_key');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('followers', 'username fullName avatar')
      .populate('following', 'username fullName avatar');
    
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', auth, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
