const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { auth, optionalAuth, isApprovedVendor, allowResourceOwnerOrRoles } = require('../middleware/auth');

// Public routes
router.get('/trending', productController.getTrendingProducts);
router.get('/new-arrivals', productController.getNewArrivals);
router.get('/featured-brands', optionalAuth, productController.getFeaturedBrands);
router.get('/suggested', optionalAuth, productController.getSuggestedProducts);
router.get('/', optionalAuth, productController.getAllProducts);
router.get('/search/suggestions', optionalAuth, productController.getSearchSuggestions);
router.get('/search/trending', productController.getTrendingSearches);
router.get('/search/recent', auth, productController.getUserRecentSearches);
router.delete('/search/recent', auth, productController.clearSearchHistory);
router.post('/search/track', auth, productController.trackSearchInteraction);
router.get('/categories', productController.getCategories);
router.get('/filters', productController.getFilters);
router.get('/category/:slug', productController.getProductsByCategory);
router.get('/:id', optionalAuth, productController.getProductById);

// Admin/Vendor routes
router.post('/', auth, isApprovedVendor, productController.createProduct);
router.put('/:id', auth, allowResourceOwnerOrRoles('Product', 'id', 'vendor', ['admin', 'super_admin']), productController.updateProduct);
router.delete('/:id', auth, allowResourceOwnerOrRoles('Product', 'id', 'vendor', ['admin', 'super_admin']), isApprovedVendor, productController.deleteProduct);
router.post('/:id/review', auth, productController.addReview);

module.exports = router;