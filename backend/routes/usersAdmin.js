const express = require('express');
const router = express.Router();
const usersAdminController = require('../controllers/usersAdminController');
const { auth } = require('../middleware/auth');
const { verifyAdminToken } = require('../middleware/adminAuth');

// User list routes
router.get('/customers', verifyAdminToken, usersAdminController.getCustomers);
router.get('/vendors', verifyAdminToken, usersAdminController.getVendors);
router.get('/creators', verifyAdminToken, usersAdminController.getCreators);
router.get('/admins', verifyAdminToken, usersAdminController.getAdmins);

// Activity and management
router.get('/activity-logs', verifyAdminToken, usersAdminController.getActivityLogs);
router.get('/roles', verifyAdminToken, usersAdminController.getRoles);
router.get('/departments', verifyAdminToken, usersAdminController.getDepartments);

// User operations
router.patch('/:id', verifyAdminToken, usersAdminController.updateUser);
router.delete('/:id', verifyAdminToken, usersAdminController.deleteUser);

module.exports = router;