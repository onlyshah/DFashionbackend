const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Post = require('../models/Post');
const Story = require('../models/Story');

/**
 * Analytics Overview - REAL TIME ONLY
 */
router.get('/overview', async (req, res) => {
  try {
    // Basic counts
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({
      lastActive: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Active last 30 days
    });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    // Revenue
    const revenueResult = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

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
