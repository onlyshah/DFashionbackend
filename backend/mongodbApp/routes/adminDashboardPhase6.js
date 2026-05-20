/**
 * Admin Dashboard Routes - Phase 6
 * 12 endpoints for admin analytics and reporting
 */

const express = require('express');
const router = express.Router();
const adminDashboardController = require('../controllers/adminDashboardControllerPhase6');
const { verifyToken, verifyRole } = require('../middleware/auth');

// Verify admin access
const adminOnly = [verifyToken, verifyRole(['admin', 'super_admin'])];

// Dashboard summary
router.get('/summary', adminOnly, adminDashboardController.getDashboardStats);

// User statistics
router.get('/users/stats', adminOnly, adminDashboardController.getUserStats);

// Order statistics
router.get('/orders/stats', adminOnly, adminDashboardController.getOrderStats);

// Product statistics
router.get('/products/stats', adminOnly, adminDashboardController.getProductStats);

// Revenue statistics
router.get('/revenue/stats', adminOnly, adminDashboardController.getRevenueStats);

// Top products
router.get('/products/top', adminOnly, adminDashboardController.getTopProducts);

// Top categories
router.get('/categories/top', adminOnly, adminDashboardController.getTopCategories);

// Top users
router.get('/users/top', adminOnly, adminDashboardController.getTopUsers);

// Recent orders
router.get('/orders/recent', adminOnly, adminDashboardController.getRecentOrders);

// User activity trend
router.get('/users/activity-trend', adminOnly, adminDashboardController.getUserActivityTrend);

// Sales report
router.get('/reports/sales', adminOnly, adminDashboardController.getSalesReport);

// Inventory report
router.get('/reports/inventory', adminOnly, adminDashboardController.getInventoryReport);

module.exports = router;
