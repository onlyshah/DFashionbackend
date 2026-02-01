const express = require('express');
const router = express.Router();
const promotionsController = require('../controllers/promotionsController');
const { auth } = require('../middleware/auth');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuth');

// Coupon routes
router.get('/coupons', verifyAdminToken, requirePermission('promotions', 'view'), promotionsController.getAllCoupons);
router.post('/coupons', verifyAdminToken, requirePermission('promotions', 'manage'), promotionsController.createCoupon);
router.get('/coupons/:couponId', verifyAdminToken, requirePermission('promotions', 'view'), promotionsController.getCouponById);
router.put('/coupons/:couponId', verifyAdminToken, requirePermission('promotions', 'manage'), promotionsController.updateCoupon);
router.delete('/coupons/:couponId', verifyAdminToken, requirePermission('promotions', 'manage'), promotionsController.deleteCoupon);

// Flash sale routes
router.get('/flash-sales', verifyAdminToken, requirePermission('promotions', 'view'), promotionsController.getAllFlashSales);
router.post('/flash-sales', verifyAdminToken, requirePermission('promotions', 'manage'), promotionsController.createFlashSale);
router.get('/flash-sales/:saleId', verifyAdminToken, requirePermission('promotions', 'view'), promotionsController.getFlashSaleById);
router.put('/flash-sales/:saleId', verifyAdminToken, requirePermission('promotions', 'manage'), promotionsController.updateFlashSale);

module.exports = router;