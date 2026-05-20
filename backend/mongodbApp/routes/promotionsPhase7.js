/**
 * Promotions Routes - Phase 7
 * Routes: /api/v1/promotions
 */

const express = require('express');
const router = express.Router();
const promotionsController = require('../controllers/promotionsControllerPhase7');
const { verifyToken, verifyRole } = require('../middleware/auth');

/**
 * Public Routes
 */

// GET - List all promotions
router.get('/', promotionsController.getAllPromotions);

// GET - Get single promotion
router.get('/:promoId', promotionsController.getPromotion);

// GET - Get active promotions
router.get('/active/list', promotionsController.getActivePromotions);

// POST - Validate promo code (without applying)
router.post('/validate-code', promotionsController.validatePromoCode);

/**
 * Protected Routes (User)
 */

// POST - Apply promo code to order
router.post('/apply-code', verifyToken, promotionsController.applyPromoCode);

/**
 * Protected Routes (Admin)
 */

// POST - Create promotion
router.post('/', verifyToken, verifyRole(['admin', 'super_admin']), promotionsController.createPromotion);

// PATCH - Update promotion
router.patch('/:promoId', verifyToken, verifyRole(['admin', 'super_admin']), promotionsController.updatePromotion);

// DELETE - Delete promotion
router.delete('/:promoId', verifyToken, verifyRole(['admin', 'super_admin']), promotionsController.deletePromotion);

module.exports = router;
