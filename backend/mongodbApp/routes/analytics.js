const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { auth, requireRole } = require('../middleware/auth');

router.get('/overview', analyticsController.getOverview);
router.get('/orders', analyticsController.getOrdersAnalytics);
router.get('/users', analyticsController.getUsersAnalytics);
router.get('/revenue', analyticsController.getRevenueAnalytics);
router.get('/categories', analyticsController.getCategoriesAnalytics);
router.get('/sales', analyticsController.getSalesAnalytics);
router.get('/products', analyticsController.getProductsAnalytics);
router.post('/track', analyticsController.trackUserBehavior);

module.exports = router;