const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const vendorRoutes = require('./vendor');
const productRoutes = require('./products');
const orderRoutes = require('./orders');
const userRoutes = require('./users');
const uploadRoutes = require('./upload');
const searchRoutes = require('./search');

// API version prefix
//const API_VERSION = '/api/';

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

// Database status endpoint
router.get('/db-status', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const collections = await mongoose.connection.db.listCollections().toArray();

    const status = {
      success: true,
      message: 'Database status',
      database: mongoose.connection.name,
      collections: {}
    };

    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      status.collections[collection.name] = count;
    }

    res.json(status);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database error',
      error: error.message
    });
  }
});

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    message: 'DFashion API Documentation',
    version: '1.0.0',
    endpoints: {
      authentication: {
        'POST /api/auth/admin/login': 'Admin login',
        'POST /api/auth/customer/login': 'Customer login',
        'POST /api/auth/customer/register': 'Customer registration',
        'POST /api/auth/logout': 'Logout',
        'GET /api/auth/verify': 'Verify token'
      },
      admin: {
        'GET /api/admin/dashboard': 'Admin dashboard stats',
        'GET /api/admin/users': 'Get all users',
        'POST /api/admin/users': 'Create admin user',
        'PUT /api/admin/users/:id': 'Update user',
        'DELETE /api/admin/users/:id': 'Delete user',
        'GET /api/admin/orders': 'Get all orders',
        'PUT /api/admin/orders/:id/status': 'Update order status'
      },
      products: {
        'GET /api/products': 'Get all products',
        'GET /api/products/:id': 'Get product by ID',
        'POST /api/products': 'Create product',
        'PUT /api/products/:id': 'Update product',
        'DELETE /api/products/:id': 'Delete product'
      },
      orders: {
        'GET /api/orders': 'Get user orders',
        'GET /api/orders/:id': 'Get order by ID',
        'POST /api/orders': 'Create order',
        'PUT /api/orders/:id/cancel': 'Cancel order'
      },
      users: {
        'GET /api/users/profile': 'Get user profile',
        'PUT /api/users/profile': 'Update user profile',
        'POST /api/users/change-password': 'Change password'
      },
      upload: {
        'POST /api/upload/image': 'Upload image',
        'POST /api/upload/multiple': 'Upload multiple images'
      },
      cart: {
        'GET /api/cart': 'Get user cart',
        'POST /api/cart': 'Add item to cart',
        'PUT /api/cart/:itemId': 'Update cart item',
        'DELETE /api/cart/:itemId': 'Remove item from cart',
        'DELETE /api/cart': 'Clear cart'
      },
      wishlist: {
        'GET /api/wishlist': 'Get user wishlist',
        'POST /api/wishlist': 'Add item to wishlist',
        'DELETE /api/wishlist/:productId': 'Remove item from wishlist',
        'DELETE /api/wishlist': 'Clear wishlist',
        'POST /api/wishlist/move-to-cart/:productId': 'Move item to cart'
      }
    }
  });
});

// Mount route modules
router.use(`/auth`, authRoutes);
router.use(`/admin`, adminRoutes);
router.use(`/vendor`, vendorRoutes);
router.use(`/products`, productRoutes);
router.use(`/orders`, orderRoutes);
router.use(`/users`, userRoutes);
router.use(`/user`, userRoutes); // Additional mounting for /user endpoints
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
const adminAuthRoutes = require('./adminAuth');
const adminDashboardRoutes = require('./adminDashboard');
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
router.use(`/admin/auth`, adminAuthRoutes);
router.use(`/admin/dashboard`, adminDashboardRoutes);
router.use(`/product-comments`, productCommentsRoutes);
router.use(`/product-shares`, productSharesRoutes);
router.use(`/ecommerce`, ecommerceAPIRoutes);
router.use(`/user`, userWishlistCartRoutes);
router.use(`/categories`, categoriesRoutes);
router.use(`/brands`, brandsRoutes);
router.use(`/analytics`, analyticsRoutes);
router.use(`/recommendations`, recommendationsRoutes);

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /docs',
      'POST /api/auth/admin/login',
      'POST /api/auth/customer/login',
      'GET /api/products',
      'GET /api/admin/dashboard'
    ]
  });
});

module.exports = router;
