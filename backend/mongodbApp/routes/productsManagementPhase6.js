/**
 * Products Management Routes - Phase 6
 * 8 endpoints for admin product management
 */

const express = require('express');
const router = express.Router();
const productsManagementController = require('../controllers/productsManagementControllerPhase6');
const { verifyToken, verifyRole } = require('../middleware/auth');

// Verify admin access
const adminOnly = [verifyToken, verifyRole(['admin', 'super_admin'])];

// Bulk update products
router.put('/bulk-update', adminOnly, productsManagementController.bulkUpdateProducts);

// Bulk delete products
router.delete('/bulk-delete', adminOnly, productsManagementController.bulkDeleteProducts);

// Get out of stock products
router.get('/out-of-stock', adminOnly, productsManagementController.getOutOfStockProducts);

// Get low stock products
router.get('/low-stock', adminOnly, productsManagementController.getLowStockProducts);

// Update product stock
router.put('/:productId/stock', adminOnly, productsManagementController.updateStock);

// Get product analytics
router.get('/:productId/analytics', adminOnly, productsManagementController.getProductAnalytics);

// Approve featured product
router.post('/:productId/feature', adminOnly, productsManagementController.approveFeaturedProduct);

// Reject featured product
router.delete('/:productId/feature', adminOnly, productsManagementController.rejectFeaturedProduct);

module.exports = router;
