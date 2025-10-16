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
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Story = require('../models/Story');
const Post = require('../models/Post');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

// ✅ Global Admin Auth Middleware
router.use(verifyAdminToken);

// =============================================================
// DASHBOARD ROUTES
// =============================================================
const dashboardHandler = [requirePermission('dashboard', 'view'), adminController.getDashboardStatsFromDB];

// Core dashboard routes
router.get('/', ...dashboardHandler);
router.get('/stats', ...dashboardHandler);
router.get('/metrics', ...dashboardHandler);
router.get('/dashboard', ...dashboardHandler);
router.get('/dashboard/metrics', ...dashboardHandler);

// Optional analytics route (safe fallback)
router.get('/analytics',
  requirePermission('dashboard', 'analytics'),
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
// Placeholder routes to avoid crashes
router.get('/roles', requireRole('super_admin'), (req, res) =>
  res.json({ success: true, message: 'Roles endpoint not yet implemented' })
);
router.post('/roles', requireRole('super_admin'), (req, res) =>
  res.json({ success: true, message: 'Create role endpoint not yet implemented' })
);
router.put('/roles/:roleId', requireRole('super_admin'), (req, res) =>
  res.json({ success: true, message: 'Update role endpoint not yet implemented' })
);
router.delete('/roles/:roleId', requireRole('super_admin'), (req, res) =>
  res.json({ success: true, message: 'Delete role endpoint not yet implemented' })
);

router.get('/permissions', requireRole('super_admin'), (req, res) =>
  res.json({ success: true, message: 'Permissions endpoint not yet implemented' })
);
router.post('/permissions', requireRole('super_admin'), (req, res) =>
  res.json({ success: true, message: 'Create permission endpoint not yet implemented' })
);
router.put('/permissions/:permissionId', requireRole('super_admin'), (req, res) =>
  res.json({ success: true, message: 'Update permission endpoint not yet implemented' })
);
router.delete('/permissions/:permissionId', requireRole('super_admin'), (req, res) =>
  res.json({ success: true, message: 'Delete permission endpoint not yet implemented' })
);

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

// =============================================================
// PRODUCTS
// =============================================================
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
// EXPORT
// =============================================================
module.exports = router;
