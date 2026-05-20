/**
 * Search & Recommendations Routes - Phase 8
 * Routes: /api/v1/search
 */

const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchRecommendationsControllerPhase8');
const { verifyToken, optionalAuth } = require('../middleware/auth');

/**
 * Public Routes
 */

// GET - Search products
router.get('/products', searchController.searchProducts);

// GET - Search users
router.get('/users', searchController.searchUsers);

// GET - Search posts
router.get('/posts', searchController.searchPosts);

// GET - Trending products
router.get('/trending/products', searchController.getTrendingProducts);

// GET - Trending hashtags
router.get('/trending/hashtags', searchController.getTrendingHashtags);

// GET - Similar products
router.get('/similar/:productId', searchController.getSimilarProducts);

// GET - Popular posts
router.get('/popular/posts', searchController.getPopularPosts);

/**
 * Protected Routes (User)
 */

router.use(verifyToken);

// GET - Get recommendations
router.get('/recommendations/products', searchController.getRecommendedProducts);

// GET - Get recommended users
router.get('/recommendations/users', searchController.getRecommendedUsers);

// GET - Get search history
router.get('/history', searchController.getSearchHistory);

// POST - Save search
router.post('/save', searchController.saveSearch);

// DELETE - Delete search
router.delete('/history/:searchId', searchController.deleteSearch);

module.exports = router;
