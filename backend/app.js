console.log('🚀 Starting DFashion Backend...');

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const http = require('http');
const socketService = require('./services/socketService');
require('dotenv').config();

// Verify JWT_SECRET is loaded
console.log('🔐 JWT_SECRET loaded:', !!process.env.JWT_SECRET);
if (!process.env.JWT_SECRET) {
    console.error('❌ CRITICAL: JWT_SECRET not found in environment variables!');
    console.error('❌ Please check your .env file');
    process.exit(1);
}

console.log('✅ All modules loaded successfully');

const app = express();

// Import database configuration
const { connectDB } = require('./config/database');

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const allowedOrigins = [
    'http://localhost:4200',
    'http://localhost:8100',
    'http://localhost:5000',
    'capacitor://localhost',  // For Capacitor apps
    'ionic://localhost',      // For Ionic apps
    'https://onlyshah.github.io'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman, or local files)
        if (!origin) {
            return callback(null, true);
        }

        // Allow file:// protocol for local HTML files
        if (origin.startsWith('file://')) {
            return callback(null, true);
        }

        // Check allowed origins
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // For development, allow localhost with any port
        if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('10.0.2.2')) {
            return callback(null, true);
        }

        // For development, allow all origins
        console.log('CORS: Allowing origin:', origin);
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Import models for direct operations
let User, Product, Order;
try {
    User = require('./models/User');
    console.log('✅ User model loaded');
} catch (err) {
    console.log('⚠️ User model not found:', err.message);
}

try {
    Product = require('./models/Product');
    console.log('✅ Product model loaded');
} catch (err) {
    console.log('⚠️ Product model not found:', err.message);
}

try {
    Order = require('./models/Order');
    console.log('✅ Order model loaded');
} catch (err) {
    console.log('⚠️ Order model not found:', err.message);
}

app.use('/uploads', express.static('uploads'));

// Import Middleware (test basic functionality first)
let auth, requireAdmin, requireRole;
try {
    const middleware = require('./middleware/auth');
    auth = middleware.auth;
    requireAdmin = middleware.requireAdmin;
    requireRole = middleware.requireRole;
    console.log('✅ Middleware loaded successfully');
} catch (error) {
    console.error('❌ Middleware loading error:', error.message);
    // Create dummy middleware for testing
    auth = (req, res, next) => next();
    requireAdmin = (req, res, next) => next();
    requireRole = () => (req, res, next) => next();
}

// Request logging middleware (BEFORE routes)
app.use((req, res, next) => {
    console.log(`📡 ${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('📦 Request Body:', req.body);
    }
    next();
});

// Basic API Routes (testing server functionality)
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Server is working!',
        timestamp: new Date().toISOString()
    });
});

// Database Seeder Route (for development)
app.post('/api/seed-database', async (req, res) => {
    try {
        console.log('🌱 Starting database seeding...');

        // Run the existing seeder
        const { exec } = require('child_process');
        const path = require('path');

        const seederPath = path.join(__dirname, 'seeders', 'index.js');

        exec(`node "${seederPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error('Seeding error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to seed database',
                    error: error.message
                });
            }

            console.log('Seeding output:', stdout);
            if (stderr) console.error('Seeding stderr:', stderr);

            res.json({
                success: true,
                message: 'Database seeded successfully!',
                output: stdout,
                timestamp: new Date().toISOString()
            });
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
    console.log('✅ New Cart routes loaded');
} catch (error) {
    console.error('❌ Error loading new cart routes:', error.message);
}

try {
    app.use('/api/wishlist-new', require('./routes/wishlistNew'));
    console.log('✅ New Wishlist routes loaded');
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
    app.use('/api/admin/auth', require('./routes/adminAuth'));
    console.log('✅ Admin auth routes loaded');
} catch (error) {
    console.error('❌ Error loading admin auth routes:', error.message);
}

try {
    app.use('/api/admin/dashboard', require('./routes/adminDashboard'));
    console.log('✅ Admin dashboard routes loaded');
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

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'DFashion API Server Running',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
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
        const PORT = process.env.PORT || 5000;

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
