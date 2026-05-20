/**
 * Orders Management Routes - Phase 6
 * 7 endpoints for admin order management
 */

const express = require('express');
const router = express.Router();
const ordersManagementController = require('../controllers/ordersManagementControllerPhase6');
const { verifyToken, verifyRole } = require('../middleware/auth');

// Verify admin access
const adminOnly = [verifyToken, verifyRole(['admin', 'super_admin'])];

// Get all orders
router.get('/', adminOnly, ordersManagementController.getAllOrders);

// Get order details
router.get('/:orderId', adminOnly, ordersManagementController.getOrderDetails);

// Update order status
router.put('/:orderId/status', adminOnly, ordersManagementController.updateOrderStatus);

// Generate invoice
router.get('/:orderId/invoice', adminOnly, ordersManagementController.generateInvoice);

// Send order reminder
router.post('/:orderId/reminder', adminOnly, ordersManagementController.sendOrderReminder);

// Get order analytics
router.get('/analytics', adminOnly, ordersManagementController.getOrderAnalytics);

// Export orders
router.get('/export', adminOnly, ordersManagementController.exportOrders);

module.exports = router;
