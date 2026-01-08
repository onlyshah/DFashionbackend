const bcrypt = require('bcryptjs');
const { getConfig, getModels } = require('../config');
const { Op } = require('sequelize');

// Load models based on DB_TYPE
const models = getModels();
const User = models.User;
const UserRaw = models._raw && models._raw.User ? models._raw.User : null;
const Product = models.Product;
const Order = models.Order;

// ✅ Dashboard Overview (new version for /admin/dashboard)
exports.getDashboardStatsFromDB = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    if (!User || !Product) {
      return res.status(500).json({ success: false, message: 'Database models not initialized' });
    }

    const dataProvider = require('../services/dataProvider');

    // Use sequential safe counts via dataProvider (DB-agnostic, falls back to progress)
    const totalUsers = await dataProvider.count('users', { wrapped: User, raw: UserRaw }, {});
    const totalVendors = await dataProvider.count('users', { wrapped: User, raw: UserRaw }, { role: 'vendor' });
    const newUsersToday = await dataProvider.count('users', { wrapped: User, raw: UserRaw }, { createdAt: { [Op.gte]: startOfDay } });
    const newUsersThisMonth = await dataProvider.count('users', { wrapped: User, raw: UserRaw }, { createdAt: { [Op.gte]: startOfMonth } });

    const productRaw = models._raw && models._raw.Product ? models._raw.Product : null;
    const totalProducts = await dataProvider.count('products', { wrapped: Product, raw: productRaw }, {});
    const activeProducts = await dataProvider.count('products', { wrapped: Product, raw: productRaw }, { status: 'active' });
    const pendingProducts = await dataProvider.count('products', { wrapped: Product, raw: productRaw }, { status: 'pending' });
    const newProductsToday = await dataProvider.count('products', { wrapped: Product, raw: productRaw }, { createdAt: { [Op.gte]: startOfDay } });

    // Orders might not exist in SQL, provide default values
    let totalOrders = 0, ordersToday = 0, ordersThisMonth = 0;
    let revenueResult = 0, revenueTodayResult = 0, revenueMonthResult = 0;

    if (Order) {
      const orderRaw = models._raw && models._raw.Order ? models._raw.Order : null;
      totalOrders = await dataProvider.count('orders', { wrapped: Order, raw: orderRaw }, {});
      ordersToday = await dataProvider.count('orders', { wrapped: Order, raw: orderRaw }, { createdAt: { [Op.gte]: startOfDay } });
      ordersThisMonth = await dataProvider.count('orders', { wrapped: Order, raw: orderRaw }, { createdAt: { [Op.gte]: startOfMonth } });

      revenueResult = await dataProvider.sum('orders', { wrapped: Order, raw: orderRaw }, 'total', {}) || 0;
      revenueTodayResult = await dataProvider.sum('orders', { wrapped: Order, raw: orderRaw }, 'total', { createdAt: { [Op.gte]: startOfDay } }) || 0;
      revenueMonthResult = await dataProvider.sum('orders', { wrapped: Order, raw: orderRaw }, 'total', { createdAt: { [Op.gte]: startOfMonth } }) || 0;
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
        user_permissions: req.user.permissions || []
      }
    });
  } catch (error) {
    console.error('[adminController] Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard data', error: error.message });
  }
};

// ✅ Legacy Copilot version kept (do not delete)
exports.getDashboardStats = exports.getDashboardStatsFromDB;

// ✅ Get all users (already fine)
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, department, search } = req.query;
    const where = {};

    if (role && role !== 'all') where.role = role;
    if (department && department !== 'all') where.department = department;
    if (search) {
      where[Op.or] = [
        { fullName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { username: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (!User) {
      return res.status(500).json({ success: false, message: 'User model not initialized' });
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      raw: true
    });

    const total = await User.count({ where });

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
    console.error('[adminController] Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Error fetching users', error: error.message });
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
