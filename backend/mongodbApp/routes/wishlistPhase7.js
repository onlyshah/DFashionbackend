/**
 * Wishlist Routes - Phase 7
 * Routes: /api/v1/wishlist
 */

const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistControllerPhase7');
const { verifyToken } = require('../middleware/auth');

/**
 * Public Routes
 */

/**
 * Protected Routes (User)
 */
router.use(verifyToken);

// GET - Retrieve user's wishlist
router.get('/', wishlistController.getWishlist);

// POST - Add product to wishlist
router.post('/', wishlistController.addToWishlist);

// DELETE - Remove product from wishlist
router.delete('/:wishlistItemId', wishlistController.removeFromWishlist);

// DELETE - Clear entire wishlist
router.delete('/', wishlistController.clearWishlist);

// POST - Share wishlist
router.post('/share', wishlistController.shareWishlist);

module.exports = router;
