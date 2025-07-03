// Import models - no fallbacks, require database
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Role = require('../models/Role');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');



// Role-based permission definitions
const ROLE_PERMISSIONS = {
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

// Dashboard Overview
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // User Statistics
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const totalVendors = await User.countDocuments({ role: 'vendor' });
    const newUsersToday = await User.countDocuments({ 
      role: 'customer',
      createdAt: { $gte: startOfDay }
    });
    const newUsersThisMonth = await User.countDocuments({ 
      role: 'customer',
      createdAt: { $gte: startOfMonth }
    });

    // Product Statistics
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ status: 'active' });
    const pendingProducts = await Product.countDocuments({ status: 'pending' });
    const newProductsToday = await Product.countDocuments({ 
      createdAt: { $gte: startOfDay }
    });

    // Order Statistics - from database
    const totalOrders = await Order.countDocuments();
    const ordersToday = await Order.countDocuments({
      createdAt: { $gte: startOfDay }
    });
    const ordersThisMonth = await Order.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    // Revenue calculation from orders
    const revenueAggregation = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const totalRevenue = revenueAggregation[0]?.total || 0;

    const revenueTodayAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const revenueToday = revenueTodayAgg[0]?.total || 0;

    const revenueThisMonthAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const revenueThisMonth = revenueThisMonthAgg[0]?.total || 0;

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
            total: totalRevenue,
            today: revenueToday,
            this_month: revenueThisMonth
          }
        },
        user_permissions: req.user.permissions || []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
};

// User Management
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, department, search } = req.query;
    
    let query = {};
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (department && department !== 'all') {
      query.department = department;
    }
    
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
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// Create Admin User
exports.createAdminUser = async (req, res) => {
  try {
    const { 
      fullName, 
      email, 
      password, 
      role, 
      department, 
      employeeId,
      permissions 
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { employeeId }] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or employee ID already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
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

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: { user: userResponse }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating admin user',
      error: error.message
    });
  }
};

// Update User Role/Permissions
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, department, permissions, isActive } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user
    if (role) user.role = role;
    if (department) user.department = department;
    if (permissions) user.permissions = permissions;
    if (typeof isActive !== 'undefined') user.isActive = isActive;

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: userResponse }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
};

// Get Analytics Data
exports.getAnalytics = async (req, res) => {
  try {
    const { period = '7d', department } = req.query;

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    // Get real analytics from database
    const orderAnalytics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        period,
        analytics: {
          sales: orderAnalytics
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};

// Additional controller methods for comprehensive admin functionality

// Get all products with filters
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
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
};

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('customer', 'fullName email')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// Get all vendors
exports.getAllVendors = async (req, res) => {
  try {
    const vendors = await User.find({ role: 'vendor' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { vendors }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching vendors',
      error: error.message
    });
  }
};

// Get transactions
exports.getTransactions = async (req, res) => {
  try {
    // Mock transaction data
    const transactions = [
      {
        id: 'TXN001',
        type: 'sale',
        amount: 3799,
        customer: 'Maya Sharma',
        date: new Date(),
        status: 'completed'
      },
      {
        id: 'TXN002',
        type: 'refund',
        amount: -1299,
        customer: 'Priya Singh',
        date: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'processed'
      }
    ];

    res.json({
      success: true,
      data: { transactions }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions',
      error: error.message
    });
  }
};

// Get marketing campaigns
exports.getCampaigns = async (req, res) => {
  try {
    const campaigns = [
      {
        id: 'CAMP001',
        name: 'Summer Collection 2024',
        status: 'active',
        budget: 50000,
        spent: 32000,
        reach: 25000,
        conversions: 145,
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'CAMP002',
        name: 'Festive Offers',
        status: 'draft',
        budget: 75000,
        spent: 0,
        reach: 0,
        conversions: 0,
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000)
      }
    ];

    res.json({
      success: true,
      data: { campaigns }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching campaigns',
      error: error.message
    });
  }
};

// Get support tickets
exports.getSupportTickets = async (req, res) => {
  try {
    const tickets = [
      {
        id: 'TICK001',
        customer: 'Maya Sharma',
        subject: 'Order delivery issue',
        status: 'open',
        priority: 'high',
        assigned_to: 'Sneha Support',
        created: new Date(Date.now() - 2 * 60 * 60 * 1000),
        last_update: new Date(Date.now() - 30 * 60 * 1000)
      },
      {
        id: 'TICK002',
        customer: 'Raj Patel',
        subject: 'Product return request',
        status: 'in_progress',
        priority: 'medium',
        assigned_to: 'Rohit Support',
        created: new Date(Date.now() - 4 * 60 * 60 * 1000),
        last_update: new Date(Date.now() - 60 * 60 * 1000)
      }
    ];

    res.json({
      success: true,
      data: { tickets }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching support tickets',
      error: error.message
    });
  }
};
