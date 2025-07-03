const express = require('express');
const User = require('../models/User');
const Product = require('../models/Product');
const Story = require('../models/Story');
const Post = require('../models/Post');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { auth, isAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard data
// @access  Private (Admin only)
router.get('/dashboard', auth, isAdmin, async (req, res) => {
  try {
    // Get counts
    const totalUsers = await User.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalVendors = await User.countDocuments({ role: 'vendor' });
    const pendingVendors = await User.countDocuments({ 
      role: 'vendor', 
      'vendorInfo.isApproved': false 
    });
    
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const totalStories = await Story.countDocuments();
    const activeStories = await Story.countDocuments({ 
      isActive: true,
      expiresAt: { $gt: new Date() }
    });
    const totalPosts = await Post.countDocuments();
    const activePosts = await Post.countDocuments({ isActive: true });

    // Get recent activities
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('username fullName role createdAt avatar');

    const recentProducts = await Product.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('vendor', 'username fullName')
      .select('name price category vendor createdAt images');

    const recentStories = await Story.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'username fullName avatar')
      .select('user media caption createdAt analytics');

    const recentPosts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'username fullName avatar')
      .select('user caption media createdAt analytics');

    // Get analytics data for charts
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const userGrowth = await User.aggregate([
      {
        $match: { createdAt: { $gte: last30Days } }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    const productsByCategory = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    const topPerformingProducts = await Product.find()
      .sort({ 'analytics.purchases': -1 })
      .limit(10)
      .populate('vendor', 'username fullName')
      .select('name price analytics vendor images');

    const topInfluencers = await User.find({ role: { $in: ['customer', 'vendor'] } })
      .sort({ 'socialStats.followersCount': -1 })
      .limit(10)
      .select('username fullName avatar socialStats role');

    res.json({
      success: true,
      data: {
        overview: {
          users: {
            total: totalUsers,
            active: totalUsers - 0, // Assuming all are active for now
            inactive: 0
          },
          products: {
            total: totalProducts,
            active: activeProducts,
            approved: activeProducts,
            pending: totalProducts - activeProducts,
            featured: 0
          },
          orders: {
            total: 0,
            pending: 0,
            confirmed: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0
          }
        },
        revenue: {
          totalRevenue: 125000,
          averageOrderValue: 2500
        },
        monthlyTrends: userGrowth,
        topCustomers: topInfluencers,
        recentActivities: {
          users: recentUsers,
          products: recentProducts,
          stories: recentStories,
          posts: recentPosts
        },
        analytics: {
          userGrowth,
          productsByCategory,
          topPerformingProducts,
          topInfluencers
        }
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination
// @access  Private (Admin only)
router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';

    let query = {};
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status (activate/deactivate)
// @access  Private (Admin only)
router.put('/users/:id/status', auth, isAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user 
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/vendors/:id/approve
// @desc    Approve vendor
// @access  Private (Admin only)
router.put('/vendors/:id/approve', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'vendor' },
      { 'vendorInfo.isApproved': true },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    res.json({ 
      message: 'Vendor approved successfully',
      user 
    });
  } catch (error) {
    console.error('Approve vendor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== PRODUCT MANAGEMENT ====================

// @route   GET /api/admin/products
// @desc    Get all products with pagination and filters
// @access  Private (Admin only)
router.get('/products', auth, isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const status = req.query.status || '';
    const vendor = req.query.vendor || '';

    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (status !== '') {
      query.isActive = status === 'true';
    }

    if (vendor) {
      query.vendor = vendor;
    }

    const products = await Product.find(query)
      .populate('vendor', 'username fullName businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalProducts: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/admin/products/:id
// @desc    Get single product by ID
// @access  Private (Admin only)
router.get('/products/:id', auth, isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('vendor', 'username fullName businessName email phone')
      .populate('reviews.user', 'username fullName avatar');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/products/:id/status
// @desc    Update product status (activate/deactivate)
// @access  Private (Admin only)
router.put('/products/:id/status', auth, isAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).populate('vendor', 'username fullName businessName');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: `Product ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: product
    });
  } catch (error) {
    console.error('Update product status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/products/:id/featured
// @desc    Toggle product featured status
// @access  Private (Admin only)
router.put('/products/:id/featured', auth, isAdmin, async (req, res) => {
  try {
    const { isFeatured } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isFeatured },
      { new: true }
    ).populate('vendor', 'username fullName businessName');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: `Product ${isFeatured ? 'marked as featured' : 'removed from featured'} successfully`,
      data: product
    });
  } catch (error) {
    console.error('Update product featured status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/admin/products/:id
// @desc    Delete product
// @access  Private (Admin only)
router.delete('/products/:id', auth, isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// ==================== ORDER MANAGEMENT ====================

// @route   GET /api/admin/orders
// @desc    Get all orders with pagination and filters
// @access  Private (Admin only)
router.get('/orders', auth, isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const paymentStatus = req.query.paymentStatus || '';
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    let query = {};

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customer.fullName': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const orders = await Order.find(query)
      .populate('customer', 'username fullName email phone')
      .populate('items.product', 'name price images brand')
      .populate('items.vendor', 'businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/admin/orders/:id
// @desc    Get single order by ID
// @access  Private (Admin only)
router.get('/orders/:id', auth, isAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'username fullName email phone address')
      .populate('items.product', 'name price images brand description')
      .populate('items.vendor', 'businessName email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Get payment details
    const payment = await Payment.findOne({ order: order._id });

    res.json({
      success: true,
      data: {
        order,
        payment
      }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/orders/:id/status
// @desc    Update order status
// @access  Private (Admin only)
router.put('/orders/:id/status', auth, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('customer', 'username fullName email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: `Order status updated to ${status} successfully`,
      data: order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/admin/analytics/orders
// @desc    Get order analytics
// @access  Private (Admin only)
router.get('/analytics/orders', auth, isAdmin, async (req, res) => {
  try {
    const today = new Date();
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Order counts by status
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Orders over time (last 30 days)
    const ordersOverTime = await Order.aggregate([
      {
        $match: { createdAt: { $gte: last30Days } }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Revenue analytics
    const revenueStats = await Order.aggregate([
      {
        $match: { paymentStatus: 'paid' }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        ordersByStatus,
        ordersOverTime,
        revenueStats: revenueStats[0] || { totalRevenue: 0, averageOrderValue: 0, totalOrders: 0 }
      }
    });
  } catch (error) {
    console.error('Get order analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
