const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const models = require('../models');
const User = models.User;

const generateToken = (userId, role) => jwt.sign({ userId, role }, process.env.JWT_SECRET || 'dfashion_secret_key', { expiresIn: '24h' });

const register = async (req, res) => {
  try {
    const { username, email, password, fullName, role = 'customer' } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: 'Missing required fields' });

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const user = new User({ username, email, password, fullName, role });
    await user.save();

    const token = generateToken(user._id, user.role);
    res.status(201).json({ success: true, message: 'User registered successfully', data: { token, user: { id: user._id, username: user.username, email: user.email, fullName: user.fullName, role: user.role } } });
  } catch (error) {
    console.error('Registration (mongo) error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    if (!user || !user.isActive) return res.status(400).json({ message: 'Invalid credentials or deactivated account' });

    const valid = await user.comparePassword(password);
    if (!valid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    user.failedLoginAttempts = 0; user.accountLocked = false; user.lockUntil = null; user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, user.role);
    res.json({ success: true, message: 'Login successful', data: { token, user: { id: user._id, username: user.username, email: user.email, role: user.role } } });
  } catch (error) {
    console.error('Login (mongo) error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const admin = await User.findOne({ email: email.toLowerCase(), role: { $in: ['super_admin', 'admin', 'sales_manager', 'support_agent'] } });
    if (!admin) return res.status(401).json({ message: 'Invalid admin credentials' });
    if (!admin.isActive) return res.status(403).json({ message: 'Admin account is deactivated' });

    const adminWithPassword = await User.findById(admin._id).select('+password');
    const valid = await adminWithPassword.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid admin credentials' });

    admin.failedLoginAttempts = 0; admin.accountLocked = false; admin.lockUntil = null; admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken(admin._id, admin.role);
    res.json({ success: true, message: 'Admin login successful', data: { token, user: { id: admin._id, username: admin.username, email: admin.email, role: admin.role } } });
  } catch (error) {
    console.error('Admin login (mongo) error:', error);
    res.status(500).json({ message: 'Server error during admin login' });
  }
};

const logout = (req, res) => res.json({ success: true, message: 'Logged out successfully' });

const getUserById = async (id) => {
  if (!id) return null;
  return User.findById(id).select('-password');
};

module.exports = { register, login, adminLogin, logout, getUserById };
