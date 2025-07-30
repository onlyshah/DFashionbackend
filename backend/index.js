console.log('🚀 Starting DFashion Backend...');

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const http = require('http');
const socketService = require('./services/socketService');
// Use basic security middleware (no external dependencies)
const BasicSecurity = require('./middleware/basicSecurity');
// Comment out advanced security for now
// const security = require('./middleware/security');
// const ValidationService = require('./services/validationService');
// const csrfService = require('./services/csrfService');
require('dotenv').config();

// Verify JWT_SECRET is loaded
console.log('🔐 JWT_SECRET loaded:', !!process.env.JWT_SECRET);
if (!process.env.JWT_SECRET) {
    console.warn('⚠️  WARNING: JWT_SECRET not found in environment variables!');
    console.warn('⚠️  Using fallback secret for development/testing');
    console.warn('⚠️  Please set JWT_SECRET in production!');
    process.env.JWT_SECRET = 'fallback-development-secret-key-not-for-production';
}

console.log('✅ All modules loaded successfully');

const app = express();

// Import database configuration
const { connectDB } = require('./config/database');

// Basic Security Middleware (Applied First)
console.log('🔒 Applying basic security middleware...');

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Basic security headers
app.use(BasicSecurity.securityHeaders);

// Helmet for additional security headers
app.use(BasicSecurity.helmet);

// Request logging
app.use(BasicSecurity.requestLogger);

// Rate limiting
app.use('/api/auth', BasicSecurity.authLimiter);
app.use('/api', BasicSecurity.generalLimiter);

// CORS configuration - Production ready
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:4200',      // Angular dev server
            'http://localhost:8100',      // Ionic dev server
            'http://127.0.0.1:4200',      // Alternative localhost
            'http://127.0.0.1:8100',      // Alternative localhost
            'http://localhost:3000',      // React dev server (if needed)
            'http://localhost:5000',      // Additional dev server
            'capacitor://localhost',      // Capacitor apps
            'ionic://localhost',          // Ionic apps
            'https://onlyshah.github.io'  // Production domain
        ];

        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }

        // Allow file:// protocol for local HTML files
        if (origin.startsWith('file://')) {
            return callback(null, true);
        }

        // Check if the origin is in the allowed list
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Allow any localhost origin for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }

        // Allow any IP address for mobile development
        if (/^http:\/\/\d+\.\d+\.\d+\.\d+/.test(origin)) {
            return callback(null, true);
        }

        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
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
    optionsSuccessStatus: 200, // For legacy browser support
    preflightContinue: false
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Basic input sanitization
app.use(BasicSecurity.sanitizeInput);

// Custom input validation
app.use(BasicSecurity.validateInput);

console.log('✅ Basic security middleware applied successfully');

// Enhanced CORS headers for preflight requests
app.use((req, res, next) => {
    const origin = req.headers.origin;

    // Set CORS headers for all responses
    if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, X-CSRF-Token, X-Request-ID');
    res.header('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range, X-Request-ID');

    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    } else {
        next();
    }
});

// Static file serving
app.use('/uploads', express.static('uploads'));

// Basic Security Routes
console.log('🔒 Setting up basic security routes...');

// Basic CSRF token endpoint (simplified)
app.get('/api/csrf-token', (req, res) => {
  res.json({
    success: true,
    token: Date.now().toString(36) + Math.random().toString(36).substr(2),
    message: 'CSRF token generated'
  });
});

// Security status endpoint
app.get('/api/security/status', (req, res) => {
  res.json({
    success: true,
    security: {
      status: 'active',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// CSP violation reporting endpoint
app.post('/api/security/csp-violation', (req, res) => {
  console.warn('CSP Violation Report:', req.body);
  res.status(204).send();
});

console.log('✅ Basic security routes configured');

// Load models
let User, Product, Order;
try {
    User = require('./models/User');
    console.log('✅ User model loaded');
    Product = require('./models/Product');
    console.log('✅ Product model loaded');
    Order = require('./models/Order');
    console.log('✅ Order model loaded');
} catch (error) {
    console.log('⚠️ Models not available, using mock data');
}

// Load middleware
try {
    const { auth } = require('./middleware/auth');
    console.log('✅ Middleware loaded successfully');
} catch (error) {
    console.log('⚠️ Middleware not available');
}

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'DFashion API is working!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Seeding endpoint
app.post('/api/seed', async (req, res) => {
    try {
        console.log('🌱 Starting database seeding...');
        
        // Import and run seeder
        const seedDatabase = require('./scripts/seedRealData');
        await seedDatabase();
        
        res.json({
            success: true,
            message: 'Database seeded successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Seeding error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to seed database',
            error: error.message
        });
    }
});

// API Routes with error handling
try {
    console.log('🔄 Attempting to load auth routes...');
    const authRoutes = require('./routes/auth');
    console.log('✅ Auth routes file loaded successfully');
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes mounted successfully');
} catch (error) {
    console.error('❌ Error loading auth routes:', error.message);
    console.error('❌ Full error:', error);
}

try {
    app.use('/api/users', require('./routes/users'));
    app.use('/api/v1/users', require('./routes/users')); // Add v1 prefix
    app.use('/api/v1/user', require('./routes/users')); // Add v1 prefix for /user endpoint
    console.log('✅ Users routes loaded');
} catch (error) {
    console.error('❌ Error loading users routes:', error.message);
}

try {
    app.use('/api/products', require('./routes/products'));
    app.use('/api/v1/products', require('./routes/products')); // Add v1 prefix
    console.log('✅ Products routes loaded');
} catch (error) {
    console.error('❌ Error loading products routes:', error.message);
}

try {
    app.use('/api/posts', require('./routes/posts'));
    console.log('✅ Posts routes loaded');
} catch (error) {
    console.error('❌ Error loading posts routes:', error.message);
}

try {
    app.use('/api/stories', require('./routes/stories'));
    app.use('/api/v1/stories', require('./routes/stories')); // Add v1 prefix
    console.log('✅ Stories routes loaded');
} catch (error) {
    console.error('❌ Error loading stories routes:', error.message);
}

// Reels Routes
try {
    app.use('/api/reels', require('./routes/reels'));
    app.use('/api/v1/reels', require('./routes/reels')); // Add v1 prefix
    console.log('✅ Reels routes loaded');
} catch (error) {
    console.error('❌ Error loading reels routes:', error.message);
}

try {
    app.use('/api/cart', require('./routes/cart'));
    console.log('✅ Cart routes loaded');
} catch (error) {
    console.error('❌ Error loading cart routes:', error.message);
}

try {
    app.use('/api/wishlist', require('./routes/wishlist'));
    console.log('✅ Wishlist routes loaded');
} catch (error) {
    console.error('❌ Error loading wishlist routes:', error.message);
}

try {
    app.use('/api/cart-new', require('./routes/cartNew'));
    app.use('/api/v1/cart-new', require('./routes/cartNew')); // Add v1 prefix
    console.log('✅ New Cart routes loaded at /api/cart-new and /api/v1/cart-new');
} catch (error) {
    console.error('❌ Error loading new cart routes:', error.message);
}

try {
    app.use('/api/wishlist-new', require('./routes/wishlistNew'));
    app.use('/api/v1/wishlist-new', require('./routes/wishlistNew')); // Add v1 prefix
    console.log('✅ New Wishlist routes loaded at /api/wishlist-new and /api/v1/wishlist-new');
} catch (error) {
    console.error('❌ Error loading new wishlist routes:', error.message);
}

try {
    app.use('/api/orders', require('./routes/orders'));
    console.log('✅ Orders routes loaded');
} catch (error) {
    console.error('❌ Error loading orders routes:', error.message);
}

try {
    app.use('/api/payments', require('./routes/payments'));
    console.log('✅ Payments routes loaded');
} catch (error) {
    console.error('❌ Error loading payments routes:', error.message);
}

try {
    app.use('/api/checkout', require('./routes/checkout'));
    console.log('✅ Checkout routes loaded');
} catch (error) {
    console.error('❌ Error loading checkout routes:', error.message);
}

try {
    app.use('/api/admin', require('./routes/admin'));
    console.log('✅ Admin routes loaded');
} catch (error) {
    console.error('❌ Error loading admin routes:', error.message);
}

try {
    app.use('/api/vendor', require('./routes/vendor'));
    console.log('✅ Vendor routes loaded');
} catch (error) {
    console.error('❌ Error loading vendor routes:', error.message);
}

try {
    app.use('/api/notifications', require('./routes/notifications'));
    console.log('✅ Notification routes loaded');
} catch (error) {
    console.error('❌ Error loading notification routes:', error.message);
}

try {
    // Mount admin auth routes at both paths for compatibility
    app.use('/api/admin/auth', require('./routes/adminAuth'));
    app.use('/api/auth/admin', require('./routes/adminAuth'));
    console.log('✅ Admin auth routes loaded at /api/admin/auth and /api/auth/admin');
} catch (error) {
    console.error('❌ Error loading admin auth routes:', error.message);
}

try {
    // Mount admin dashboard routes at both paths for compatibility
    app.use('/api/admin/dashboard', require('./routes/adminDashboard'));
    app.use('/api/admin', require('./routes/adminDashboard'));
    console.log('✅ Admin dashboard routes loaded at /api/admin/dashboard and /api/admin');
} catch (error) {
    console.error('❌ Error loading admin dashboard routes:', error.message);
}

try {
    app.use('/api/product-comments', require('./routes/productComments'));
    console.log('✅ Product comments routes loaded');
} catch (error) {
    console.error('❌ Error loading product comments routes:', error.message);
}

try {
    app.use('/api/product-shares', require('./routes/productShares'));
    console.log('✅ Product shares routes loaded');
} catch (error) {
    console.error('❌ Error loading product shares routes:', error.message);
}

try {
    app.use('/api/ecommerce', require('./routes/ecommerceAPI'));
    console.log('✅ E-commerce API routes loaded');
} catch (error) {
    console.error('❌ Error loading e-commerce API routes:', error.message);
}

try {
    app.use('/api/user', require('./routes/userWishlistCart'));
    console.log('✅ User wishlist/cart routes loaded');
} catch (error) {
    console.error('❌ Error loading user wishlist/cart routes:', error.message);
}

try {
    app.use('/api/categories', require('./routes/categories'));
    app.use('/api/v1/categories', require('./routes/categories')); // Add v1 prefix
    console.log('✅ Categories routes loaded');
} catch (error) {
    console.error('❌ Error loading categories routes:', error.message);
}

try {
    app.use('/api/brands', require('./routes/brands'));
    console.log('✅ Brands routes loaded');
} catch (error) {
    console.error('❌ Error loading brands routes:', error.message);
}

try {
    app.use('/api/analytics', require('./routes/analytics'));
    console.log('✅ Analytics routes loaded');
} catch (error) {
    console.error('❌ Error loading analytics routes:', error.message);
}

try {
    app.use('/api/recommendations', require('./routes/recommendations'));
    console.log('✅ Recommendations routes loaded');
} catch (error) {
    console.error('❌ Error loading recommendations routes:', error.message);
}

// Enhanced Content Creation Routes
try {
    app.use('/api/content', require('./routes/contentRoutes'));
    app.use('/api/v1/content', require('./routes/contentRoutes'));
    console.log('✅ Enhanced content creation routes loaded');
} catch (error) {
    console.error('❌ Error loading content routes:', error.message);
}

// Reward System Routes
try {
    const rewardRoutes = require('./routes/rewardRoutes');
    app.use('/api/rewards', rewardRoutes);
    app.use('/api/v1/rewards', rewardRoutes);
    console.log('✅ Reward system routes loaded');
} catch (error) {
    console.error('❌ Error loading reward routes:', error.message);
    console.error('Full error:', error);
}

try {
    app.use('/api/v1/search', require('./routes/search'));
    console.log('✅ Search routes loaded');
} catch (error) {
    console.error('❌ Error loading search routes:', error.message);
}

// Mount main routes with /v1 prefix
try {
    app.use('/', require('./routes/index'));
    console.log('✅ Main API routes with /v1 prefix loaded');
} catch (error) {
    console.error('❌ Error loading main API routes:', error.message);
}

// New E-commerce Feature Routes
try {
    app.use('/api/role-management', require('./routes/roleManagement'));
    console.log('✅ Role management routes loaded');
} catch (error) {
    console.error('❌ Error loading role management routes:', error.message);
}

try {
    app.use('/api/modules', require('./routes/moduleManagement'));
    console.log('✅ Module management routes loaded');
} catch (error) {
    console.error('❌ Error loading module management routes:', error.message);
}

try {
    app.use('/api/vendor-verification', require('./routes/vendorVerification'));
    console.log('✅ Vendor verification routes loaded');
} catch (error) {
    console.error('❌ Error loading vendor verification routes:', error.message);
}

// New E-commerce Feature Routes
try {
    app.use('/api/role-management', require('./routes/roleManagement'));
    console.log('✅ Role management routes loaded');
} catch (error) {
    console.error('❌ Error loading role management routes:', error.message);
}

try {
    app.use('/api/modules', require('./routes/moduleManagement'));
    console.log('✅ Module management routes loaded');
} catch (error) {
    console.error('❌ Error loading module management routes:', error.message);
}

try {
    app.use('/api/vendor-verification', require('./routes/vendorVerification'));
    console.log('✅ Vendor verification routes loaded');
} catch (error) {
    console.error('❌ Error loading vendor verification routes:', error.message);
}

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'DFashion API Server Running',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

// Quick fix: Handle missing endpoints that frontend is calling
app.get('/me', (req, res) => {
    res.redirect(301, '/api/auth/me');
});

app.get('/api/me', (req, res) => {
    res.redirect(301, '/api/auth/me');
});

// Handle missing login endpoint (should be /api/auth/login)
app.post('/login', (req, res) => {
    res.redirect(307, '/api/auth/login');
});

app.post('/api/login', (req, res) => {
    res.redirect(307, '/api/auth/login');
});

// Database Collections Check Endpoint (simplified)
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


// Note: Login handled by auth routes (/routes/auth.js)

// Admin login handled by main auth routes

// All routes handled by dedicated route files - no mock data

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// Start server function
const startServer = async () => {
    try {
        // Connect to database first
        console.log('🔌 Attempting to connect to MongoDB...');
        await connectDB();

        // Create HTTP server
        const server = http.createServer(app);

        // Initialize Socket.IO
        socketService.initialize(server);

        // Start server
        const PORT = process.env.PORT || 9000;

        server.listen(PORT, '0.0.0.0', () => {
            console.log('========================================');
            console.log('🚀 DFashion Backend Server Running!');
            console.log('========================================');
            console.log(`📡 Server: http://localhost:${PORT}`);
            console.log(`📱 Mobile Access: http://10.0.2.2:${PORT}`);
            console.log(`🔌 Socket.IO: Real-time notifications enabled`);
            console.log(`🛡️ Admin Dashboard: http://localhost:4200/admin`);
            console.log(`🌐 Health Check: http://localhost:${PORT}/api/health`);
            console.log(`🌐 Test Endpoint: http://localhost:${PORT}/api/test`);
            console.log(`📊 Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
            console.log('========================================');
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

// Start the server
startServer();

module.exports = app;
