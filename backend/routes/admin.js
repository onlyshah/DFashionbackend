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

// Product Variants endpoint (must come before generic :id routes)
router.get('/products/variants', requirePermission('products', 'view'), async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Product variants feature coming soon' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching variants', error: error.message });
  }
});

// Product Media endpoint (must come before generic :id routes)
router.get('/products/media', requirePermission('products', 'view'), async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Product media management feature coming soon' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching media', error: error.message });
  }
});

// Product Tagging endpoint (must come before generic :id routes)
router.get('/products/tagging', requirePermission('products', 'view'), async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Product tagging feature coming soon' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching tags', error: error.message });
  }
});

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
// INVOICES
// =============================================================
router.get('/invoices', requirePermission('orders', 'view'), async (req, res) => {
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
    const rowsQuery = `
      SELECT 
        o.id,
        o.order_number,
        o.user_id,
        o.total_amount,
        o.status,
        o.payment_status,
        o.created_at,
        o.updated_at,
        u.email as customer_email,
        u.username as customer_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT $${i++} OFFSET $${i++}
    `;
    vals.push(parseInt(limit), offset);
    const countQuery = `SELECT COUNT(*) AS total FROM orders ${where}`;

    const rowsRes = await client.query(rowsQuery, vals);
    const countRes = await client.query(countQuery, vals.slice(0, vals.length - 2));
    await client.end();

    const total = parseInt(countRes.rows[0].total || 0);
    const invoices = rowsRes.rows.map(order => ({
      id: order.id,
      invoiceNumber: `INV-${order.order_number}`,
      orderNumber: order.order_number,
      customerId: order.user_id,
      customerEmail: order.customer_email,
      customerName: order.customer_name,
      amount: order.total_amount,
      status: order.status,
      paymentStatus: order.payment_status,
      createdAt: order.created_at,
      updatedAt: order.updated_at
    }));

    return res.json({ 
      success: true, 
      data: { 
        invoices, 
        total, 
        page: parseInt(page), 
        limit: parseInt(limit), 
        totalPages: Math.ceil(total / parseInt(limit)) 
      } 
    });
  } catch (error) {
    console.error('[routes/admin] Raw invoices handler error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching invoices', error: error.message });
  }
});

router.get('/invoices/:id', requirePermission('orders', 'view'), async (req, res) => {
  try {
    const { id } = req.params;
    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    });
    await client.connect();

    const query = `
      SELECT 
        o.id,
        o.order_number,
        o.user_id,
        o.total_amount,
        o.status,
        o.payment_status,
        o.payment_method,
        o.shipping_address,
        o.created_at,
        o.updated_at,
        u.email,
        u.username,
        u.avatar_url
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `;

    const result = await client.query(query, [id]);
    await client.end();

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const order = result.rows[0];
    const invoice = {
      id: order.id,
      invoiceNumber: `INV-${order.order_number}`,
      orderNumber: order.order_number,
      customerId: order.user_id,
      customerEmail: order.email,
      customerName: order.username,
      amount: order.total_amount,
      status: order.status,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      shippingAddress: order.shipping_address,
      createdAt: order.created_at,
      updatedAt: order.updated_at
    };

    return res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('[routes/admin] Get invoice handler error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching invoice', error: error.message });
  }
});

router.get('/activity-logs', adminController.getActivityLogs);

// =============================================================
// REVIEWS & RATINGS MANAGEMENT
// =============================================================
router.get('/reviews', requirePermission('reviews', 'view'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, productId } = req.query;
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
    if (status && status !== 'all') { filters.push(`pr.status = $${i++}`); vals.push(status); }
    if (productId) { filters.push(`pr.product_id = $${i++}`); vals.push(productId); }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rowsQuery = `
      SELECT 
        pr.id,
        pr.product_id,
        pr.user_id,
        pr.rating,
        pr.status,
        pr.created_at,
        p.title as product_title,
        u.username,
        u.email
      FROM product_reviews pr
      LEFT JOIN products p ON pr.product_id = p.id
      LEFT JOIN users u ON pr.user_id = u.id
      ${where}
      ORDER BY pr.created_at DESC
      LIMIT $${i++} OFFSET $${i++}
    `;
    vals.push(parseInt(limit), offset);
    const countQuery = `SELECT COUNT(*) AS total FROM product_reviews ${where}`;

    const rowsRes = await client.query(rowsQuery, vals);
    const countRes = await client.query(countQuery, vals.slice(0, vals.length - 2));
    await client.end();

    const total = parseInt(countRes.rows[0].total || 0);

    return res.json({ 
      success: true, 
      data: { 
        reviews: rowsRes.rows, 
        total, 
        page: parseInt(page), 
        limit: parseInt(limit), 
        totalPages: Math.ceil(total / parseInt(limit)) 
      } 
    });
  } catch (error) {
    console.error('[routes/admin] Raw reviews handler error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching reviews', error: error.message });
  }
});

router.get('/reviews/:id', requirePermission('reviews', 'view'), async (req, res) => {
  try {
    const { id } = req.params;
    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    });
    await client.connect();

    const query = `
      SELECT 
        pr.id,
        pr.product_id,
        pr.user_id,
        pr.rating,
        pr.status,
        pr.created_at,
        p.title as product_title,
        u.username,
        u.email,
        u.avatar_url
      FROM product_reviews pr
      LEFT JOIN products p ON pr.product_id = p.id
      LEFT JOIN users u ON pr.user_id = u.id
      WHERE pr.id = $1
    `;

    const result = await client.query(query, [id]);
    await client.end();

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[routes/admin] Get review handler error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching review', error: error.message });
  }
});

router.get('/creator-ratings', requirePermission('reviews', 'view'), async (req, res) => {
  try {
    const { page = 1, limit = 20, creatorId } = req.query;
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
    if (creatorId) { filters.push(`cr.creator_id = $${i++}`); vals.push(creatorId); }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rowsQuery = `
      SELECT 
        cr.id,
        cr.creator_id,
        cr.overall_rating,
        cr.content_quality,
        cr.engagement,
        cr.professionalism,
        cr.comment,
        cr.verified,
        cr.created_at,
        u.username as creator_name
      FROM creator_ratings cr
      LEFT JOIN users u ON cr.creator_id = u.id
      ${where}
      ORDER BY cr.created_at DESC
      LIMIT $${i++} OFFSET $${i++}
    `;
    vals.push(parseInt(limit), offset);
    const countQuery = `SELECT COUNT(*) AS total FROM creator_ratings ${where}`;

    const rowsRes = await client.query(rowsQuery, vals);
    const countRes = await client.query(countQuery, vals.slice(0, vals.length - 2));
    await client.end();

    const total = parseInt(countRes.rows[0].total || 0);

    return res.json({ 
      success: true, 
      data: { 
        ratings: rowsRes.rows, 
        total, 
        page: parseInt(page), 
        limit: parseInt(limit), 
        totalPages: Math.ceil(total / parseInt(limit)) 
      } 
    });
  } catch (error) {
    console.error('[routes/admin] Raw creator-ratings handler error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching creator ratings', error: error.message });
  }
});

router.get('/review-disputes', requirePermission('reviews', 'view'), async (req, res) => {
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
    if (status && status !== 'all') { filters.push(`rd.status = $${i++}`); vals.push(status); }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rowsQuery = `
      SELECT 
        rd.id,
        rd.review_id,
        rd.dispute_reason,
        rd.status,
        rd.description,
        rd.created_at,
        rd.updated_at,
        pr.rating,
        p.title as product_title,
        u.username
      FROM review_disputes rd
      LEFT JOIN product_reviews pr ON rd.review_id = pr.id
      LEFT JOIN products p ON pr.product_id = p.id
      LEFT JOIN users u ON pr.user_id = u.id
      ${where}
      ORDER BY rd.created_at DESC
      LIMIT $${i++} OFFSET $${i++}
    `;
    vals.push(parseInt(limit), offset);
    const countQuery = `SELECT COUNT(*) AS total FROM review_disputes ${where}`;

    const rowsRes = await client.query(rowsQuery, vals);
    const countRes = await client.query(countQuery, vals.slice(0, vals.length - 2));
    await client.end();

    const total = parseInt(countRes.rows[0].total || 0);

    return res.json({ 
      success: true, 
      data: { 
        disputes: rowsRes.rows, 
        total, 
        page: parseInt(page), 
        limit: parseInt(limit), 
        totalPages: Math.ceil(total / parseInt(limit)) 
      } 
    });
  } catch (error) {
    console.error('[routes/admin] Raw review-disputes handler error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching disputes', error: error.message });
  }
});

router.get('/reported-reviews', requirePermission('reviews', 'view'), async (req, res) => {
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
    if (status && status !== 'all') { filters.push(`rr.status = $${i++}`); vals.push(status); }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rowsQuery = `
      SELECT 
        rr.id,
        rr.review_id,
        rr.report_reason,
        rr.status,
        rr.description,
        rr.created_at,
        rr.updated_at,
        pr.rating,
        p.title as product_title,
        u.username
      FROM reported_reviews rr
      LEFT JOIN product_reviews pr ON rr.review_id = pr.id
      LEFT JOIN products p ON pr.product_id = p.id
      LEFT JOIN users u ON pr.user_id = u.id
      ${where}
      ORDER BY rr.created_at DESC
      LIMIT $${i++} OFFSET $${i++}
    `;
    vals.push(parseInt(limit), offset);
    const countQuery = `SELECT COUNT(*) AS total FROM reported_reviews ${where}`;

    const rowsRes = await client.query(rowsQuery, vals);
    const countRes = await client.query(countQuery, vals.slice(0, vals.length - 2));
    await client.end();

    const total = parseInt(countRes.rows[0].total || 0);

    return res.json({ 
      success: true, 
      data: { 
        reports: rowsRes.rows, 
        total, 
        page: parseInt(page), 
        limit: parseInt(limit), 
        totalPages: Math.ceil(total / parseInt(limit)) 
      } 
    });
  } catch (error) {
    console.error('[routes/admin] Raw reported-reviews handler error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching reported reviews', error: error.message });
  }
});

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