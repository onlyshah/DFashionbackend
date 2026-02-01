const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { auth, isVendor, requireRole } = require('../middleware/auth');

router.get('/dashboard/stats', auth, requireRole(['vendor', 'super_admin']), vendorController.getVendorDashboard);
router.get('/profile', auth, requireRole('vendor'), vendorController.getVendorProfile);
router.put('/profile', auth, requireRole('vendor'), vendorController.updateVendor);
router.get('/orders', auth, requireRole('vendor'), vendorController.getVendorOrders);
router.put('/orders/:orderId/status', auth, requireRole(['vendor', 'super_admin']), vendorController.updateVendor);
router.get('/products', auth, requireRole('vendor'), vendorController.getVendorProducts);
router.get('/earnings', auth, requireRole('vendor'), vendorController.getVendorEarnings);

module.exports = router;