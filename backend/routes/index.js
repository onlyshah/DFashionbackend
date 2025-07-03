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
const API_VERSION = '/api/v1';

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
        'POST /api/v1/auth/admin/login': 'Admin login',
        'POST /api/v1/auth/customer/login': 'Customer login',
        'POST /api/v1/auth/customer/register': 'Customer registration',
        'POST /api/v1/auth/logout': 'Logout',
        'GET /api/v1/auth/verify': 'Verify token'
      },
      admin: {
        'GET /api/v1/admin/dashboard': 'Admin dashboard stats',
        'GET /api/v1/admin/users': 'Get all users',
        'POST /api/v1/admin/users': 'Create admin user',
        'PUT /api/v1/admin/users/:id': 'Update user',
        'DELETE /api/v1/admin/users/:id': 'Delete user',
        'GET /api/v1/admin/orders': 'Get all orders',
        'PUT /api/v1/admin/orders/:id/status': 'Update order status'
      },
      products: {
        'GET /api/v1/products': 'Get all products',
        'GET /api/v1/products/:id': 'Get product by ID',
        'POST /api/v1/products': 'Create product',
        'PUT /api/v1/products/:id': 'Update product',
        'DELETE /api/v1/products/:id': 'Delete product'
      },
      orders: {
        'GET /api/v1/orders': 'Get user orders',
        'GET /api/v1/orders/:id': 'Get order by ID',
        'POST /api/v1/orders': 'Create order',
        'PUT /api/v1/orders/:id/cancel': 'Cancel order'
      },
      users: {
        'GET /api/v1/users/profile': 'Get user profile',
        'PUT /api/v1/users/profile': 'Update user profile',
        'POST /api/v1/users/change-password': 'Change password'
      },
      upload: {
        'POST /api/v1/upload/image': 'Upload image',
        'POST /api/v1/upload/multiple': 'Upload multiple images'
      },
      cart: {
        'GET /api/v1/cart': 'Get user cart',
        'POST /api/v1/cart': 'Add item to cart',
        'PUT /api/v1/cart/:itemId': 'Update cart item',
        'DELETE /api/v1/cart/:itemId': 'Remove item from cart',
        'DELETE /api/v1/cart': 'Clear cart'
      },
      wishlist: {
        'GET /api/v1/wishlist': 'Get user wishlist',
        'POST /api/v1/wishlist': 'Add item to wishlist',
        'DELETE /api/v1/wishlist/:productId': 'Remove item from wishlist',
        'DELETE /api/v1/wishlist': 'Clear wishlist',
        'POST /api/v1/wishlist/move-to-cart/:productId': 'Move item to cart'
      }
    }
  });
});

// Mount route modules
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/admin`, adminRoutes);
router.use(`${API_VERSION}/vendor`, vendorRoutes);
router.use(`${API_VERSION}/products`, productRoutes);
router.use(`${API_VERSION}/orders`, orderRoutes);
router.use(`${API_VERSION}/users`, userRoutes);
router.use(`${API_VERSION}/user`, userRoutes); // Additional mounting for /user endpoints
router.use(`${API_VERSION}/upload`, uploadRoutes);
router.use(`${API_VERSION}/search`, searchRoutes);

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
router.use(`${API_VERSION}/cart`, cartRoutes);
router.use(`${API_VERSION}/wishlist`, wishlistRoutes);
router.use(`${API_VERSION}/posts`, postRoutes);
router.use(`${API_VERSION}/stories`, storyRoutes);
router.use(`${API_VERSION}/cart-new`, cartNewRoutes);
router.use(`${API_VERSION}/wishlist-new`, wishlistNewRoutes);
router.use(`${API_VERSION}/payments`, paymentRoutes);
router.use(`${API_VERSION}/checkout`, checkoutRoutes);
router.use(`${API_VERSION}/notifications`, notificationRoutes);
router.use(`${API_VERSION}/admin/auth`, adminAuthRoutes);
router.use(`${API_VERSION}/admin/dashboard`, adminDashboardRoutes);
router.use(`${API_VERSION}/product-comments`, productCommentsRoutes);
router.use(`${API_VERSION}/product-shares`, productSharesRoutes);
router.use(`${API_VERSION}/ecommerce`, ecommerceAPIRoutes);
router.use(`${API_VERSION}/user`, userWishlistCartRoutes);
router.use(`${API_VERSION}/categories`, categoriesRoutes);
router.use(`${API_VERSION}/brands`, brandsRoutes);
router.use(`${API_VERSION}/analytics`, analyticsRoutes);
router.use(`${API_VERSION}/recommendations`, recommendationsRoutes);

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /docs',
      'POST /api/v1/auth/admin/login',
      'POST /api/v1/auth/customer/login',
      'GET /api/v1/products',
      'GET /api/v1/admin/dashboard'
    ]
  });
});

module.exports = router;
