/**
 * Marketplace Features Controller - Complete MongoDB Implementation (Phase 8)
 * 3 marketplace-specific endpoints
 */

const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Get marketplace statistics
 */
exports.getMarketplaceStats = async (req, res, next) => {
  try {
    const [totalVendors, totalProducts, totalOrders, totalReviews, totalTransactions] = await Promise.all([
      User.countDocuments({ role: 'vendor' }),
      Product.countDocuments(),
      Order.countDocuments(),
      Review.countDocuments(),
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    const avgOrderValue = totalOrders > 0 ? totalTransactions[0]?.total / totalOrders : 0;

    return ApiResponse.success(res, {
      marketplace: {
        totalVendors,
        totalProducts,
        totalOrders,
        totalReviews,
        totalTransactionValue: totalTransactions[0]?.total || 0,
        avgOrderValue: avgOrderValue.toFixed(2),
        timestamp: new Date().toISOString()
      }
    }, 'Marketplace statistics retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get featured vendors
 */
exports.getFeaturedVendors = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [vendors, total] = await Promise.all([
      User.find({
        role: 'vendor',
        isFeatured: true
      })
        .select('-password')
        .sort('-rating')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments({ role: 'vendor', isFeatured: true })
    ]);

    // Add vendor stats
    const vendorsWithStats = await Promise.all(vendors.map(async (vendor) => {
      const [productCount, orderCount, avgRating] = await Promise.all([
        Product.countDocuments({ vendorId: vendor._id }),
        Order.countDocuments({ vendorId: vendor._id, status: 'completed' }),
        Review.aggregate([
          { $match: { vendorId: vendor._id } },
          { $group: { _id: null, avgRating: { $avg: '$rating' } } }
        ])
      ]);

      return {
        ...vendor,
        stats: {
          products: productCount,
          completedOrders: orderCount,
          avgRating: avgRating[0]?.avgRating || 0
        }
      };
    }));

    return ApiResponse.paginated(res, vendorsWithStats, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Featured vendors retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get marketplace metrics
 */
exports.getMarketplaceMetrics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = new Date(startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const end = new Date(endDate || new Date());

    const [salesByVendor, topProducts, categoryDistribution, paymentMethods] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, status: 'completed' } },
        { $group: { _id: '$vendorId', sales: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
        { $sort: { sales: -1 } },
        { $limit: 10 }
      ]),
      Product.aggregate([
        { $lookup: { from: 'orders', localField: '_id', foreignField: 'productId', as: 'orders' } },
        { $unwind: '$orders' },
        { $match: { 'orders.createdAt': { $gte: start, $lte: end } } },
        { $group: { _id: '$_id', name: { $first: '$name' }, sales: { $sum: 1 } } },
        { $sort: { sales: -1 } },
        { $limit: 10 }
      ]),
      Product.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } }
      ])
    ]);

    return ApiResponse.success(res, {
      period: { startDate: start, endDate: end },
      salesByVendor,
      topProducts,
      categoryDistribution,
      paymentMethods,
      timestamp: new Date().toISOString()
    }, 'Marketplace metrics retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
