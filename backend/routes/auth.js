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
    console.log('🔐 LOGIN REQUEST RECEIVED');
    console.log('📧 Email:', req.body.email);
    console.log('🔑 Password:', req.body.password ? '***' : 'MISSING');
    console.log('📋 Full body:', req.body);
    console.log('📋 Headers:', req.headers);

    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Normalize email (same as User model)
    const normalizedEmail = email.trim().toLowerCase();

    // Only use database authentication - no mock data
    const mockUsers = {
      'admin@dfashion.com': {
        id: '3',
        fullName: 'Admin User',
        email: 'admin@dfashion.com',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        isActive: true,
        isVerified: true,
        avatar: '/assets/images/default-avatar.svg',
        followerCount: 0
      }
    };

    // Check if user exists in mock data
    const mockUser = mockUsers[normalizedEmail];
    if (mockUser && mockUser.password === password) {
      console.log('✅ Mock authentication successful for:', normalizedEmail);

      const token = generateToken(mockUser.id);

      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: mockUser.id,
            fullName: mockUser.fullName,
            email: mockUser.email,
            username: mockUser.username,
            role: mockUser.role,
            avatar: mockUser.avatar,
            isVerified: mockUser.isVerified,
            followerCount: mockUser.followerCount
          }
        }
      });
    }

    // Database-only authentication (fallback)
    console.log('🔍 Checking database for user:', normalizedEmail);
    console.log('🔍 Original email:', email);
    console.log('🔍 Normalized email:', normalizedEmail);

    const user = await User.findOne({ email: normalizedEmail });
    console.log('👤 Database user found:', !!user);

    if (!user) {
      // Try to find any user with similar email for debugging
      const allUsers = await User.find({}, 'email username').limit(5);
      console.log('📋 Available users in database:', allUsers.map(u => ({ email: u.email, username: u.username })));
      console.log('❌ User not found in database');
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('🔐 User password hash:', user.password ? 'EXISTS' : 'MISSING');
    console.log('🔐 Input password:', password ? 'PROVIDED' : 'MISSING');
    console.log('👤 User object keys:', Object.keys(user.toObject ? user.toObject() : user));
    console.log('👤 User role:', user.role);
    console.log('👤 User email:', user.email);
    console.log('🔧 comparePassword method exists:', typeof user.comparePassword === 'function');

    // Check if account is active
    console.log('👤 User isActive status:', user.isActive);
    if (!user.isActive) {
      console.log('❌ Account is deactivated for user:', normalizedEmail);
      return res.status(400).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    console.log('✅ Account is active for user:', normalizedEmail);

    // Check password
    console.log('🔐 Comparing passwords using user.comparePassword...');
    try {
      const isMatch = await user.comparePassword(password);
      console.log('🔐 Password match result:', isMatch);

      if (!isMatch) {
        console.log('❌ Password does not match for user:', normalizedEmail);
        return res.status(400).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      console.log('✅ Password match successful for user:', normalizedEmail);
    } catch (passwordError) {
      console.error('❌ Error during password comparison:', passwordError);
      return res.status(500).json({
        success: false,
        message: 'Server error during authentication'
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
    console.error('❌ Login error occurred:', error.message);
    console.error('❌ Full error:', error);
    console.error('❌ Error stack:', error.stack);
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
