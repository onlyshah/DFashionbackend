const express = require('express');
const router = express.Router();
const marketingController = require('../controllers/marketingController');
const { auth, requireRole } = require('../middleware/auth');

// Flash Sales
router.get('/flash-sales', marketingController.getFlashSales);
router.get('/flash-sales/:saleId', marketingController.getFlashSaleById);
router.post('/flash-sales', auth, requireRole(['admin', 'super_admin']), marketingController.createFlashSale);
router.put('/flash-sales/:saleId', auth, requireRole(['admin', 'super_admin']), marketingController.updateFlashSale);
router.delete('/flash-sales/:saleId', auth, requireRole(['admin', 'super_admin']), marketingController.deleteFlashSale);

// Campaigns
router.get('/campaigns', marketingController.getCampaigns);
router.post('/campaigns', auth, requireRole(['admin', 'super_admin']), marketingController.createCampaign);
router.get('/campaigns/:campaignId', marketingController.getCampaignById);
router.put('/campaigns/:campaignId', auth, requireRole(['admin', 'super_admin']), marketingController.updateCampaign);
router.delete('/campaigns/:campaignId', auth, requireRole(['admin', 'super_admin']), marketingController.deleteCampaign);
router.get('/campaigns/:campaignId/metrics', marketingController.getCampaignMetrics);

// Banners
router.get('/banners', marketingController.getBanners);
router.post('/banners', auth, requireRole(['admin', 'super_admin']), marketingController.createBanner);

// Coupons
router.get('/coupons', auth, requireRole(['admin', 'super_admin']), marketingController.getCoupons);
router.post('/coupons', auth, requireRole(['admin', 'super_admin']), marketingController.createCoupon);
router.post('/coupons/validate', auth, marketingController.validateCoupon);

// Notifications
router.post('/push-notification', auth, requireRole(['admin', 'super_admin']), marketingController.sendPushNotification);
router.post('/email', auth, requireRole(['admin', 'super_admin']), marketingController.sendEmail);
router.post('/sms', auth, requireRole(['admin', 'super_admin']), marketingController.sendSMS);

module.exports = router;