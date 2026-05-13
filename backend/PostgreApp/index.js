'use strict';

console.log('🚀 Starting DFashion PostgreSQL Backend...');

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const fs = require('fs');

// utils
const socketService = require('./utils/socketService');
const dataProvider = require('./utils/dataProvider');

// middleware
const BasicSecurity = require('./middleware/basicSecurity');
const dbHealth = require('./middleware/dbHealth');
const errorHandler = require('./middleware/errorHandler');

// DB - PostgreSQL Only
const { connectPostgres } = require('./config/postgres');

// Models - PostgreSQL (Sequelize)
const models = require('./models');

// Routes
const apiRoutes = require('./routes');

const app = express();
app.set('trust proxy', 1);

/* ================= ENV ================= */
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('❌ JWT_SECRET missing');
  process.exit(1);
}

/* ================= CORS ================= */
const allowedOrigins = [
  'http://localhost:4200',
  'http://localhost:3000',
  'http://127.0.0.1:4200',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin) || origin.includes('localhost')) {
      return cb(null, true);
    }
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

/* ================= BODY ================= */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

/* ================= SECURITY ================= */
app.use(BasicSecurity.securityHeaders);
app.use(BasicSecurity.helmet);
app.use(BasicSecurity.requestLogger);
app.use(BasicSecurity.sanitizeInput);
app.use(BasicSecurity.validateInput);

app.use('/api/auth', BasicSecurity.authLimiter);
app.use('/api', BasicSecurity.generalLimiter);

/* ================= STATIC ================= */
const uploadsPath = path.join(__dirname, 'uploads');
const publicUploadsPath = path.join(__dirname, 'public', 'uploads');

// Ensure folders exist
[
  uploadsPath,
  publicUploadsPath,
  path.join(publicUploadsPath, 'products'),
  path.join(publicUploadsPath, 'posts'),
  path.join(publicUploadsPath, 'reels'),
  path.join(publicUploadsPath, 'stories'),
  path.join(publicUploadsPath, 'users')
].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created: ${dir}`);
  }
});

// Static serving
app.use('/uploads', express.static(publicUploadsPath));
app.use('/uploads', express.static(uploadsPath));

/* ================= DB HEALTH ================= */
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  return dbHealth(req, res, next);
});

/* ================= ENSURE MODELS READY ================= */
let modelsReady = false;
let modelsError = null;

// Initialize models and wait for them to be ready
(async () => {
  try {
    await models.getPostgresConnection();
    modelsReady = true;
    console.log('✅ All PostgreSQL models initialized successfully');
  } catch (error) {
    modelsError = error;
    console.error('❌ Failed to initialize models:', error.message);
  }
})();

// Middleware to check if models are ready before processing API requests
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  
  if (!modelsReady) {
    console.warn(`⏳ Models not ready yet, waiting... (${req.method} ${req.path})`);
    // Wait a bit and retry
    const retryCount = req.retryCount || 0;
    if (retryCount < 10) {
      req.retryCount = retryCount + 1;
      return setTimeout(() => {
        if (modelsReady) return next();
        // Still not ready, send error
        return res.status(503).json({
          success: false,
          message: 'Database models not initialized',
          code: 'SERVICE_UNAVAILABLE'
        });
      }, 200);
    }
    
    return res.status(503).json({
      success: false,
      message: 'Database models initialization timeout',
      code: 'SERVICE_UNAVAILABLE',
      details: modelsError?.message
    });
  }
  
  if (modelsError) {
    return res.status(500).json({
      success: false,
      message: 'Database models failed to initialize',
      code: 'SERVER_ERROR',
      details: modelsError.message
    });
  }
  
  next();
});

/* ================= ROUTES ================= */
app.use('/api', apiRoutes);

/* ================= UTIL ROUTES ================= */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    database: 'PostgreSQL',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'DFashion PostgreSQL Backend Running',
    database: 'PostgreSQL'
  });
});

/* ================= 404 ================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

/* ================= ERROR ================= */
app.use(errorHandler);

/* ================= SERVER ================= */
const startServer = async () => {
  try {
    console.log('📡 Connecting to PostgreSQL database...');

    // Connect to PostgreSQL
    await connectPostgres();
    console.log('✅ PostgreSQL connected');

    // Initialize socketService with models after DB connection
    socketService.setModels(models);

    const PORT = process.env.PORT || 5000;
    const server = http.createServer(app);

    // Socket.io setup
    socketService.initialize(server);

    server.listen(PORT, () => {
      console.log(`\n🎉 DFashion PostgreSQL Backend listening on port ${PORT}`);
      console.log(`📍 API Base: http://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health\n`);
    });

    server.on('error', (err) => {
      console.error('❌ Server error:', err);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;