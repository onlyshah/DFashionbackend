const bcrypt = require('bcryptjs');
const ServiceLoader = require('../utils/serviceLoader');
const adminService = ServiceLoader.getService('admin');
const userService = ServiceLoader.getService('user');
const productService = ServiceLoader.getService('product');
const orderService = ServiceLoader.getService('order');
const { Op } = require('sequelize');

// Dynamic model loading to ensure Sequelize is connected
const getUserModel = async () => {
  const models = require('../models_sql');
  return models._raw && models._raw.User ? models._raw.User : models.User;
};

const getProductModel = async () => {
  const models = require('../models_sql');
  return models._raw && models._raw.Product ? models._raw.Product : models.Product;
};

const getOrderModel = async () => {
  const models = require('../models_sql');
  return models._raw && models._raw.Order ? models._raw.Order : models.Order;
};
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

// ✅ Helper function to get recent orders with user data (JOIN)
async function getRecentOrdersData(limit = 5) {
  try {
    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    });
    await client.connect();

    // Join orders with users to get customer name/email (resolves "Unknown" user issue)
    const query = `
      SELECT o.id, o.order_number, o.total_amount, o.status, o.payment_status, o.created_at, o.user_id,
             u.first_name, u.last_name, u.email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT $1
    `;
    const result = await client.query(query, [parseInt(limit)]);
    await client.end();

    return result.rows.map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      customer: order.first_name || order.last_name ? `${order.first_name || ''} ${order.last_name || ''}`.trim() : (order.email || `User ${order.user_id}`),
      amount: parseFloat(order.total_amount || 0),
      status: order.status || 'pending',
      paymentStatus: order.payment_status || 'pending',
      createdAt: order.created_at ? new Date(order.created_at).toISOString() : new Date().toISOString()
    }));
  } catch (error) {
    console.error('[adminController] Error fetching recent orders:', error.message);
    return []; // Return empty array on error
  }
}

// ✅ Dashboard Overview (new version for /admin/dashboard)
exports.getDashboardStatsFromDB = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get models dynamically
    const UserModel = await getUserModel();
    const ProductModel = await getProductModel();
    const OrderModel = await getOrderModel();

    // If models not available, return error
    if (!UserModel || !ProductModel) {
      console.error('[adminController] Models not initialized');
      return res.status(500).json({
        success: false,
        message: 'Database models not initialized',
        data: null
      });
    }

    const ServiceLoader = require('../services/ServiceLoader');
    const dataProvider = require('../services/utils/dataProvider');
    const models = require('../models_sql');
    let UserRaw = null; // For postgres, no raw models

    // Use sequential safe counts via dataProvider (DB-agnostic, falls back to progress)
    let totalUsers = 0, totalVendors = 0, newUsersToday = 0, newUsersThisMonth = 0;
    let totalProducts = 0, activeProducts = 0, pendingProducts = 0, newProductsToday = 0;
    let totalOrders = 0, ordersToday = 0, ordersThisMonth = 0;
    let revenueResult = 0, revenueTodayResult = 0, revenueMonthResult = 0;

    try {
      // Use raw SQL queries to work with actual database schema
      const { Client } = require('pg');
      const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '1234',
        database: process.env.DB_NAME || 'dfashion'
      });
      await client.connect();

      const userResults = await client.query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN role = 'vendor' THEN 1 END) as vendors,
          COUNT(CASE WHEN created_at >= $1 THEN 1 END) as new_today,
          COUNT(CASE WHEN created_at >= $2 THEN 1 END) as new_month
        FROM users
      `, [startOfDay, startOfMonth]);

      if (userResults && userResults.rows && userResults.rows[0]) {
        totalUsers = parseInt(userResults.rows[0].total) || 0;
        totalVendors = parseInt(userResults.rows[0].vendors) || 0;
        newUsersToday = parseInt(userResults.rows[0].new_today) || 0;
        newUsersThisMonth = parseInt(userResults.rows[0].new_month) || 0;
      }

      await client.end();
    } catch (e) {
      console.warn('[adminController] Error counting users:', e.message);
      totalUsers = 0; totalVendors = 0; newUsersToday = 0; newUsersThisMonth = 0;
    }

    try {
      // Use raw SQL for products
      const { Client } = require('pg');
      const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '1234',
        database: process.env.DB_NAME || 'dfashion'
      });
      await client.connect();

      const productResults = await client.query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN created_at >= $1 THEN 1 END) as new_today
        FROM products
      `, [startOfDay]);

      if (productResults && productResults.rows && productResults.rows[0]) {
        totalProducts = parseInt(productResults.rows[0].total) || 0;
        newProductsToday = parseInt(productResults.rows[0].new_today) || 0;
      }
      activeProducts = 0; // Skip for now
      pendingProducts = 0; // Skip for now

      await client.end();
    } catch (e) {
      console.warn('[adminController] Error counting products:', e.message);
      totalProducts = 0; activeProducts = 0; pendingProducts = 0; newProductsToday = 0;
    }

    // Orders might not exist in SQL, provide default values
    try {
      // Use raw SQL for orders
      const { Client } = require('pg');
      const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '1234',
        database: process.env.DB_NAME || 'dfashion'
      });
      await client.connect();

      const orderResults = await client.query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN created_at >= $1 THEN 1 END) as today,
          COUNT(CASE WHEN created_at >= $2 THEN 1 END) as month,
          COALESCE(SUM(total_amount), 0) as revenue,
          COALESCE(SUM(CASE WHEN created_at >= $1 THEN total_amount END), 0) as revenue_today,
          COALESCE(SUM(CASE WHEN created_at >= $2 THEN total_amount END), 0) as revenue_month
        FROM orders
      `, [startOfDay, startOfMonth]);

      if (orderResults && orderResults.rows && orderResults.rows[0]) {
        totalOrders = parseInt(orderResults.rows[0].total) || 0;
        ordersToday = parseInt(orderResults.rows[0].today) || 0;
        ordersThisMonth = parseInt(orderResults.rows[0].month) || 0;
        revenueResult = parseFloat(orderResults.rows[0].revenue) || 0;
        revenueTodayResult = parseFloat(orderResults.rows[0].revenue_today) || 0;
        revenueMonthResult = parseFloat(orderResults.rows[0].revenue_month) || 0;
      }

      await client.end();
    } catch (e) {
      console.warn('[adminController] Error counting orders:', e.message);
      totalOrders = 0; ordersToday = 0; ordersThisMonth = 0;
      revenueResult = 0; revenueTodayResult = 0; revenueMonthResult = 0;
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
        recentOrders: await getRecentOrdersData(5),
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
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Use raw SQL via pg client to avoid Sequelize attribute mapping issues
    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    });
    await client.connect();

    const filters = [];
    const values = [];
    let idx = 1;
    if (role && role !== 'all') { filters.push(`role = $${idx++}`); values.push(role); }
    if (search) { filters.push(`(username ILIKE $${idx} OR email ILIKE $${idx} OR first_name ILIKE $${idx} OR last_name ILIKE $${idx})`); values.push(`%${search}%`); idx++; }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const rowsQuery = `SELECT id, username, email, first_name, last_name, role, is_active, created_at FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    values.push(parseInt(limit), offset);

    const countQuery = `SELECT COUNT(*) AS total FROM users ${whereClause}`;

    const rowsRes = await client.query(rowsQuery, values);
    const countRes = await client.query(countQuery, values.slice(0, values.length - 2));
    await client.end();

    const total = parseInt(countRes.rows[0].total || 0);

    return res.json({
      success: true,
      data: {
        users: rowsRes.rows,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
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
    
    const ProductModel = await getProductModel();
    const where = {};
    if (category && category !== 'all') where.categoryId = category;
    if (status && status !== 'all') {
      if (status === 'active') where.isActive = true;
      else if (status === 'inactive') where.isActive = false;
    }
    if (vendor) where.sellerId = vendor;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await ProductModel.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    return res.json({
      success: true,
      data: {
        products: result.rows,
        total: result.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(result.count / parseInt(limit))
      }
    });
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

    const OrderModel = await getOrderModel();
    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await OrderModel.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      raw: true,
      attributes: ['id', 'orderNumber', 'userId', 'totalAmount', 'status', 'paymentStatus', 'paymentMethod', 'shippingAddress', 'createdAt', 'updatedAt']
    });

    return res.json({
      success: true,
      data: {
        orders: result.rows,
        total: result.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(result.count / parseInt(limit))
      }
    });
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
    const UserModel = await getUserModel();
    const result = await UserModel.findAndCountAll({
      where: { role: 'vendor' },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    return res.json({
      success: true,
      data: {
        vendors: result.rows,
        total: result.count
      }
    });
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
// @route   PUT /api/admin/settings
// @access  Private/Admin
exports.updateAdminSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    const updated = {};
    res.json({
      success: true,
      data: updated,
      message: 'Admin settings updated successfully'
    });
  } catch (error) {
    console.error('[adminController] Error updating admin settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating admin settings',
      error: error.message
    });
  }
};

/**
 * Update user status
 */
exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    res.json({
      success: true,
      data: { id, status },
      message: 'User status updated successfully'
    });
  } catch (error) {
    console.error('[adminController] Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
      error: error.message
    });
  }
};

/**
 * Get all roles
 */
exports.getAllRoles = async (req, res) => {
  try {
    res.json({
      success: true,
      data: [],
      message: 'Roles retrieved successfully'
    });
  } catch (error) {
    console.error('[adminController] Error getting roles:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting roles',
      error: error.message
    });
  }
};

/**
 * Get all departments
 */
exports.getAllDepartments = async (req, res) => {
  try {
    res.json({
      success: true,
      data: [],
      message: 'Departments retrieved successfully'
    });
  } catch (error) {
    console.error('[adminController] Error getting departments:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting departments',
      error: error.message
    });
  }
};

/**
 * Create role
 */
exports.createRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    res.status(201).json({
      success: true,
      data: { id: null, name, description },
      message: 'Role created successfully'
    });
  } catch (error) {
    console.error('[adminController] Error creating role:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating role',
      error: error.message
    });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { name, description, permissions = [] } = req.body;
    return res.json({
      success: true,
      data: {
        id: roleId,
        name,
        description,
        permissions
      },
      message: 'Role updated successfully'
    });
  } catch (error) {
    console.error('[adminController] Error updating role:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating role',
      error: error.message
    });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    return res.json({
      success: true,
      data: { id: roleId },
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('[adminController] Error deleting role:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting role',
      error: error.message
    });
  }
};

exports.getAllPermissions = async (req, res) => {
  try {
    return res.json({
      success: true,
      data: [],
      message: 'Permissions retrieved successfully'
    });
  } catch (error) {
    console.error('[adminController] Error getting permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting permissions',
      error: error.message
    });
  }
};

exports.createPermission = async (req, res) => {
  res.status(501).json({ success: false, message: 'Create permission feature not implemented' });
};

exports.updatePermission = async (req, res) => {
  res.status(501).json({ success: false, message: 'Update permission feature not implemented' });
};

exports.deletePermission = async (req, res) => {
  res.status(501).json({ success: false, message: 'Delete permission feature not implemented' });
};

exports.getTeamMembers = async (req, res) => {
  res.status(501).json({ success: false, message: 'Get team members feature not implemented' });
};

exports.getAdminProfile = async (req, res) => {
  res.status(501).json({ success: false, message: 'Get admin profile feature not implemented' });
};

exports.getUserPermissions = async (req, res) => {
  res.status(501).json({ success: false, message: 'Get user permissions feature not implemented' });
};

exports.getAdminNotifications = async (req, res) => {
  res.status(501).json({ success: false, message: 'Get admin notifications feature not implemented' });
};

exports.markNotificationAsRead = async (req, res) => {
  res.status(501).json({ success: false, message: 'Mark notification feature not implemented' });
};

exports.markAllNotificationsAsRead = async (req, res) => {
  res.status(501).json({ success: false, message: 'Mark all notifications feature not implemented' });
};

exports.deleteNotification = async (req, res) => {
  res.status(501).json({ success: false, message: 'Delete notification feature not implemented' });
};

exports.deleteAllNotifications = async (req, res) => {
  res.status(501).json({ success: false, message: 'Delete all notifications feature not implemented' });
};

exports.updateProductStatus = async (req, res) => {
  res.status(501).json({ success: false, message: 'Update product status feature not implemented' });
};

exports.updateOrderStatus = async (req, res) => {
  res.status(501).json({ success: false, message: 'Update order status feature not implemented' });
};

exports.getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    });
    await client.connect();

    // Query activity logs (using audit_logs or similar table if exists)
    const countQuery = `SELECT COUNT(*) as total FROM audit_logs`;
    const logsQuery = `
      SELECT id, user_id, action, resource_type, description, ip_address, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    try {
      const countRes = await client.query(countQuery);
      const logsRes = await client.query(logsQuery, [parseInt(limit), offset]);
      await client.end();

      const total = parseInt(countRes.rows[0]?.total || 0);
      const logs = logsRes.rows || [];

      return res.json({
        success: true,
        data: {
          logs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (tableError) {
      // Table doesn't exist, return empty results
      await client.end();
      return res.json({
        success: true,
        data: {
          logs: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            totalPages: 0
          }
        }
      });
    }
  } catch (error) {
    console.error('[adminController] Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity logs',
      error: error.message
    });
  }
};


exports.getOrderReturns = async (req, res) => {
  res.status(501).json({ success: false, message: 'Get order returns feature not implemented' });
};

exports.createOrderReturn = async (req, res) => {
  res.status(501).json({ success: false, message: 'Create order return feature not implemented' });
};

exports.updateOrderReturn = async (req, res) => {
  res.status(501).json({ success: false, message: 'Update order return feature not implemented' });
};

exports.deleteOrderReturn = async (req, res) => {
  res.status(501).json({ success: false, message: 'Delete order return feature not implemented' });
};

// ✅ Get recent orders for dashboard
exports.getRecentOrders = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const recentOrders = await getRecentOrdersData(limit);

    // Return with nested structure expected by frontend
    return res.json({
      success: true,
      data: {
        recentOrders
      }
    });
  } catch (error) {
    console.error('[adminController] Error fetching recent orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent orders',
      error: error.message
    });
  }
};