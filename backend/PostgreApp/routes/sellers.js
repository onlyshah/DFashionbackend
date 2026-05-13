const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { auth, requireRole } = require('../middleware/auth');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuth');

// Admin routes (consolidated from sellersController → vendorController)
router.get('/', verifyAdminToken, requirePermission('sellers', 'view'), vendorController.getAllVendors);
router.get('/:sellerId', verifyAdminToken, requirePermission('sellers', 'view'), vendorController.getVendorById);
router.put('/:sellerId', verifyAdminToken, requirePermission('sellers', 'manage'), vendorController.updateVendor);
router.get('/:sellerId/profile', auth, vendorController.getVendorById);
router.post('/:sellerId/verify', verifyAdminToken, requirePermission('sellers', 'manage'), vendorController.approveVendor);
router.get('/:sellerId/products', auth, vendorController.getVendorProducts);
router.get('/:sellerId/stats', auth, vendorController.getVendorStats);

module.exports = router;