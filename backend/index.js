'use strict';

console.log('🚀 Starting DFashion Backend...');

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

// DB
const { connectDB } = require('./config/database'); // Mongo (optional)
const { connectPostgres } = require('./config/postgres');

// routes
const apiRoutes = require('./routes/routerindex');

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

/* ================= ROUTES ================= */
app.use('/api', apiRoutes);

/* ================= UTIL ROUTES ================= */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    postgres: true,
    mongo: false,
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'DFashion Backend Running'
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
    const dbType = (process.env.DB_TYPE || 'postgres').toLowerCase();

    if (dbType.includes('postgres')) {
      await connectPostgres();
      console.log('✅ PostgreSQL connected');
      dataProvider.enableDb();
    }

    if (dbType.includes('mongo')) {
      await connectDB();
      console.log('✅ MongoDB connected');
      dataProvider.enableDb();
    }

    const PORT = process.env.PORT || 3000;
    const server = http.createServer(app);

    socketService.initialize(server);

    server.listen(PORT, () => {
      console.log('====================================');
      console.log(`🚀 Server: http://localhost:${PORT}`);
      console.log(`🌐 API: http://localhost:${PORT}/api`);
      console.log(`❤️ Health: http://localhost:${PORT}/api/health`);
      console.log('====================================');
    });

  } catch (err) {
    console.error('❌ Startup failed:', err);
    process.exit(1);
  }
};

startServer();

module.exports = app;