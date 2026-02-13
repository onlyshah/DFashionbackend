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

// ✅ Global Admin Auth Middleware - All routes below require auth
// All endpoints require authentication with JWT token
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
router.get('/users', requirePermission('users', 'view'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
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
    return res.json({ success: true, data: { users: rowsRes.rows, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    console.error('[routes/admin] Raw users handler error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching users', error: error.message });
  }
});

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

router.put(
  '/users/:id/status',
  requireRole('admin'),
  adminController.updateUserStatus
);

// =============================================================
// ROLE & PERMISSION MANAGEMENT (Super Admin Only)
// =============================================================

// GET all roles for dropdowns and management
router.get('/roles', requireRole('super_admin'), adminController.getAllRoles);

// GET all departments for dropdowns
router.get('/departments', requireRole('super_admin'), adminController.getAllDepartments);

// POST create new role
router.post('/roles', requireRole('super_admin'), adminController.createRole);

// PUT update role
router.put('/roles/:roleId', requireRole('super_admin'), adminController.updateRole);

// DELETE role
router.delete('/roles/:roleId', requireRole('super_admin'), adminController.deleteRole);

// GET all permissions
router.get('/permissions', requireRole('super_admin'), adminController.getAllPermissions);

// POST create new permission (Super Admin only)
router.post('/permissions', requireRole('super_admin'), adminController.createPermission);

// PUT update permission (Super Admin only)
router.put('/permissions/:permissionId', requireRole('super_admin'), adminController.updatePermission);

// DELETE permission (Super Admin only)
router.delete('/permissions/:permissionId', requireRole('super_admin'), adminController.deletePermission);

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
router.get('/team', requirePermission('users', 'view'), adminController.getTeamMembers);

// =============================================================
// PROFILE & PERMISSIONS
// =============================================================
router.get('/profile', adminController.getAdminProfile);

router.get('/user-permissions', adminController.getUserPermissions);

// Quick actions for admin navbar
router.get('/quick-actions', requirePermission('dashboard', 'view'), adminController.getQuickActions);

// =============================================================
// ADMIN NOTIFICATIONS (proxied for admin dashboard)
// These endpoints mirror the public /api/notifications but are mounted under /api/admin
// so the admin UI can fetch and manage notifications without cross-route changes.
// =============================================================
router.get('/notifications', requirePermission('dashboard', 'view'), adminController.getAdminNotifications);

router.patch('/notifications/:id/read', requirePermission('dashboard', 'view'), adminController.markNotificationAsRead);

router.patch('/notifications/mark-all-read', requirePermission('dashboard', 'view'), adminController.markAllNotificationsAsRead);

router.delete('/notifications/:id', requirePermission('dashboard', 'view'), adminController.deleteNotification);

router.delete('/notifications', requirePermission('dashboard', 'view'), adminController.deleteAllNotifications);

// =============================================================
// PRODUCTS
// =============================================================

// Authenticated endpoint - Returns actual products
router.get('/products', requirePermission('products', 'view'), adminController.getAllProducts);

router.put('/products/:id/status', requirePermission('products', 'edit'), adminController.updateProductStatus);

// =============================================================
// ORDERS
// =============================================================
router.get('/orders/recent', verifyAdminToken, adminController.getRecentOrders);
router.get('/orders', requirePermission('orders', 'view'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
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

    const filters = [];
    const vals = [];
    let i = 1;
    if (status && status !== 'all') { filters.push(`status = $${i++}`); vals.push(status); }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rowsQuery = `SELECT id, order_number, user_id, total_amount, status, payment_status, payment_method, shipping_address, created_at, updated_at FROM orders ${where} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    vals.push(parseInt(limit), offset);
    const countQuery = `SELECT COUNT(*) AS total FROM orders ${where}`;

    const rowsRes = await client.query(rowsQuery, vals);
    const countRes = await client.query(countQuery, vals.slice(0, vals.length - 2));
    await client.end();

    const total = parseInt(countRes.rows[0].total || 0);
    return res.json({ success: true, data: { orders: rowsRes.rows, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    console.error('[routes/admin] Raw orders handler error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching orders', error: error.message });
  }
});

router.put('/orders/:id/status', requirePermission('orders', 'edit'), adminController.updateOrderStatus);

// =============================================================
// ACTIVITY LOGS
// =============================================================
router.get('/activity-logs', adminController.getActivityLogs);

// =============================================================
// RETURNS MANAGEMENT (Admin)
// =============================================================
router.get('/orders/returns', requirePermission('orders', 'view'), adminController.getOrderReturns);

router.post('/orders/returns', requirePermission('orders', 'create'), adminController.createOrderReturn);

router.put('/orders/returns/:id', requirePermission('orders', 'edit'), adminController.updateOrderReturn);

router.delete('/orders/returns/:id', requirePermission('orders', 'delete'), adminController.deleteOrderReturn);

// =============================================================
// EXPORT
// =============================================================
module.exports = router;