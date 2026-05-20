// Auth Controller - MongoDB/Mongoose Version
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

exports.register = async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;
    
    if (!username || !email || !password) {
      return ApiResponse.error(res, 'Missing required fields: username, email, password', 422);
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return ApiResponse.error(res, 'User already exists', 409);
    }
    
    // Create new user
    const user = new User({
      username,
      email,
      password,
      fullName: fullName || username,
      role: 'end_user',
      isActive: true
    });
    
    await user.save();
    
    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    
    return ApiResponse.created(res, {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      },
      token
    }, 'User registered successfully');
  } catch (error) {
    console.error('❌ register error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return ApiResponse.error(res, 'Missing required fields: email, password', 422);
    }
    
    // Find user (explicitly select password since it has select: false)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return ApiResponse.error(res, 'Invalid credentials', 401);
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return ApiResponse.error(res, 'Invalid credentials', 401);
    }
    
    if (!user.isActive) {
      return ApiResponse.error(res, 'User account is inactive', 403);
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    
    return ApiResponse.success(res, {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar
      },
      token
    }, 'Login successful');
  } catch (error) {
    console.error('❌ login error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.logout = async (req, res) => {
  return ApiResponse.success(res, {}, 'Logout successful');
};

exports.refreshToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return ApiResponse.error(res, 'No token provided', 401);
    }
    
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    const user = await User.findById(decoded.id);
    
    if (!user || !user.isActive) {
      return ApiResponse.error(res, 'User not found or inactive', 404);
    }
    
    const newToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    
    return ApiResponse.success(res, { token: newToken }, 'Token refreshed');
  } catch (error) {
    console.error('❌ refreshToken error:', error);
    return ApiResponse.error(res, 'Invalid token', 401);
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return ApiResponse.error(res, 'Email is required', 422);
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return ApiResponse.error(res, 'User not found', 404);
    }
    
    // In production, send email with reset token
    return ApiResponse.success(res, {}, 'Reset link sent to email');
  } catch (error) {
    console.error('❌ forgotPassword error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return ApiResponse.error(res, 'Token and new password are required', 422);
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return ApiResponse.error(res, 'User not found', 404);
    }
    
    user.password = newPassword;
    await user.save();
    
    return ApiResponse.success(res, {}, 'Password reset successfully');
  } catch (error) {
    console.error('❌ resetPassword error:', error);
    return ApiResponse.error(res, 'Invalid or expired token', 401);
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return ApiResponse.error(res, 'Email is required', 422);
    }
    
    // In production, verify with token
    return ApiResponse.success(res, {}, 'Email verified');
  } catch (error) {
    console.error('❌ verifyEmail error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;
    
    if (!currentPassword || !newPassword) {
      return ApiResponse.error(res, 'Current and new passwords are required', 422);
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return ApiResponse.error(res, 'User not found', 404);
    }
    
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return ApiResponse.error(res, 'Current password is incorrect', 401);
    }
    
    user.password = newPassword;
    await user.save();
    
    return ApiResponse.success(res, {}, 'Password changed successfully');
  } catch (error) {
    console.error('❌ changePassword error:', error);
    return ApiResponse.serverError(res, error);
  }
};



