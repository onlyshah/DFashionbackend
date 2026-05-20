/**
 * Product Routes - Phase 3
 * 18 endpoints for product management
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productControllerPhase3');
const { verifyToken, optionalAuth } = require('../middleware/auth');

// Public endpoints
router.get('/', optionalAuth, productController.getAllProducts);
router.get('/id/:id', optionalAuth, productController.getProductById);
router.get('/category/:categoryId', optionalAuth, productController.getProductsByCategory);
router.get('/trending', optionalAuth, productController.getTrendingProducts);
router.get('/new-arrivals', optionalAuth, productController.getNewArrivals);
router.get('/featured', optionalAuth, productController.getFeaturedProducts);
router.get('/search', optionalAuth, productController.searchProducts);
router.get('/suggestions', productController.getSearchSuggestions);
router.get('/trending-searches', productController.getTrendingSearches);
router.get('/filters', productController.getFilters);
router.get('/categories', productController.getCategories);

// Reviews
router.post('/:productId/reviews', verifyToken, productController.addReview);
router.get('/:productId/reviews', productController.getReviews);

// Protected endpoints (Vendor/Admin)
router.post('/', verifyToken, productController.createProduct);
router.put('/:id', verifyToken, productController.updateProduct);
router.delete('/:id', verifyToken, productController.deleteProduct);

// Track searches
router.post('/search/track', optionalAuth, productController.trackSearchInteraction);
router.get('/search/recent', verifyToken, productController.getUserRecentSearches);

module.exports = router;
