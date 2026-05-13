const express = require('express');
const router = express.Router();
const complianceController = require('../controllers/complianceController');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/adminAuth');

router.get('/audit-logs', auth, requirePermission('compliance:audit'), complianceController.getAuditLogs);

module.exports = router;