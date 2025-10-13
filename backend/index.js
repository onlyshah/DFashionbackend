// server.js
'use strict';

console.log('🚀 Starting DFashion Backend...');

const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();

// Local modules
const socketService = require('./services/socketService');
const BasicSecurity = require('./middleware/basicSecurity');
const { connectDB } = require('./config/database');

// -------- Basic sanity checks --------
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('❌ JWT_SECRET missing in production environment. Aborting startup.');
  process.exit(1);
}
console.log('🔐 JWT_SECRET loaded:', !!process.env.JWT_SECRET);

// -------- App setup --------
const app = express();
app.set('trust proxy', 1); // if behind proxy/load balancer

// -------- Allowed origins --------
const allowedOrigins = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://localhost:8100',
  'http://127.0.0.1:8100',
  'http://localhost:3000',
  'http://localhost:5000',
  'capacitor://localhost',
  'ionic://localhost',
  'https://onlyshah.github.io'
];

// -------- CORS --------
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Postman / mobile

    if (
      allowedOrigins.includes(origin) ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }

    return callback(
      new Error('The CORS policy does not allow access from this origin.'),
      false
    );
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'X-CSRF-Token',
    'X-Request-ID'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Request-ID'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions)); // global CORS

// -------- Request body parsing --------
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// -------- Basic security middleware --------
console.log('🔒 Applying basic security middleware...');
app.use(BasicSecurity.securityHeaders);
app.use(BasicSecurity.helmet);
app.use(BasicSecurity.requestLogger);
app.use(BasicSecurity.sanitizeInput);
app.use(BasicSecurity.validateInput);

// Rate limiting (applied per route group)
app.use('/api/auth', BasicSecurity.authLimiter);
app.use('/api', BasicSecurity.generalLimiter);

console.log('✅ Basic security middleware applied successfully');

// -------- CORS preflight --------
app.options('*', (req, res) => {
  res.sendStatus(200);
});

// -------- Static file serving (uploads) --------
const uploadsPath = path.join(__dirname, 'uploads');

app.use(
  '/uploads',
  express.static(uploadsPath, {
    setHeaders: (res, filePath) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
  })
);
// Ensure /uploads/brands is accessible
app.use('/uploads/brands', express.static(path.join(uploadsPath, 'brands')));

// -------- Convenience redirects --------
app.get('/me', (req, res) => res.redirect(301, '/api/auth/me'));
app.get('/api/me', (req, res) => res.redirect(301, '/api/auth/me'));
app.post('/login', (req, res) => res.redirect(307, '/api/auth/login'));
app.post('/api/login', (req, res) => res.redirect(307, '/api/auth/login'));

// -------- Utility endpoints --------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'DFashion API Server Running',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'DFashion Backend is running. Use /api/health for status.'
  });
});

app.get('/api/csrf-token', (req, res) => {
  res.json({
    success: true,
    token: Date.now().toString(36) + Math.random().toString(36).slice(2),
    message: 'CSRF token generated'
  });
});

app.get('/api/collections', (req, res) => {
  res.json({
    success: true,
    message: 'Collections endpoint working',
    database: mongoose.connection.name || 'dfashion',
    expectedCollections: [
      'users',
      'products',
      'categories',
      'posts',
      'stories',
      'roles',
      'orders'
    ],
    note: 'Collections should be populated after running seeder'
  });
});

app.post('/api/seed', async (req, res) => {
  try {
    console.log('🌱 Starting database seeding...');
    const { seedDatabase } = require('./scripts/masterSeed');
    await seedDatabase();
    res.json({
      success: true,
      message: 'Database seeded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Seeding error:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to seed database', error: error.message });
  }
});

// -------- Load models --------
try {
  require('./models/User');
  console.log('✅ User model loaded');
  require('./models/Product');
  console.log('✅ Product model loaded');
  require('./models/Order');
  console.log('✅ Order model loaded');
} catch (err) {
  console.warn('⚠️ Some models could not be loaded during startup:', err.message);
}

// -------- Load routes safely --------
const safeMount = (mountPath, routePath) => {
  try {
    const resolvedPath = require.resolve(routePath, { paths: [__dirname] });
    console.log(`[safeMount] Attempting to mount ${mountPath} from ${resolvedPath}`);
    const router = require(resolvedPath);
    if (router && router.stack && router.stack.length > 0) {
      console.log(`[safeMount] Router for ${mountPath} has ${router.stack.length} routes.`);
    } else {
      console.warn(`[safeMount] Router for ${mountPath} appears empty or invalid.`);
    }
    app.use(mountPath, router);
    console.log(`✅ ${mountPath} -> ${routePath} loaded`);
  } catch (err) {
    console.error(`❌ Error loading ${mountPath} from ${routePath}:`, err.message);
  }
};

// Core routes
safeMount('/api/auth', './routes/auth');
// Fix: Mount missing core API routes for stories, posts, products, users
safeMount('/api/stories', './routes/stories');
safeMount('/api/posts', './routes/posts');
safeMount('/api/products', './routes/products');
safeMount('/api/users', './routes/users');
safeMount('/api/cart-new', './routes/cartNew');
safeMount('/api/cart-new', './routes/cartNew');
safeMount('/api/wishlist-new', './routes/wishlistNew');
safeMount('/api/wishlist-new', './routes/wishlistNew');
safeMount('/api/wishlist', './routes/wishlistNew');
safeMount('/api/orders', './routes/orders');
safeMount('/api/payments', './routes/payments');
safeMount('/api/checkout', './routes/checkout');
safeMount('/api/admin', './routes/admin');
safeMount('/api/vendor', './routes/vendor');
safeMount('/api/notifications', './routes/notifications');
safeMount('/api/admin/auth', './routes/adminAuth');
safeMount('/api/auth/admin', './routes/adminAuth');
safeMount('/api/admin/dashboard', './routes/adminDashboard');
safeMount('/api/product-comments', './routes/productComments');
safeMount('/api/product-shares', './routes/productShares');
safeMount('/api/ecommerce', './routes/ecommerceAPI');
safeMount('/api/user', './routes/userWishlistCart');
safeMount('/api/categories', './routes/categories');
safeMount('/api/categories', './routes/categories');
safeMount('/api/brands', './routes/brands');
safeMount('/api/analytics', './routes/analytics');
safeMount('/api/analytics', './routes/analytics');
safeMount('/api/recommendations', './routes/recommendations');
safeMount('/api/recommendations', './routes/recommendations');
safeMount('/api/content', './routes/content');
safeMount('/api/rewards', './routes/rewardRoutes');
safeMount('/api/rewards', './routes/rewardRoutes');
safeMount('/api/search', './routes/search');
safeMount('/', './routes/index');
safeMount('/api/role-management', './routes/roleManagement');
safeMount('/api/modules', './routes/moduleManagement');
safeMount('/api/vendor-verification', './routes/vendorVerification');
safeMount('/api/smart-collections', './routes/smartCollections');

// Integrate new analytics overview and style inspiration routes
safeMount('/api/analytics/overview', './routes/analyticsOverview');
safeMount('/api/style-inspiration', './routes/styleInspiration');

// -------- Error handling --------
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err && err.stack ? err.stack : err);
  const status = err && err.status ? err.status : 500;
  res.status(status).json({
    success: false,
    message: err && err.message ? err.message : 'Something went wrong',
    error:
      process.env.NODE_ENV === 'development'
        ? err && err.stack
          ? err.stack
          : err
        : {}
  });
});

// catch unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// -------- Start server --------
const startServer = async () => {
  try {
    console.log('🔌 Attempting to connect to MongoDB...');
    await connectDB();

    const PORT = process.env.PORT || 9000;
    const server = http.createServer(app);

    // Initialize Socket.IO
    socketService.initialize(server);

    server.listen(PORT, '0.0.0.0', () => {
      console.log('========================================');
      console.log('🚀 DFashion Backend Server Running!');
      console.log('========================================');
      console.log(`📡 Server: http://localhost:${PORT}`);
      console.log(`📱 Mobile Access: http://10.0.2.2:${PORT}`);
      console.log(`🔌 Socket.IO: Real-time notifications enabled`);
      console.log(`🛡️ Admin Dashboard: http://localhost:4200/admin`);
      console.log(`🌐 Health Check: http://localhost:${PORT}/api/health`);
      console.log(
        `📊 Database: ${
          mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'
        }`
      );
      console.log('========================================');
    });

    const shutdown = async (signal) => {
      console.log(`\n⚠️  Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        mongoose.connection.close(false, () => {
          console.log('MongoDB connection closed.');
          process.exit(0);
        });
      });

      setTimeout(() => {
        console.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('❌ Failed to start server:', error && error.stack ? error.stack : error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
