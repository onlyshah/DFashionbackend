const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');
const models = require('../models');
const User = models.User;
const Product = models.Product;
const Order = models.Order;
const Post = models.Post;
const Story = models.Story;

// Postgres (Sequelize) fallback when MongoDB is unavailable
let sequelizeMode = false;
let SQLModels = null;
try {
  if (process.env.DB_TYPE === 'postgres') {
    SQLModels = require('../models_sql');
    if (SQLModels && SQLModels.User && typeof SQLModels.User.count === 'function') {
      sequelizeMode = true;
      console.log('[analytics] Sequelize mode enabled for analytics overview');
    }
  }
} catch (err) {
  // ignore and use mongoose
}

/**
 * Analytics Overview - REAL TIME ONLY
 */
router.get('/overview', async (req, res) => {
  try {
    // If MongoDB is not connected and Sequelize fallback isn't enabled, return safe defaults
    if (!sequelizeMode && mongoose.connection.readyState !== 1) {
      console.warn('[analytics] MongoDB not connected - returning default overview values');
      return res.json({
        success: true,
        data: {
          totalUsers: 0,
          activeUsers: 0,
          totalProducts: 0,
          totalOrders: 0,
          totalRevenue: 0,
          conversionRate: 0,
          averageOrderValue: 0,
          topCategories: []
        }
      });
    }
    // Basic counts
    let totalUsers = 0;
    let activeUsers = 0;
    let totalProducts = 0;
    let totalOrders = 0;
    let totalRevenue = 0;

    if (sequelizeMode && SQLModels) {
      try {
        totalUsers = await SQLModels.User.count();
        // activeUsers: SQL model may not track lastActive; default to totalUsers
        activeUsers = totalUsers;
        totalProducts = await SQLModels.Product.count();
        // Orders may not be modeled in SQLModels; default to 0 if missing
        if (SQLModels.Order && typeof SQLModels.Order.count === 'function') {
          totalOrders = await SQLModels.Order.count();
          const revenueRow = await SQLModels.Order.findOne({
            attributes: [[SQLModels.sequelize.fn('SUM', SQLModels.sequelize.col('totalAmount')), 'total']]
          });
          totalRevenue = (revenueRow && revenueRow.dataValues && revenueRow.dataValues.total) || 0;
        } else {
          totalOrders = 0;
          totalRevenue = 0;
        }
      } catch (err) {
        console.error('[analytics] Sequelize overview fallback failed:', err);
      }
    } else {
      totalUsers = await User.countDocuments();
      activeUsers = await User.countDocuments({
        lastActive: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Active last 30 days
      });
      totalProducts = await Product.countDocuments();
      totalOrders = await Order.countDocuments();

      // Revenue
      const revenueResult = await Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
    }

    // Average order value
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top categories
    const topCategories = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $project: {
          name: '$_id',
          count: 1,
          revenue: { $multiply: ['$count', '$avgPrice'] },
          _id: 0
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
        conversionRate: totalUsers > 0 ? (totalOrders / totalUsers) * 100 : 0,
        averageOrderValue,
        topCategories
      }
    });

  } catch (error) {
    console.error('Overview analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics overview', error: error.message });
  }
});

/**
 * Individual Analytics Endpoints
 */

// Orders analytics
router.get('/orders', async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    res.json({ success: true, totalOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders analytics', error: error.message });
  }
});

// Users analytics
router.get('/users', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({
      lastActive: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    res.json({ success: true, totalUsers, activeUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users analytics', error: error.message });
  }
});

// Revenue analytics
router.get('/revenue', async (req, res) => {
  try {
    const revenueResult = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
    res.json({ success: true, totalRevenue });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch revenue analytics', error: error.message });
  }
});

// Categories analytics
router.get('/categories', async (req, res) => {
  try {
    const topCategories = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $project: {
          name: '$_id',
          count: 1,
          revenue: { $multiply: ['$count', '$avgPrice'] },
          _id: 0
        }
      }
    ]);
    res.json({ success: true, topCategories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch category analytics', error: error.message });
  }
});

// Sales analytics
router.get('/sales', async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const revenueResult = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
    res.json({ success: true, totalOrders, totalRevenue });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch sales analytics', error: error.message });
  }
});

// Products analytics
router.get('/products', async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    res.json({ success: true, totalProducts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch products analytics', error: error.message });
  }
});

/**
 * User Behavior Tracking
 */
router.post('/track', async (req, res) => {
  try {
    const { event, data, timestamp } = req.body;

    // TODO: Save this event into DB (UserBehavior model for example)
    console.log('User behavior tracked:', { event, data, timestamp });

    res.json({
      success: true,
      message: 'User behavior tracked successfully'
    });

  } catch (error) {
    console.error('User behavior tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track user behavior',
      error: error.message
    });
  }
});

module.exports = router;
