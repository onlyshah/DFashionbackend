const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { requireRole } = require('../middleware/auth');
const { verifyAdminToken } = require('../middleware/adminAuth');

// All audit log endpoints require super_admin access
const requireSuperAdmin = [verifyAdminToken, requireRole(['super_admin'])];

// Get audit logs with filtering
router.get('/', requireSuperAdmin, auditLogController.getAuditLogs);

// Filter by admin user
router.get('/user/:admin_id', requireSuperAdmin, auditLogController.filterByUser);

// Filter by action
router.get('/action/:action', requireSuperAdmin, auditLogController.filterByAction);

// Filter by resource
router.get('/resource/:resource_type', requireSuperAdmin, auditLogController.filterByResource);

// Export audit logs
router.post('/export', requireSuperAdmin, auditLogController.exportLogs);

// View system activity statistics
router.get('/activity/stats', requireSuperAdmin, auditLogController.viewSystemActivity);

// Get action statistics
router.get('/stats/actions', requireSuperAdmin, auditLogController.getActionStats);

module.exports = router;