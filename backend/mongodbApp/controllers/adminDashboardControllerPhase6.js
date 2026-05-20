/**
 * Admin Dashboard Controller - Complete MongoDB Implementation (Phase 6)
 * 12 methods for comprehensive admin analytics and reporting
 */

const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Category = require('../models/Category');
const UserBehavior = require('../models/UserBehavior');
const Analytics = require('../models/Analytics');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Get dashboard statistics (Summary)
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [totalUsers, totalProducts, totalOrders, totalRevenue] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments({ status: 'completed' }),
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    return ApiResponse.success(res, {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      timestamp: new Date()
    }, 'Dashboard statistics retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get user statistics
 */
exports.getUserStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [totalUsers, activeUsers, newUsers, usersByRole] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
      User.countDocuments(filter),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ])
    ]);

    return ApiResponse.success(res, {
      totalUsers,
      activeUsers,
      newUsers,
      usersByRole
    }, 'User statistics retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get order statistics
 */
exports.getOrderStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [totalOrders, completedOrders, pendingOrders, cancelledOrders, ordersByStatus] = await Promise.all([
      Order.countDocuments(filter),
      Order.countDocuments({ ...filter, status: 'completed' }),
      Order.countDocuments({ ...filter, status: 'pending' }),
      Order.countDocuments({ ...filter, status: 'cancelled' }),
      Order.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    return ApiResponse.success(res, {
      totalOrders,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      ordersByStatus
    }, 'Order statistics retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Get product statistics
 */
exports.getProductStats = async (req, res, next) => {
  try {
    const [totalProducts, activeProducts, outOfStock, lowStock] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ stock: 0 }),
      Product.countDocuments({ stock: { $gt: 0, $lte: 10 } })
    ]);

    const topCategories = await Product.aggregate([
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } }
    ]);

    return ApiResponse.success(res, {
      totalProducts,
      activeProducts,
      outOfStock,
      lowStock,
      topCategories
    }, 'Product statistics retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Get revenue statistics
 */
exports.getRevenueStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = { status: 'completed' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const revenueData = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const totalRevenue = revenueData.reduce((sum, day) => sum + day.revenue, 0);
    const avgOrderValue = revenueData.length > 0 ? totalRevenue / revenueData.reduce((sum, day) => sum + day.orders, 0) : 0;

    return ApiResponse.success(res, {
      totalRevenue,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      revenueData,
      period: { startDate, endDate }
    }, 'Revenue statistics retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Get top products
 */
exports.getTopProducts = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const topProducts = await Product.aggregate([
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          price: { $first: '$price' },
          sales: { $first: '$salesCount' },
          revenue: { $multiply: [{ $first: '$price' }, { $first: '$salesCount' }] }
        }
      },
      { $sort: { sales: -1 } },
      { $limit: parseInt(limit) || 10 }
    ]);

    return ApiResponse.success(res, topProducts, 'Top products retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Get top categories
 */
exports.getTopCategories = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const topCategories = await Category.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'categoryId',
          as: 'products'
        }
      },
      {
        $project: {
          name: 1,
          productCount: { $size: '$products' },
          totalSales: { $sum: '$products.salesCount' }
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: parseInt(limit) || 10 }
    ]);

    return ApiResponse.success(res, topCategories, 'Top categories retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Get top users (by orders/spending)
 */
exports.getTopUsers = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const topUsers = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$userId', totalSpent: { $sum: '$totalAmount' }, orderCount: { $sum: 1 } } },
      { $sort: { totalSpent: -1 } },
      { $limit: parseInt(limit) || 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }
    ]);

    return ApiResponse.success(res, topUsers, 'Top users retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 9. Get recent orders
 */
exports.getRecentOrders = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    const recentOrders = await Order.find()
      .populate('userId', 'name email phone')
      .sort('-createdAt')
      .limit(parseInt(limit) || 20)
      .lean();

    return ApiResponse.success(res, recentOrders, 'Recent orders retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 10. Get user activity trend
 */
exports.getUserActivityTrend = async (req, res, next) => {
  try {
    const { startDate, endDate, period = 'daily' } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const formatString = period === 'monthly' ? '%Y-%m' : '%Y-%m-%d';

    const activityTrend = await UserBehavior.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: formatString, date: '$createdAt' } },
          views: { $sum: { $cond: [{ $eq: ['$action', 'view_product'] }, 1, 0] } },
          clicks: { $sum: { $cond: [{ $eq: ['$action', 'click'] }, 1, 0] } },
          searches: { $sum: { $cond: [{ $eq: ['$action', 'search'] }, 1, 0] } },
          purchases: { $sum: { $cond: [{ $eq: ['$action', 'purchase'] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return ApiResponse.success(res, activityTrend, 'User activity trend retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 11. Get sales report
 */
exports.getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = { status: 'completed' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const salesData = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' },
          minOrderValue: { $min: '$totalAmount' },
          maxOrderValue: { $max: '$totalAmount' }
        }
      }
    ]);

    return ApiResponse.success(res, salesData[0] || {}, 'Sales report retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 12. Get inventory report
 */
exports.getInventoryReport = async (req, res, next) => {
  try {
    const inventoryData = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          avgStock: { $avg: '$stock' },
          outOfStock: { $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] } },
          lowStock: { $sum: { $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', 10] }] }, 1, 0] } }
        }
      }
    ]);

    return ApiResponse.success(res, inventoryData[0] || {}, 'Inventory report retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
