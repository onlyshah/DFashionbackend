const express = require('express');
const router = express.Router();
const usersAdminController = require('../controllers/usersAdminController');
const { auth } = require('../middleware/auth');
const { verifyAdminToken } = require('../middleware/adminAuth');

// ============================================================================
// 👥 CUSTOMER MANAGEMENT (EndUsers only)
// ============================================================================

// Get all customers (aggregated with posts, orders, engagement)
router.get('/customers', verifyAdminToken, usersAdminController.getCustomers);

// Get customer posts/reels
router.get('/customers/:customerId/posts', verifyAdminToken, usersAdminController.getCustomerPosts);

// Get customer engagement metrics
router.get('/customers/:customerId/engagement', verifyAdminToken, usersAdminController.getCustomerEngagement);

// Block customer
router.patch('/customers/:customerId/block', verifyAdminToken, usersAdminController.blockCustomer);

// Unblock customer
router.patch('/customers/:customerId/unblock', verifyAdminToken, usersAdminController.unblockCustomer);

// Reset customer password
router.post('/customers/:customerId/reset-password', verifyAdminToken, usersAdminController.resetCustomerPassword);

// Delete customer post (by admin)
router.delete('/customers/:customerId/posts/:postId', verifyAdminToken, usersAdminController.deleteCustomerPost);

// Update customer details
router.patch('/customers/:customerId', verifyAdminToken, usersAdminController.updateUser);

// Soft delete customer
router.delete('/customers/:customerId', verifyAdminToken, usersAdminController.deleteUser);

// ============================================================================
// 🏪 VENDOR MANAGEMENT
// ============================================================================

// User list routes
router.get('/vendors', verifyAdminToken, usersAdminController.getVendors);
router.get('/creators', verifyAdminToken, usersAdminController.getCreators);
router.get('/admins', verifyAdminToken, usersAdminController.getAdmins);

// Activity and management
router.get('/activity-logs', verifyAdminToken, usersAdminController.getActivityLogs);
router.get('/roles', verifyAdminToken, usersAdminController.getRoles);
router.get('/departments', verifyAdminToken, usersAdminController.getDepartments);

// ============================================================================
// 📊 USER OPERATIONS (deprecated, use /customers/* instead)
// ============================================================================

// User operations
router.patch('/:id', verifyAdminToken, usersAdminController.updateUser);
router.delete('/:id', verifyAdminToken, usersAdminController.deleteUser);

module.exports = router;