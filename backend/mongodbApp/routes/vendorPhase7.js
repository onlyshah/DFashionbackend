/**
 * Vendor Management Routes - Phase 7
 * Routes: /api/v1/vendors
 */

const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorControllerPhase7');
const { verifyToken, verifyRole } = require('../middleware/auth');

/**
 * Public Routes
 */

// GET - Get vendor profile
router.get('/:vendorId', vendorController.getVendorProfile);

// GET - Get vendor products
router.get('/:vendorId/products', vendorController.getVendorProducts);

// GET - Get vendor analytics (public view)
router.get('/:vendorId/analytics', vendorController.getVendorAnalytics);

/**
 * Protected Routes (Vendor)
 */

// PATCH - Update vendor profile
router.patch('/profile', verifyToken, verifyRole(['vendor']), vendorController.updateVendorProfile);

// GET - Get vendor's own orders
router.get('/orders/list', verifyToken, verifyRole(['vendor']), vendorController.getVendorOrders);

// GET - Get vendor's payouts
router.get('/payouts/list', verifyToken, verifyRole(['vendor']), vendorController.getVendorPayouts);

// POST - Request payout
router.post('/payouts/request', verifyToken, verifyRole(['vendor']), vendorController.requestPayout);

module.exports = router;
