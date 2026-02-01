const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auth, optionalAuth } = require('../middleware/auth');
const searchController = require('../controllers/searchController');

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// @route   GET /api/search
// @desc    Advanced product search with filters and analytics
// @access  Public
router.get('/', optionalAuth, searchController.searchProducts);

// @route   GET /api/search/suggestions
// @desc    Get search suggestions and autocomplete
// @access  Public
router.get('/suggestions', optionalAuth, searchController.getSearchSuggestions);

// @route   GET /api/search/trending
// @desc    Get trending searches
// @access  Public
router.get('/trending', searchController.getTrendingSearches);

// @route   GET /api/search/history
// @desc    Get user's search history
// @access  Private
router.get('/history', auth, searchController.getSearchHistory);

// @route   DELETE /api/search/history
// @desc    Clear user's search history
// @access  Private
router.delete('/history', auth, searchController.clearSearchHistory);

// @route   POST /api/search/track
// @desc    Track search interactions and analytics
// @access  Private
router.post('/track', auth, searchController.trackSearchInteraction);

// @route   GET /api/search/analytics
// @desc    Get search analytics for admin/vendor dashboard
// @access  Private (Admin/Vendor)
router.get('/analytics', auth, searchController.getSearchAnalytics);

// @route   POST /api/search/visual
// @desc    Visual search using image upload
// @access  Public
router.post('/visual', upload.single('image'), searchController.visualSearch);

// @route   GET /api/search/barcode
// @desc    Search by barcode/QR code
// @access  Public
router.get('/barcode', searchController.searchByBarcode);

// @route   GET /api/search/similar
// @desc    Find similar products
// @access  Public
router.get('/similar', searchController.getSimilarProducts);

// @route   GET /api/search/smart-suggestions
// @desc    Get AI-powered smart search suggestions
// @access  Public
router.get('/smart-suggestions', optionalAuth, searchController.getSmartSuggestions);

// @route   GET /api/search/personalized
// @desc    Get personalized search recommendations
// @access  Private
router.get('/personalized', auth, searchController.getPersonalizedRecommendations);

// @route   GET /api/search/insights
// @desc    Get search analytics and insights
// @access  Private
router.get('/insights', auth, searchController.getUserSearchInsights);

module.exports = router;