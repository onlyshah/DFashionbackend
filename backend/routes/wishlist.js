const express = require('express');
const router = express.Router();
const { auth, requireRole, optionalAuth } = require('../middleware/auth');
const wishlistController = require('../controllers/wishlistController');

// ==================== WISHLIST ENDPOINTS ====================

// @route   GET /api/wishlist
// @desc    Get user's wishlist (with optional auth for empty response)
// @access  Public/Private
router.get('/', optionalAuth, wishlistController.getWishlist);

// @route   POST /api/wishlist/add
// @desc    Add product to wishlist
// @access  Private
router.post('/add', auth, wishlistController.addToWishlist);

// @route   DELETE /api/wishlist/remove/:itemId
// @desc    Remove product from wishlist
// @access  Private
router.delete('/remove/:itemId', auth, wishlistController.removeFromWishlist);

// @route   POST /api/wishlist/move-to-cart
// @desc    Move product from wishlist to cart
// @access  Private
router.post('/move-to-cart', auth, wishlistController.moveToCart);

// @route   POST /api/wishlist/like
// @desc    Like/favorite a product
// @access  Private
router.post('/like', auth, wishlistController.likeProduct);

module.exports = router;