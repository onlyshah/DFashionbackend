/**
 * Vendor Management Controller - Complete MongoDB Implementation (Phase 7)
 * 7 methods for vendor profile and analytics
 */

const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const SellerCommission = require('../models/SellerCommission');
const SellerPerformance = require('../models/SellerPerformance');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Get vendor profile
 */
exports.getVendorProfile = async (req, res, next) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid vendor ID', 400, 'INVALID_ID');
    }

    const vendor = await User.findById(vendorId)
      .select('-password')
      .lean();

    if (!vendor || vendor.role !== 'vendor') {
      throw new ApiError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    }

    return ApiResponse.success(res, vendor, 'Vendor profile retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Update vendor profile (Vendor only)
 */
exports.updateVendorProfile = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'vendor') {
      throw new ApiError('Vendor access required', 403, 'FORBIDDEN');
    }

    const { shopName, description, logo, banner, commissionRate } = req.body;

    const updates = {};
    if (shopName) updates.shopName = shopName;
    if (description) updates.shopDescription = description;
    if (logo) updates.shopLogo = logo;
    if (banner) updates.shopBanner = banner;

    const vendor = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    ).select('-password');

    return ApiResponse.success(res, vendor, 'Vendor profile updated');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get vendor products
 */
exports.getVendorProducts = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!vendorId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid vendor ID', 400, 'INVALID_ID');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find({ vendorId })
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments({ vendorId })
    ]);

    return ApiResponse.paginated(res, products, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Vendor products retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Get vendor orders
 */
exports.getVendorOrders = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'vendor') {
      throw new ApiError('Vendor access required', 403, 'FORBIDDEN');
    }

    const { page = 1, limit = 20, status } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const filter = { vendorId: req.user._id };
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('userId', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter)
    ]);

    return ApiResponse.paginated(res, orders, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Vendor orders retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Get vendor analytics
 */
exports.getVendorAnalytics = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'vendor') {
      throw new ApiError('Vendor access required', 403, 'FORBIDDEN');
    }

    const [totalProducts, totalOrders, totalRevenue, avgRating] = await Promise.all([
      Product.countDocuments({ vendorId: req.user._id }),
      Order.countDocuments({ vendorId: req.user._id, status: 'completed' }),
      Order.aggregate([
        { $match: { vendorId: req.user._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Product.aggregate([
        { $match: { vendorId: req.user._id } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ])
    ]);

    return ApiResponse.success(res, {
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      avgRating: avgRating[0]?.avgRating || 0,
      vendorId: req.user._id
    }, 'Vendor analytics retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Get vendor payouts
 */
exports.getVendorPayouts = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'vendor') {
      throw new ApiError('Vendor access required', 403, 'FORBIDDEN');
    }

    const payouts = await SellerCommission.find({ vendorId: req.user._id })
      .sort('-createdAt')
      .lean();

    return ApiResponse.success(res, payouts, 'Vendor payouts retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Request payout
 */
exports.requestPayout = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'vendor') {
      throw new ApiError('Vendor access required', 403, 'FORBIDDEN');
    }

    const { amount, accountDetails } = req.body;

    if (!amount || amount <= 0) {
      throw new ApiError('Valid amount is required', 400, 'VALIDATION_ERROR');
    }

    // Check available balance (from SellerCommission)
    const totalCommission = await SellerCommission.aggregate([
      { $match: { vendorId: req.user._id, status: 'available' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const availableBalance = totalCommission[0]?.total || 0;

    if (amount > availableBalance) {
      throw new ApiError('Insufficient balance', 400, 'INSUFFICIENT_BALANCE');
    }

    const payout = await SellerCommission.create({
      vendorId: req.user._id,
      amount,
      status: 'pending',
      requestedAt: new Date(),
      accountDetails
    });

    return ApiResponse.created(res, payout, 'Payout request submitted');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
