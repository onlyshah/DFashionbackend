/**
 * Cart Routes - Phase 3
 * 6 endpoints for shopping cart management
 */

const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartControllerPhase3');
const { verifyToken } = require('../middleware/auth');

// All cart endpoints require authentication
router.get('/', verifyToken, cartController.getCart);
router.post('/add', verifyToken, cartController.addToCart);
router.put('/item/:itemId', verifyToken, cartController.updateCartItem);
router.delete('/item/:itemId', verifyToken, cartController.removeFromCart);
router.delete('/', verifyToken, cartController.clearCart);
router.get('/total', verifyToken, cartController.getCartTotal);

module.exports = router;
