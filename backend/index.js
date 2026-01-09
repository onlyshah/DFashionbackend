// server.js
'use strict';

console.log('🚀 Starting DFashion Backend...');

const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

// Local modules
const socketService = require('./services/socketService');
const BasicSecurity = require('./middleware/basicSecurity');
const { connectDB } = require('./config/database');
const { connectPostgres } = require('./config/postgres');
const dataProvider = require('./services/dataProvider');

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
    if (!origin) return callback(null, true); // Postman / mobile / server-to-server

    if (
      allowedOrigins.includes(origin) ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }

    return callback(new Error('The CORS policy does not allow access from this origin.'), false);
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

app.use(cors(corsOptions)); // apply CORS globally

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

// -------- CORS preflight shortcut --------
app.options('*', (req, res) => {
  res.sendStatus(200);
});

// -------- Static file serving (centralized in backend) --------
const uploadsPath = path.join(__dirname, 'uploads');
const publicPath = path.join(__dirname, 'public');

// Middleware to set permissive CORS headers for static files (allows frontend to load images)
const setStaticFileHeaders = (res, filePath) => {
  // Use the incoming Origin header when present to avoid hardcoding a single origin
  const origin = (res && res.req && res.req.get && res.req.get('Origin')) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  // Allow cross-origin resource embedding for images used by the frontend (prevents NotSameOrigin blocking)
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  // Add cache control for better performance
  res.setHeader('Cache-Control', 'public, max-age=3600');
};

// Main upload directories with subdirectories
app.use('/uploads', express.static(uploadsPath, { setHeaders: setStaticFileHeaders }));
app.use('/assets', express.static(path.join(publicPath, 'assets'), { setHeaders: setStaticFileHeaders }));

// Ensure critical paths exist and are accessible
[
  path.join(uploadsPath, 'logo'),
  path.join(uploadsPath, 'faces'),
  path.join(uploadsPath, 'brands'),
  path.join(publicPath, 'assets', 'images', 'default')
].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// -------- Convenience redirects --------
app.get('/me', (req, res) => res.redirect(301, '/api/auth/me'));
app.get('/api/me', (req, res) => res.redirect(301, '/api/auth/me'));
app.post('/login', (req, res) => res.redirect(307, '/api/auth/login'));
app.post('/api/login', (req, res) => res.redirect(307, '/api/auth/login'));
app.post('/admin/login', (req, res) => res.redirect(307, '/api/auth/admin/login'));

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
    res.status(500).json({ success: false, message: 'Failed to seed database', error: error.message });
  }
});

// -------- Load models (informational) --------
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

// -------- Safe mount helper (keeps server resilient) --------
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

// -------- Mount specific route files (unique, no duplicates) --------
// Core auth - mount for both /api/auth and direct /admin paths
safeMount('/api/auth', './routes/auth');
safeMount('/admin', './routes/auth');

// Features & content
safeMount('/api/stories', './routes/stories');
safeMount('/api/posts', './routes/posts');
safeMount('/api/products', './routes/products');
safeMount('/api/users', './routes/users');
safeMount('/api/cart-new', './routes/cart');
 safeMount('/api/wishlist', './routes/wishlist');
safeMount('/api/orders', './routes/orders');
safeMount('/api/payments', './routes/payments');
safeMount('/api/checkout', './routes/checkout');
safeMount('/api/vendor', './routes/vendor');
safeMount('/api/notifications', './routes/notifications');

// Admin / role / modules
safeMount('/api/admin', './routes/admin'); // admin routes
safeMount('/api/role-management', './routes/roleManagement');
safeMount('/api/modules', './routes/moduleManagement');
safeMount('/api/vendor-verification', './routes/vendorVerification');

// Collections & search
safeMount('/api/product-comments', './routes/productComments');
safeMount('/api/product-shares', './routes/productShares');
 safeMount('/api/user', './routes/wishlist');
safeMount('/api/categories', './routes/categories');
safeMount('/api/brands', './routes/brands');
safeMount('/api/search', './routes/search');

// Analytics, recommendations & content
safeMount('/api/analytics', './routes/analytics');
safeMount('/api/analytics/overview', './routes/analyticsOverview');
safeMount('/api/recommendations', './routes/recommendations');
safeMount('/api/content', './routes/content');

// Rewards & style inspiration
safeMount('/api/rewards', './routes/rewardRoutes');
safeMount('/api/style-inspiration', './routes/styleInspiration');

// Smart collections & plugins
safeMount('/api/smart-collections', './routes/smartCollections');

// Live commerce & marketing
safeMount('/api/live', './routes/live');
safeMount('/api/marketing', './routes/marketing');

// Creators & influencers
safeMount('/api/creators', './routes/creators');

// Support tickets
safeMount('/api/support', './routes/support');

// Alerts & notifications
safeMount('/api/alerts', './routes/alerts');

// Returns management
safeMount('/api/returns', './routes/returns');

// -------- Mount the aggregated /api index as a fallback (last) --------
// This provides catch-all aggregated routes and is mounted last to avoid shadowing specific routes.
try {
  const apiIndex = require('./routes/index');
  app.use('/api', apiIndex);
  console.log('✅ /api -> ./routes/index mounted as fallback');
} catch (err) {
  console.error('❌ Failed to mount /api index:', err.message);
}

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
    // Initialize databases based on DB_TYPE env var
    // Accept values like 'postgres', 'postgres_only', 'mongo', 'both'
    const dbType = (process.env.DB_TYPE || 'postgres').toLowerCase();

    if (dbType.includes('postgres')) {
      try {
        console.log('🔌 Attempting to connect to PostgreSQL...');
        await connectPostgres();
        // Mark DB available for metrics
        dataProvider.enableDb();
      } catch (err) {
        console.error('⚠️  PostgreSQL connection failed:', err.message);
        if (dbType.includes('postgres') && !dbType.includes('both')) {
          // If Postgres is required and fails, fail startup
          throw err;
        }
        // If both databases are enabled, continue with MongoDB
      }
    }

    if (dbType.includes('mongo')) {
      try {
        console.log('🔌 Attempting to connect to MongoDB...');
        await connectDB();
        // Mark DB available for metrics
        dataProvider.enableDb();
      } catch (err) {
        console.error('⚠️  MongoDB connection failed:', err.message);
        if (dbType.includes('mongo') && !dbType.includes('both')) {
          // If Mongo is required and fails, fail startup
          throw err;
        }
        // If both databases are enabled, continue with Postgres
      }
    } else {
      console.log('ℹ️ Skipping MongoDB connection (DB_TYPE=' + dbType + ')');
    }

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
        mongoose.connection.close(false);
        console.log('MongoDB connection closed.');
        process.exit(0);
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
