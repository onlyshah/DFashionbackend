const bcrypt = require('bcryptjs');
const { getConfig, getModels } = require('../config');
const { Op } = require('sequelize');
const OrderRepository = require('../repositories/OrderRepository');
const ProductRepository = require('../repositories/ProductRepository');
const UserRepository = require('../repositories/UserRepository');

// Load models based on DB_TYPE
const models = getModels();
const User = models.User;
const UserRaw = models._raw && models._raw.User ? models._raw.User : null;
const Product = models.Product;
const Order = models.Order;

// Initialize Repositories (database-agnostic)
let orderRepository = null;
let productRepository = null;
let userRepository = null;

function getOrderRepository() {
  if (!orderRepository) {
    orderRepository = new OrderRepository(Order);
  }
  return orderRepository;
}

function getProductRepository() {
  if (!productRepository) {
    productRepository = new ProductRepository(models);
  }
  return productRepository;
}

function getUserRepository() {
  if (!userRepository) {
    userRepository = new UserRepository(models);
  }
  return userRepository;
}

// ✅ Dashboard Overview (new version for /admin/dashboard)
exports.getDashboardStatsFromDB = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // If models not available, return error
    if (!User || !Product) {
      console.error('[adminController] Models not initialized');
      return res.status(500).json({
        success: false,
        message: 'Database models not initialized',
        data: null
      });
    }

    const dataProvider = require('../services/dataProvider');

    // Use sequential safe counts via dataProvider (DB-agnostic, falls back to progress)
    let totalUsers = 0, totalVendors = 0, newUsersToday = 0, newUsersThisMonth = 0;
    let totalProducts = 0, activeProducts = 0, pendingProducts = 0, newProductsToday = 0;
    let totalOrders = 0, ordersToday = 0, ordersThisMonth = 0;
    let revenueResult = 0, revenueTodayResult = 0, revenueMonthResult = 0;

    try {
      totalUsers = await dataProvider.count('users', { wrapped: User, raw: UserRaw }, {}) || 0;
      totalVendors = await dataProvider.count('users', { wrapped: User, raw: UserRaw }, { role: 'vendor' }) || 0;
      newUsersToday = await dataProvider.count('users', { wrapped: User, raw: UserRaw }, { createdAt: { [Op.gte]: startOfDay } }) || 0;
      newUsersThisMonth = await dataProvider.count('users', { wrapped: User, raw: UserRaw }, { createdAt: { [Op.gte]: startOfMonth } }) || 0;
    } catch (e) {
      console.warn('[adminController] Error counting users:', e.message);
      totalUsers = 0; totalVendors = 0; newUsersToday = 0; newUsersThisMonth = 0;
    }

    const productRaw = models._raw && models._raw.Product ? models._raw.Product : null;
    try {
      totalProducts = await dataProvider.count('products', { wrapped: Product, raw: productRaw }, {}) || 0;
      activeProducts = await dataProvider.count('products', { wrapped: Product, raw: productRaw }, { status: 'active' }) || 0;
      pendingProducts = await dataProvider.count('products', { wrapped: Product, raw: productRaw }, { status: 'pending' }) || 0;
      newProductsToday = await dataProvider.count('products', { wrapped: Product, raw: productRaw }, { createdAt: { [Op.gte]: startOfDay } }) || 0;
    } catch (e) {
      console.warn('[adminController] Error counting products:', e.message);
      totalProducts = 0; activeProducts = 0; pendingProducts = 0; newProductsToday = 0;
    }

    // Orders might not exist in SQL, provide default values
    if (Order) {
      try {
        const orderRaw = models._raw && models._raw.Order ? models._raw.Order : null;
        totalOrders = await dataProvider.count('orders', { wrapped: Order, raw: orderRaw }, {}) || 0;
        ordersToday = await dataProvider.count('orders', { wrapped: Order, raw: orderRaw }, { createdAt: { [Op.gte]: startOfDay } }) || 0;
        ordersThisMonth = await dataProvider.count('orders', { wrapped: Order, raw: orderRaw }, { createdAt: { [Op.gte]: startOfMonth } }) || 0;

        // Order model uses `totalAmount` in Postgres schema; use that field for sums
        revenueResult = await dataProvider.sum('orders', { wrapped: Order, raw: orderRaw }, 'totalAmount', {}) || 0;
        revenueTodayResult = await dataProvider.sum('orders', { wrapped: Order, raw: orderRaw }, 'totalAmount', { createdAt: { [Op.gte]: startOfDay } }) || 0;
        revenueMonthResult = await dataProvider.sum('orders', { wrapped: Order, raw: orderRaw }, 'totalAmount', { createdAt: { [Op.gte]: startOfMonth } }) || 0;
      } catch (e) {
        console.warn('[adminController] Error counting orders:', e.message);
        totalOrders = 0; ordersToday = 0; ordersThisMonth = 0;
        revenueResult = 0; revenueTodayResult = 0; revenueMonthResult = 0;
      }
    }

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
            total: revenueResult,
            today: revenueTodayResult,
            this_month: revenueMonthResult
          }
        },
        user_permissions: (req.user && req.user.permissions) ? req.user.permissions : []
      }
    });
  } catch (error) {
    console.error('[adminController] Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data',
      data: null
    });
  }
};

// ✅ Legacy Copilot version kept (do not delete)
exports.getDashboardStats = exports.getDashboardStatsFromDB;

// ✅ Get all users (already fine)
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    
    const filters = {};
    if (role && role !== 'all') filters.role = role;
    if (search) filters.search = search;

    const repository = getUserRepository();
    const result = await repository.getAllUsers(filters, parseInt(page), parseInt(limit));

    return res.json(result);
  } catch (error) {
    console.error('[adminController] Error in getAllUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// ✅ Create Admin User (unchanged)
exports.createAdminUser = async (req, res) => {
  try {
    const { fullName, email, password, role, department, employeeId, permissions } = req.body;
    
    // Check if user exists - use appropriate method
    let existingUser;
    if (UserRaw) {
      // Sequelize
      existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { email: email },
            { employeeId: employeeId }
          ]
        }
      });
    } else {
      // Mongoose
      existingUser = await User.findOne({ $or: [{ email }, { employeeId }] });
    }
    
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email or employee ID already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    let user;
    if (UserRaw) {
      // Sequelize - create and save
      user = await User.create({
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
    } else {
      // Mongoose
      user = new User({
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
    }

    const userResponse = UserRaw ? user.toJSON ? user.toJSON() : user.dataValues : user.toObject();
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

    let user;
    if (UserRaw) {
      // Sequelize - use findOne
      user = await User.findOne({ where: { id: userId } });
    } else {
      // Mongoose
      user = await User.findById(userId);
    }
    
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (UserRaw) {
      // Sequelize - use update
      const updateData = {};
      if (role) updateData.role = role;
      if (department) updateData.department = department;
      if (permissions) updateData.permissions = permissions;
      if (typeof isActive !== 'undefined') updateData.isActive = isActive;
      
      await User.update(updateData, { where: { id: userId } });
      user = await User.findOne({ where: { id: userId } });
    } else {
      // Mongoose - use save
      if (role) user.role = role;
      if (department) user.department = department;
      if (permissions) user.permissions = permissions;
      if (typeof isActive !== 'undefined') user.isActive = isActive;
      await user.save();
    }

    const userResponse = UserRaw ? user.toJSON ? user.toJSON() : user.dataValues : user.toObject();
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

    let user;
    if (UserRaw) {
      // Sequelize - use findOne
      user = await User.findOne({ where: { id: userId } });
    } else {
      // Mongoose
      user = await User.findById(userId);
    }
    
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (UserRaw) {
      // Sequelize - use update
      const updateData = {};
      if (role) updateData.role = role;
      if (permissions) updateData.permissions = permissions;
      
      await User.update(updateData, { where: { id: userId } });
      user = await User.findOne({ where: { id: userId } });
    } else {
      // Mongoose - use save
      if (role) user.role = role;
      if (permissions) user.permissions = permissions;
      await user.save();
    }

    const userResponse = UserRaw ? user.toJSON ? user.toJSON() : user.dataValues : user.toObject();
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
    
    const filters = {};
    if (category && category !== 'all') filters.category = category;
    if (status && status !== 'all') filters.status = status;
    if (vendor) filters.vendor = vendor;

    const repository = getProductRepository();
    const result = await repository.getAllProducts(filters, parseInt(page), parseInt(limit));

    return res.json(result);
  } catch (error) {
    console.error('[adminController] Error in getAllProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
};

// ✅ Get all orders
// ✅ Get all orders (DATABASE-AGNOSTIC - works with MongoDB, PostgreSQL, MySQL)
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    const filters = {};
    if (status && status !== 'all') {
      filters.status = status;
    }

    const repository = getOrderRepository();
    const result = await repository.getAllOrders(filters, parseInt(page), parseInt(limit));

    return res.json(result);
  } catch (error) {
    console.error('[adminController] Error in getAllOrders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// ✅ Get all vendors
exports.getAllVendors = async (req, res) => {
  try {
    const repository = getUserRepository();
    const result = await repository.getUsersByRole('vendor', 1, 1000);

    return res.json(result);
  } catch (error) {
    console.error('[adminController] Error in getAllVendors:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendors',
      error: error.message
    });
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

// ✅ Get quick actions for admin navbar (stored in DB)
exports.getQuickActions = async (req, res) => {
  try {
    const QuickAction = models.QuickAction;
    const role = req.user?.role || 'admin';

    // If QuickAction model is not available (Postgres-only env), return safe default
    if (!QuickAction) {
      // Optional: provide a small set of default quick actions for admin
      const defaultActions = [
        { label: 'New Product', icon: 'add', link: '/admin/products', color: 'primary', roles: ['admin','super_admin'], order: 1 },
        { label: 'Orders', icon: 'receipt', link: '/admin/orders', color: 'accent', roles: ['admin','super_admin'], order: 2 }
      ];
      const filteredDefault = defaultActions.filter(a => !a.roles || a.roles.length === 0 || a.roles.includes(role) || a.roles.includes('all'));
      return res.json({ success: true, data: filteredDefault });
    }

    // Fetch active quick actions and filter by role if specified
    const actions = await QuickAction.find({ isActive: true }).sort({ order: 1 }).lean();

    // If actions have roles defined, filter; otherwise include
    const filtered = actions.filter(a => {
      if (!a.roles || a.roles.length === 0) return true;
      return a.roles.includes(role) || a.roles.includes('all');
    });

    // Return the filtered actions array directly in the data field
    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching quick actions', error: error.message });
  }
};
// ✅ Get recent orders for dashboard (DATABASE-AGNOSTIC)
exports.getRecentOrders = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const repository = getOrderRepository();
    const result = await repository.getRecentOrders(parseInt(limit));

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      data: {
        recentOrders: result.data.orders
      }
    });
  } catch (error) {
    console.error('[adminController] Unexpected error in getRecentOrders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent orders',
      error: error.message
    });
  }
};