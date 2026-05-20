/**
 * Analytics & Reports Routes - Phase 8
 * Routes: /api/v1/analytics
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsReportsControllerPhase8');
const { verifyToken, verifyRole } = require('../middleware/auth');

/**
 * Protected Routes (Admin only)
 */

router.use(verifyToken, verifyRole(['admin', 'super_admin']));

// GET - Sales analytics
router.get('/sales', analyticsController.getSalesAnalytics);

// GET - User analytics
router.get('/users', analyticsController.getUserAnalytics);

// GET - Product analytics
router.get('/products/:productId', analyticsController.getProductAnalytics);

// GET - Conversion funnel
router.get('/funnel', analyticsController.getConversionFunnel);

// GET - Customer journey
router.get('/customer-journey', analyticsController.getCustomerJourney);

// GET - Payment analytics
router.get('/payments', analyticsController.getPaymentAnalytics);

// GET - Refund analytics
router.get('/refunds', analyticsController.getRefundAnalytics);

// GET - Logistics analytics
router.get('/logistics', analyticsController.getLogisticsAnalytics);

// GET - Marketing analytics
router.get('/marketing', analyticsController.getMarketingAnalytics);

// GET - Inventory analytics
router.get('/inventory', analyticsController.getInventoryAnalytics);

// GET - Reports list
router.get('/reports/list', analyticsController.getReportsList);

// POST - Generate report
router.post('/reports/generate', analyticsController.generateReport);

// GET - Download report
router.get('/reports/:reportId/download', analyticsController.downloadReport);

// POST - Export data
router.post('/export', analyticsController.exportData);

// GET - Health metrics
router.get('/health', analyticsController.getHealthMetrics);

module.exports = router;
