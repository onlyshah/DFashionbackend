const express = require('express');
const router = express.Router();

// Import route modules - only essential ones
try {
  const authRoutes = require('./auth');
  router.use('/api/auth', authRoutes);
  console.log('? Auth routes loaded');
} catch (err) {
  console.warn('? Auth routes failed:', err.message);
}

// Health check endpoint
router.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    database: 'PostgreSQL',
    message: 'DFashion PostgreSQL API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;
