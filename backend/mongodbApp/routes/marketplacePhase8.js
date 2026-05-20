/**
 * Marketplace Features Routes - Phase 8
 * Routes: /api/v1/marketplace
 */

const express = require('express');
const router = express.Router();
const marketplaceController = require('../controllers/marketplaceControllerPhase8');
const { verifyToken, verifyRole } = require('../middleware/auth');

/**
 * Public Routes
 */

// GET - Get marketplace statistics
router.get('/stats', marketplaceController.getMarketplaceStats);

// GET - Get featured vendors
router.get('/featured-vendors', marketplaceController.getFeaturedVendors);

/**
 * Protected Routes (Admin)
 */

// GET - Get marketplace metrics
router.get('/metrics', verifyToken, verifyRole(['admin', 'super_admin']), marketplaceController.getMarketplaceMetrics);

module.exports = router;
