const express = require('express');
const router = express.Router();
const ecommerceAPIController = require('../controllers/ecommerceAPIController');
const { auth, optionalAuth } = require('../middleware/auth');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuth');

// Product endpoints
router.post('/products/:id/like', auth, ecommerceAPIController.likeProduct);
router.get('/products/:id/similar', ecommerceAPIController.getSimilarProducts);
router.get('/trending', ecommerceAPIController.getTrendingProducts);
router.get('/recommendations', optionalAuth, ecommerceAPIController.getRecommendations);
router.post('/bulk-operations', auth, ecommerceAPIController.bulkOperations);

// Wishlist endpoints
router.post('/wishlist/items/:itemId/like', auth, ecommerceAPIController.likeWishlistItem);
router.post('/wishlist/items/:itemId/comment', auth, ecommerceAPIController.commentOnWishlistItem);
router.delete('/wishlist/items/:itemId/comments/:commentId', auth, ecommerceAPIController.deleteWishlistItemComment);

// Cart save endpoints
router.post('/cart/items/:itemId/save-for-later', auth, ecommerceAPIController.saveForLater);
router.post('/cart/saved/:itemId/move-to-cart', auth, ecommerceAPIController.moveFromSavedToCart);
router.delete('/cart/saved/:itemId', auth, ecommerceAPIController.deleteSavedItem);

// Admin endpoints
router.delete('/admin/products/:id', verifyAdminToken, requirePermission('products', 'delete'), ecommerceAPIController.deleteAdminProduct);
router.get('/admin/analytics', verifyAdminToken, requirePermission('analytics', 'view'), ecommerceAPIController.getAdminAnalytics);

module.exports = router;