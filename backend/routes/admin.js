// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const {
  verifyAdminToken,
  requirePermission,
  requireRole,
  requireDepartment
} = require('../middleware/adminAuth');

const { auth, isAdmin } = require('../middleware/auth');
const models = require('../models');
const User = models.User;
const Product = models.Product;
const Category = models.Category;
const Story = models.Story;
const Post = models.Post;
const Order = models.Order;
const Payment = models.Payment;
const Notification = models.Notification;

// ✅ Global Admin Auth Middleware
router.use(verifyAdminToken);

// =============================================================
// DASHBOARD ROUTES
// =============================================================
const dashboardHandler = [adminController.getDashboardStatsFromDB];

// Core dashboard routes
router.get('/', ...dashboardHandler);
router.get('/stats', ...dashboardHandler);
router.get('/metrics', ...dashboardHandler);
router.get('/dashboard', ...dashboardHandler);
router.get('/dashboard/metrics', ...dashboardHandler);

// Real dashboard endpoint
router.get('/dashboard/stats', adminController.getDashboardStatsFromDB);

// Optional analytics route (safe fallback)
router.get('/analytics',
  (req, res) => res.json({ success: true, message: 'Analytics endpoint not yet implemented' })
);

// =============================================================
// USER MANAGEMENT
// =============================================================
router.get('/users', requirePermission('users', 'view'), adminController.getAllUsers);

router.post(
  '/users',
  requirePermission('users', 'create'),
  requireRole('super_admin'),
  adminController.createAdminUser
);

router.put(
  '/users/:userId/role',
  requirePermission('users', 'roles'),
  requireRole('super_admin'),
  adminController.updateUserRole
);

router.put('/users/:id/status', requireRole('admin'), async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// =============================================================
// ROLE & PERMISSION MANAGEMENT (Super Admin Only)
// =============================================================
const Role = models.Role;
const Department = models.Department;

// GET all roles for dropdowns and management
router.get('/roles', requireRole('super_admin'), async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const skip = (page - 1) * limit;

    const roles = await Role.find({ isActive: true })
      .select('_id name displayName description department level isSystemRole')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Role.countDocuments({ isActive: true });
    const pages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: roles,
      pagination: { page: parseInt(page), limit: parseInt(limit), pages, total }
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ success: false, message: 'Error fetching roles' });
  }
});

// GET all departments for dropdowns
router.get('/departments', requireRole('super_admin'), async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const skip = (page - 1) * limit;

    const departments = await Department.find({ isActive: true })
      .select('_id name displayName description')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Department.countDocuments({ isActive: true });
    const pages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: departments,
      pagination: { page: parseInt(page), limit: parseInt(limit), pages, total }
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ success: false, message: 'Error fetching departments' });
  }
});

// POST create new role
router.post('/roles', requireRole('super_admin'), async (req, res) => {
  try {
    const { name, displayName, description, department, level, modulePermissions } = req.body;

    if (!name || !displayName || !description || !department || level === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newRole = new Role({
      name,
      displayName,
      description,
      department,
      level,
      modulePermissions: modulePermissions || [],
      createdBy: req.user._id
    });

    await newRole.save();

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: newRole
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ success: false, message: 'Error creating role' });
  }
});

// PUT update role
router.put('/roles/:roleId', requireRole('super_admin'), async (req, res) => {
  try {
    const { name, displayName, description, department, level, modulePermissions } = req.body;
    const updatedRole = await Role.findByIdAndUpdate(
      req.params.roleId,
      { name, displayName, description, department, level, modulePermissions },
      { new: true, runValidators: true }
    );

    if (!updatedRole) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: updatedRole
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ success: false, message: 'Error updating role' });
  }
});

// DELETE role
router.delete('/roles/:roleId', requireRole('super_admin'), async (req, res) => {
  try {
    const role = await Role.findByIdAndUpdate(
      req.params.roleId,
      { isActive: false },
      { new: true }
    );

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    res.json({
      success: true,
      message: 'Role deleted successfully',
      data: role
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ success: false, message: 'Error deleting role' });
  }
});

// GET all permissions
router.get('/permissions', requireRole('super_admin'), async (req, res) => {
  try {
    const { page = 1, limit = 100, module = '' } = req.query;
    const skip = (page - 1) * limit;

    const Permission = models.Permission;
    let where = {};
    if (module) {
      where.module = module;
    }

    const { count, rows } = await Permission.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: skip,
      raw: true
    });

    res.json({
      success: true,
      data: rows || [],
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
    });
  } catch (error) {
    console.error('Error fetching permissions:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching permissions' });
  }
});

// POST create new permission (Super Admin only)
router.post('/permissions', requireRole('super_admin'), async (req, res) => {
  try {
    const { name, displayName, description, module, actions } = req.body;

    if (!name || !displayName || !module) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const Permission = models.Permission;
    const newPermission = await Permission.create({
      name,
      displayName,
      description,
      module,
      actions: Array.isArray(actions) ? JSON.stringify(actions) : actions
    });

    res.status(201).json({
      success: true,
      message: 'Permission created successfully',
      data: newPermission
    });
  } catch (error) {
    console.error('Error creating permission:', error);
    res.status(500).json({ success: false, message: 'Error creating permission' });
  }
});

// PUT update permission (Super Admin only)
router.put('/permissions/:permissionId', requireRole('super_admin'), async (req, res) => {
  try {
    const { name, displayName, description, module, actions } = req.body;
    const Permission = models.Permission;

    const updatedPermission = await Permission.update(
      {
        name,
        displayName,
        description,
        module,
        actions: Array.isArray(actions) ? JSON.stringify(actions) : actions
      },
      { where: { id: req.params.permissionId }, returning: true }
    );

    if (updatedPermission[0] === 0) {
      return res.status(404).json({ success: false, message: 'Permission not found' });
    }

    res.json({
      success: true,
      message: 'Permission updated successfully',
      data: updatedPermission[1][0]
    });
  } catch (error) {
    console.error('Error updating permission:', error);
    res.status(500).json({ success: false, message: 'Error updating permission' });
  }
});

// DELETE permission (Super Admin only)
router.delete('/permissions/:permissionId', requireRole('super_admin'), async (req, res) => {
  try {
    const Permission = models.Permission;
    const deleted = await Permission.destroy({
      where: { id: req.params.permissionId }
    });

    if (deleted === 0) {
      return res.status(404).json({ success: false, message: 'Permission not found' });
    }

    res.json({
      success: true,
      message: 'Permission deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting permission:', error);
    res.status(500).json({ success: false, message: 'Error deleting permission' });
  }
});

// =============================================================
// DEPARTMENT DASHBOARDS
// =============================================================
router.get(
  '/departments/:department/dashboard',
  requireDepartment(['sales', 'marketing', 'support', 'accounting', 'administration']),
  (req, res) =>
    res.json({
      success: true,
      message: `Department dashboard for ${req.params.department} not yet implemented`
    })
);

// =============================================================
// TEAM MANAGEMENT (Admins & Super Admin)
// =============================================================
router.get('/team', requirePermission('users', 'view'), async (req, res) => {
  try {
    const teamMembers = await User.find({
      role: { $in: ['super_admin', 'admin', 'sales_manager', 'marketing_manager', 'support_agent'] }
    })
      .select('fullName email role isActive lastLogin createdAt')
      .lean();

    const formattedTeam = teamMembers.map(m => ({
      id: m._id,
      name: m.fullName,
      email: m.email,
      role: m.role,
      department: getDepartmentFromRole(m.role),
      status: m.isActive ? 'active' : 'inactive',
      last_login: m.lastLogin || m.createdAt,
      permissions: getRolePermissions(m.role)
    }));

    res.json({ success: true, data: formattedTeam });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch team', error: error.message });
  }
});

function getDepartmentFromRole(role) {
  const map = {
    super_admin: 'administration',
    admin: 'administration',
    sales_manager: 'sales',
    marketing_manager: 'marketing',
    support_agent: 'support'
  };
  return map[role] || 'general';
}

function getRolePermissions(role) {
  const map = {
    super_admin: ['all'],
    admin: ['dashboard.view', 'users.view', 'products.manage', 'orders.manage'],
    sales_manager: ['dashboard.view', 'orders.view', 'orders.edit'],
    marketing_manager: ['dashboard.view', 'analytics.view', 'campaigns.manage'],
    support_agent: ['dashboard.view', 'orders.view', 'users.view']
  };
  return map[role] || [];
}

// =============================================================
// PROFILE & PERMISSIONS
// =============================================================
router.get('/profile', (req, res) => {
  const u = req.user;
  res.json({
    success: true,
    data: {
      user: {
        id: u._id,
        name: u.fullName,
        email: u.email,
        role: u.role,
        department: u.department,
        permissions: u.permissions || [],
        last_login: u.lastLogin,
        avatar: u.avatar
      }
    }
  });
});

router.get('/user-permissions', (req, res) => {
  const role = req.user.role;
  const perms = {
    super_admin: ['all'],
    admin: ['dashboard.*', 'users.*', 'products.*', 'orders.*', 'settings.*'],
    sales_manager: ['dashboard.view', 'orders.*'],
    marketing_manager: ['dashboard.view', 'analytics.view', 'marketing.*'],
    accountant: ['dashboard.view', 'finance.view'],
    support_agent: ['dashboard.view', 'support.tickets']
  };
  res.json({ success: true, data: { role, permissions: perms[role] || ['dashboard.view'] } });
});

// Quick actions for admin navbar
router.get('/quick-actions', requirePermission('dashboard', 'view'), adminController.getQuickActions);

// =============================================================
// ADMIN NOTIFICATIONS (proxied for admin dashboard)
// These endpoints mirror the public /api/notifications but are mounted under /api/admin
// so the admin UI can fetch and manage notifications without cross-route changes.
// =============================================================
router.get('/notifications', requirePermission('dashboard', 'view'), async (req, res) => {
  try {
    const { page = 1, limit = 10, category, isRead, type } = req.query;
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      category,
      type
    };

    if (isRead !== undefined) options.isRead = isRead === 'true';

    // If Notification model is not available (Postgres-only), return safe empty response
    if (!Notification || typeof Notification.getUserNotifications !== 'function') {
      return res.json({ success: true, data: [], pagination: { current: options.page, pages: 0, total: 0 }, unreadCount: 0 });
    }

    const result = await Notification.getUserNotifications(req.user._id, options);

    res.json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
      unreadCount: result.unreadCount
    });
  } catch (error) {
    console.error('Admin get notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications', error: error.message });
  }
});

router.patch('/notifications/:id/read', requirePermission('dashboard', 'view'), async (req, res) => {
  try {
    const notification = await Notification.markAsRead(req.params.id, req.user._id);
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, message: 'Notification marked as read', data: notification });
  } catch (error) {
    console.error('Admin mark notification read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read', error: error.message });
  }
});

router.patch('/notifications/mark-all-read', requirePermission('dashboard', 'view'), async (req, res) => {
  try {
    const result = await Notification.markAllAsRead(req.user._id);
    res.json({ success: true, message: 'All notifications marked as read', modifiedCount: result.modifiedCount || result.nModified || 0 });
  } catch (error) {
    console.error('Admin mark all read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all notifications as read', error: error.message });
  }
});

router.delete('/notifications/:id', requirePermission('dashboard', 'view'), async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Admin delete notification error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete notification', error: error.message });
  }
});

router.delete('/notifications', requirePermission('dashboard', 'view'), async (req, res) => {
  try {
    const result = await Notification.deleteMany({ recipient: req.user._id });
    res.json({ success: true, message: 'All notifications cleared', deletedCount: result.deletedCount || 0 });
  } catch (error) {
    console.error('Admin clear notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear notifications', error: error.message });
  }
});

// =============================================================
// PRODUCTS
// =============================================================

// Demo endpoint (public) - Returns sample products for testing without auth
router.get('/demo/products', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Return demo/sample products
    const demoProducts = [
      {
        _id: '1',
        name: 'Premium T-Shirt',
        description: 'High-quality cotton t-shirt',
        price: 29.99,
        category: 'Men',
        isActive: true,
        isFeatured: false
      },
      {
        _id: '2',
        name: 'Classic Jeans',
        description: 'Comfortable denim jeans',
        price: 59.99,
        category: 'Men',
        isActive: true,
        isFeatured: true
      },
      {
        _id: '3',
        name: 'Casual Dress',
        description: 'Perfect for everyday wear',
        price: 44.99,
        category: 'Women',
        isActive: true,
        isFeatured: false
      },
      {
        _id: '4',
        name: 'Sport Shoes',
        description: 'Lightweight athletic shoes',
        price: 79.99,
        category: 'Shoes',
        isActive: true,
        isFeatured: true
      },
      {
        _id: '5',
        name: 'Winter Jacket',
        description: 'Warm and stylish jacket',
        price: 119.99,
        category: 'Outerwear',
        isActive: true,
        isFeatured: false
      }
    ];

    // Paginate
    const paginatedProducts = demoProducts.slice(offset, offset + parseInt(limit));
    const totalPages = Math.ceil(demoProducts.length / parseInt(limit));

    res.json({
      success: true,
      data: {
        products: paginatedProducts,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalProducts: demoProducts.length,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Demo products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch demo products',
      error: error.message
    });
  }
});

// Authenticated endpoint - Returns actual products
router.get('/products', requirePermission('products', 'view'), adminController.getAllProducts);

router.put('/products/:id/status', requirePermission('products', 'edit'), async (req, res) => {
  try {
    const { isActive } = req.body;
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: `Product ${isActive ? 'activated' : 'deactivated'}` });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// =============================================================
// ORDERS
// =============================================================
router.get('/orders/recent', adminController.getRecentOrders);
router.get('/orders', requirePermission('orders', 'view'), adminController.getAllOrders);

router.put('/orders/:id/status', requirePermission('orders', 'edit'), async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, message: `Order updated to ${status}` });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// =============================================================
// ACTIVITY LOGS
// =============================================================
router.get('/activity-logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    // Try to get AuditLog from Postgres models first
    try {
      const models = require('../models_sql');
      const AuditLog = models._raw.AuditLog;
      
      if (AuditLog) {
        const { count, rows } = await AuditLog.findAndCountAll({
          order: [['createdAt', 'DESC']],
          limit,
          offset,
          raw: true
        });

        return res.json({
          success: true,
          data: {
            logs: rows || [],
            pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
          }
        });
      }
    } catch (err) {
      console.log('Postgres AuditLog not available, trying MongoDB...');
    }

    // Fallback to MongoDB if available
    try {
      const models = require('../models');
      const AuditLog = models.AuditLog;
      
      if (AuditLog) {
        const count = await AuditLog.countDocuments();
        const logs = await AuditLog.find()
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset)
          .lean();

        return res.json({
          success: true,
          data: {
            logs: logs || [],
            pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
          }
        });
      }
    } catch (err) {
      console.log('MongoDB AuditLog not available');
    }

    // Return empty logs if neither database has data
    res.json({
      success: true,
      data: {
        logs: [],
        pagination: { page, limit, total: 0, pages: 0 }
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching activity logs', error: error.message });
  }
});

// =============================================================
// EXPORT
// =============================================================
module.exports = router;
