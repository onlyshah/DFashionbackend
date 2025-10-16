const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction'); // ✅ Make sure you have this model
const Campaign = require('../models/Campaign'); // ✅ Optional - add if not exist
const Ticket = require('../models/Ticket'); // ✅ Optional - add if not exist

// ✅ Dashboard Overview (new version for /admin/dashboard)
exports.getDashboardStatsFromDB = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const [totalUsers, totalVendors, newUsersToday, newUsersThisMonth] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'vendor' }),
      User.countDocuments({ createdAt: { $gte: startOfDay } }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } })
    ]);

    const [totalProducts, activeProducts, pendingProducts, newProductsToday] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ status: 'active' }),
      Product.countDocuments({ status: 'pending' }),
      Product.countDocuments({ createdAt: { $gte: startOfDay } })
    ]);

    const [totalOrders, ordersToday, ordersThisMonth] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: startOfDay } }),
      Order.countDocuments({ createdAt: { $gte: startOfMonth } })
    ]);

    const revenueAgg = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const revenueTodayAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const revenueMonthAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          users: {
            total: totalUsers,
            vendors: totalVendors,
            new_today: newUsersToday,
            new_this_month: newUsersThisMonth
          },
          products: {
            total: totalProducts,
            active: activeProducts,
            pending: pendingProducts,
            new_today: newProductsToday
          },
          orders: {
            total: totalOrders,
            today: ordersToday,
            this_month: ordersThisMonth
          },
          revenue: {
            total: revenueAgg[0]?.total || 0,
            today: revenueTodayAgg[0]?.total || 0,
            this_month: revenueMonthAgg[0]?.total || 0
          }
        },
        user_permissions: req.user.permissions || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching dashboard data', error: error.message });
  }
};

// ✅ Legacy Copilot version kept (do not delete)
exports.getDashboardStats = exports.getDashboardStatsFromDB;

// ✅ Get all users (already fine)
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, department, search } = req.query;
    let query = {};

    if (role && role !== 'all') query.role = role;
    if (department && department !== 'all') query.department = department;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching users', error: error.message });
  }
};

// ✅ Create Admin User (unchanged)
exports.createAdminUser = async (req, res) => {
  try {
    const { fullName, email, password, role, department, employeeId, permissions } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { employeeId }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email or employee ID already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      fullName,
      email,
      password: hashedPassword,
      role,
      department,
      employeeId,
      permissions,
      username: email.split('@')[0] + '_' + Date.now(),
      isVerified: true,
      isActive: true
    });

    await user.save();
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({ success: true, message: 'Admin user created successfully', data: { user: userResponse } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating admin user', error: error.message });
  }
};

// ✅ Update User Role / Permissions
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, department, permissions, isActive } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (role) user.role = role;
    if (department) user.department = department;
    if (permissions) user.permissions = permissions;
    if (typeof isActive !== 'undefined') user.isActive = isActive;

    await user.save();
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ success: true, message: 'User updated successfully', data: { user: userResponse } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating user', error: error.message });
  }
};

// ✅ New method: Update user role by super admin
exports.updateUserRoleBySuperAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, permissions } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (role) user.role = role;
    if (permissions) user.permissions = permissions;

    await user.save();
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ success: true, message: 'User role updated by super admin successfully', data: { user: userResponse } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating user role', error: error.message });
  }
};

// ✅ Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, status, vendor } = req.query;
    let query = {};
    if (category && category !== 'all') query.category = category;
    if (status && status !== 'all') query.status = status;
    if (vendor) query.vendor = vendor;

    const products = await Product.find(query)
      .populate('vendor', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        pagination: { current: parseInt(page), pages: Math.ceil(total / limit), total }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching products', error: error.message });
  }
};

// ✅ Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    let query = {};
    if (status && status !== 'all') query.status = status;

    const orders = await Order.find(query)
      .populate('customer', 'fullName email')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: { orders, pagination: { current: parseInt(page), pages: Math.ceil(total / limit), total } }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching orders', error: error.message });
  }
};

// ✅ Get all vendors
exports.getAllVendors = async (req, res) => {
  try {
    const vendors = await User.find({ role: 'vendor' }).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: { vendors } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching vendors', error: error.message });
  }
};

// ✅ Get transactions from DB
exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const query = type ? { type } : {};

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      data: { transactions, pagination: { current: parseInt(page), pages: Math.ceil(total / limit), total } }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching transactions', error: error.message });
  }
};

// ✅ Get campaigns from DB (optional)
exports.getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json({ success: true, data: { campaigns } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching campaigns', error: error.message });
  }
};

// ✅ Get support tickets from DB
exports.getSupportTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find().sort({ createdAt: -1 });
    res.json({ success: true, data: { tickets } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching support tickets', error: error.message });
  }
};
