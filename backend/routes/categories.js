const express = require('express');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { auth, optionalAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Try PostgreSQL first
    try {
      const models = require('../models_sql');
      const CategoryModel = models._raw?.Category || models.Category;
      
      if (CategoryModel && CategoryModel.findAll) {
        const categories = await CategoryModel.findAll({
          order: [['name', 'ASC']],
          raw: true
        });

        return res.json({
          success: true,
          data: categories || []
        });
      }
    } catch (pgErr) {
      console.warn('[categories] PostgreSQL query failed:', pgErr.message);
    }

    // Fallback to MongoDB
    try {
      const categories = await Category.find({ isActive: true })
        .sort({ sortOrder: 1, name: 1 });

      return res.json({
        success: true,
        data: categories
      });
    } catch (mongoErr) {
      console.warn('[categories] MongoDB fallback also failed:', mongoErr.message);
      return res.json({
        success: true,
        data: []
      });
    }
  } catch (error) {
    console.error('[categories] Unexpected error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
});

module.exports = router;
