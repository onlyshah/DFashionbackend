const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth'); // use your new merged version
const adminRoutes = require('./admin');
const vendorRoutes = require('./vendor');
const productRoutes = require('./products');
const orderRoutes = require('./orders');
const userRoutes = require('./users');
const uploadRoutes = require('./upload');
const searchRoutes = require('./search');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'DFashion API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mount core routes
router.use(`/auth`, authRoutes);      // ✅ covers both /auth/... and /admin/auth/... from authCombined.js
router.use(`/vendor`, vendorRoutes);
router.use(`/products`, productRoutes);
router.use(`/orders`, orderRoutes);
router.use(`/users`, userRoutes);
router.use(`/upload`, uploadRoutes);
router.use(`/search`, searchRoutes);

// Import additional routes
const cartRoutes = require('./cart');
const wishlistRoutes = require('./wishlist');
const postRoutes = require('./posts');
const storyRoutes = require('./stories');
const cartNewRoutes = require('./cartNew');
const wishlistNewRoutes = require('./wishlistNew');
const paymentRoutes = require('./payments');
const checkoutRoutes = require('./checkout');
const notificationRoutes = require('./notifications');
const productCommentsRoutes = require('./productComments');
const productSharesRoutes = require('./productShares');
const ecommerceAPIRoutes = require('./ecommerceAPI');
const userWishlistCartRoutes = require('./userWishlistCart');
const categoriesRoutes = require('./categories');
const brandsRoutes = require('./brands');
const analyticsRoutes = require('./analytics');
const recommendationsRoutes = require('./recommendations');

// Mount additional routes
router.use(`/cart`, cartRoutes);
router.use(`/wishlist`, wishlistRoutes);
router.use(`/posts`, postRoutes);
router.use(`/stories`, storyRoutes);
router.use(`/cart-new`, cartNewRoutes);
router.use(`/wishlist-new`, wishlistNewRoutes);
router.use(`/payments`, paymentRoutes);
router.use(`/checkout`, checkoutRoutes);
router.use(`/notifications`, notificationRoutes);
router.use(`/product-comments`, productCommentsRoutes);
router.use(`/product-shares`, productSharesRoutes);
router.use(`/ecommerce`, ecommerceAPIRoutes);
router.use(`/user`, userWishlistCartRoutes);
router.use(`/categories`, categoriesRoutes);
router.use(`/brands`, brandsRoutes);
router.use(`/analytics`, analyticsRoutes);
router.use(`/recommendations`, recommendationsRoutes);

// Mount admin routes (keep at the end)
router.use(`/admin`, adminRoutes);

// 404 fallback
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

module.exports = router;
