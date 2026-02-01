const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { getRedirectPathForRole } = require('../config/roleRedirectMap');

// Get User model - delay loading to ensure Sequelize is connected
const getUserModel = async () => {
  const models = require('../models_sql');
  let User = models._raw && models._raw.User ? models._raw.User : models.User;
  
  // If model is null stub, try to load the actual model
  if (!User || (User && typeof User.findOne !== 'function')) {
    console.log('[auth] User model is stub, attempting to reload...');
    await models.getSequelizeInstance();
    
    // Re-require to get fresh models
    delete require.cache[require.resolve('../models_sql')];
    const freshModels = require('../models_sql');
    User = freshModels._raw && freshModels._raw.User ? freshModels._raw.User : freshModels.User;
  }
  
  return User;
};

// Initialize email transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Generate JWT Token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'dfashion_secret_key',
    { expiresIn: '7d' }
  );
};

// Role -> redirect mapping is now centralized in config/roleRedirectMap.js
// and imported above as getRedirectPathForRole()

// Generate password reset token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const User = await getUserModel();
    if (!User) {
      return res.status(500).json({
        success: false,
        message: 'Database connection error'
      });
    }

    const { username, email, password, fullName, role = 'customer' } = req.body;

    // Validation
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      fullName,
      role
    });

    // Generate token
    const token = generateToken(user.id, user.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isActive: user.isActive
        }
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const User = await getUserModel();
    if (!User) {
      return res.status(500).json({
        success: false,
        message: 'Database connection error'
      });
    }

    const { email, password } = req.body;
    console.log('[auth.postgres] Login attempt for:', email, 'from IP:', req.ip);
    console.log('[auth.postgres] Request body:', req.body);
    console.log('[auth.postgres] Request headers:', req.headers);

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/username and password'
      });
    }

    // Find user by email or username
    const user = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { email: email.toLowerCase() },
          { username: email.toLowerCase() }
        ]
      }
    });

    // Get role name if roleId exists (use raw query via User.sequelize to avoid missing associations)
    let roleName = null;
    if (user && user.roleId) {
      try {
        const QueryTypes = require('sequelize').QueryTypes;
        const roleResult = await User.sequelize.query(
          'SELECT name FROM "roles" WHERE id = $1',
          { bind: [user.roleId], type: QueryTypes.SELECT }
        );
        roleName = Array.isArray(roleResult) && roleResult[0] ? roleResult[0].name : null;
        console.log('[auth.postgres] Role lookup for roleId', user.roleId, '->', roleName);
      } catch (err) {
        console.warn('[auth.postgres] Failed to fetch role name via raw query:', err.message);
        roleName = user.role || null;
      }
    }

    console.log('[auth.postgres] User lookup result:', user ? `Found: ${user.email}` : 'Not found');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Contact support.'
      });
    }

    // Check password - handle both 'password' and 'password_hash' columns
    const passwordField = user.password || user.password_hash;
    console.log('[auth.postgres] Password field check:', { hasPassword: !!user.password, hasPasswordHash: !!user.password_hash, passwordFieldExists: !!passwordField });
    
    if (!passwordField) {
      console.error('[auth.postgres] No password field found for user:', user.email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, passwordField);
    console.log('[auth.postgres] Password comparison result:', { isValid: isPasswordValid, inputLength: password.length, storedLength: passwordField.length });

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user.id, roleName || user.role);

    const redirectPath = getRedirectPathForRole(roleName || user.role);
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        redirectPath,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
          role: roleName || user.role,
          isActive: user.isActive
        }
      }
    });


  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Admin login
// @route   POST /api/auth/admin/login
// @access  Public
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin user
    const user = await User.findOne({
      where: {
        email: email.toLowerCase()
      }
    });

    // Get role name if roleId exists
    let userRole = null;
    if (user && user.roleId) {
      const Role = require('../models_sql').Role;
      const role = await Role.findByPk(user.roleId);
      userRole = role ? role.name : null;
    }

    // Check if user has admin role
    const isAdminRole = ['admin', 'sales', 'marketing', 'accounting', 'support', 'super_admin'].includes(userRole);

    if (!user || !isAdminRole) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is deactivated'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Update last login
    await User.update(
      { lastLogin: new Date() },
      { where: { id: user.id } }
    );

    // Generate token
    const token = generateToken(user.id, userRole);

    const redirectPath = getRedirectPathForRole(userRole);
    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        token,
        redirectPath,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: userRole,
          isActive: user.isActive
        }
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin login failed'
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

// @desc    Forgot password - Send reset link
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address'
      });
    }

    // Find user by email
    const user = await User.findOne({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email address'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated'
      });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save reset token to user
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/auth/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@dfashion.com',
      to: user.email,
      subject: 'Password Reset Request - DFashion',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hi ${user.fullName || user.username},</p>
          <p>We received a request to reset your password. Click the link below to create a new password:</p>
          <p style="margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p style="color: #999; font-size: 12px;">This link expires in 24 hours. If you didn't request a password reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">© 2024 DFashion. All rights reserved.</p>
        </div>
      `
    };

    try {
      await emailTransporter.sendMail(mailOptions);
      res.json({
        success: true,
        message: 'Password reset link sent to your email'
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      res.json({
        success: true,
        message: 'Password reset request processed. If the email is not received, contact support.'
      });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    // Validation
    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Hash the token to match with database
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const { Op } = require('sequelize');
    const user = await User.findOne({
      where: {
        resetPasswordToken: resetTokenHash,
        resetPasswordExpiry: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpiry = null;
    await user.save();

    // Send confirmation email
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@dfashion.com',
      to: user.email,
      subject: 'Password Changed Successfully - DFashion',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Changed Successfully</h2>
          <p>Hi ${user.fullName || user.username},</p>
          <p>Your password has been reset successfully. You can now log in with your new password.</p>
          <p style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/auth/login" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Go to Login
            </a>
          </p>
          <p style="color: #999; font-size: 12px;">If you did not make this change, please contact support immediately.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">© 2024 DFashion. All rights reserved.</p>
        </div>
      `
    };

    try {
      await emailTransporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Confirmation email error:', emailError);
    }

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
};

// @desc    Verify reset token
// @route   POST /api/auth/verify-reset-token
// @access  Public
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    // Hash the token to match with database
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const { Op } = require('sequelize');
    const user = await User.findOne({
      where: {
        resetPasswordToken: resetTokenHash,
        resetPasswordExpiry: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        email: user.email,
        validUntil: user.resetPasswordExpiry
      }
    });

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify token'
    });
  }
};

const getUserById = async (id) => {
  if (!id) return null;
  return await User.findByPk(id);
};

module.exports = {
  register,
  login,
  adminLogin,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  getUserById
};
