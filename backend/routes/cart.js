const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const cartController = require('../controllers/cartController');

// Cart management
router.get('/', auth, requireRole(['end_user']), cartController.getCart);
router.post('/', auth, requireRole(['end_user']), cartController.addToCart);
router.post('/add', auth, requireRole(['end_user']), cartController.addToCart);
router.put('/update/:itemId', auth, requireRole(['end_user']), cartController.updateCartItem);
router.delete('/remove/:itemId', auth, requireRole(['end_user']), cartController.removeFromCart);
router.delete('/bulk-remove', auth, requireRole(['end_user']), cartController.bulkRemoveItems);
router.delete('/clear', auth, requireRole(['end_user']), cartController.clearCart);

// Cart features
router.get('/vendors', auth, requireRole(['end_user']), cartController.getCartByVendors);
router.post('/move-to-wishlist/:itemId', auth, requireRole(['end_user']), cartController.moveToWishlist);
router.post('/recalculate', auth, requireRole(['end_user']), cartController.recalculateCart);
router.get('/count', auth, requireRole(['end_user']), cartController.getCartItemCount);
router.get('/debug', auth, requireRole(['end_user']), cartController.debugCart);

module.exports = router;