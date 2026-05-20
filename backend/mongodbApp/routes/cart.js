const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const cartController = require('../controllers/cartController');

// Cart management
router.get('/', auth, requireRole(['end_user', 'admin', 'super_admin']), cartController.getCart);
router.post('/', auth, requireRole(['end_user', 'admin', 'super_admin']), cartController.addToCart);
router.post('/add', auth, requireRole(['end_user', 'admin', 'super_admin']), cartController.addToCart);
router.put('/update/:itemId', auth, requireRole(['end_user', 'admin', 'super_admin']), cartController.updateCartItem);
router.delete('/remove', auth, requireRole(['end_user', 'admin', 'super_admin']), cartController.removeFromCart);
router.delete('/remove/:itemId', auth, requireRole(['end_user', 'admin', 'super_admin']), cartController.removeFromCart);
router.delete('/bulk-remove', auth, requireRole(['end_user', 'admin', 'super_admin']), cartController.bulkRemoveItems);
router.delete('/clear', auth, requireRole(['end_user', 'admin', 'super_admin']), cartController.clearCart);

// Cart features
router.get('/vendors', auth, requireRole(['end_user', 'admin', 'super_admin']), cartController.getCartByVendors);
router.post('/move-to-wishlist/:itemId', auth, requireRole(['end_user', 'admin', 'super_admin']), cartController.moveToWishlist);
router.post('/recalculate', auth, requireRole(['end_user', 'admin', 'super_admin']), cartController.recalculateCart);
router.get('/count', auth, requireRole(['end_user', 'admin', 'super_admin']), cartController.getCartItemCount);
router.get('/total-count', auth, requireRole(['end_user', 'admin', 'super_admin']), cartController.getCartTotalCount);
router.get('/debug', auth, requireRole(['end_user', 'admin', 'super_admin']), cartController.debugCart);

module.exports = router;
