/**
 * Products Management Controller - Complete MongoDB Implementation (Phase 6)
 * 8 methods for admin product management
 */

const Product = require('../models/Product');
const Order = require('../models/Order');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Bulk update products
 */
exports.bulkUpdateProducts = async (req, res, next) => {
  try {
    const { productIds, updates } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new ApiError('Product IDs array is required', 400, 'VALIDATION_ERROR');
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new ApiError('Updates object is required', 400, 'VALIDATION_ERROR');
    }

    // Validate all IDs
    const validIds = productIds.every(id => id.match(/^[0-9a-fA-F]{24}$/));
    if (!validIds) {
      throw new ApiError('Invalid product ID format', 400, 'INVALID_ID');
    }

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: updates }
    );

    return ApiResponse.success(res, {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    }, 'Products updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Bulk delete products
 */
exports.bulkDeleteProducts = async (req, res, next) => {
  try {
    const { productIds, hardDelete } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new ApiError('Product IDs array is required', 400, 'VALIDATION_ERROR');
    }

    const validIds = productIds.every(id => id.match(/^[0-9a-fA-F]{24}$/));
    if (!validIds) {
      throw new ApiError('Invalid product ID format', 400, 'INVALID_ID');
    }

    let result;
    if (hardDelete === true) {
      result = await Product.deleteMany({ _id: { $in: productIds } });
    } else {
      result = await Product.updateMany(
        { _id: { $in: productIds } },
        { $set: { isActive: false, deletedAt: new Date() } }
      );
    }

    return ApiResponse.success(res, {
      deletedCount: result.deletedCount || result.modifiedCount
    }, 'Products deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Update product stock
 */
exports.updateStock = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity, action = 'set' } = req.body;

    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid product ID', 400, 'INVALID_ID');
    }

    if (quantity === undefined || quantity === null) {
      throw new ApiError('Quantity is required', 400, 'VALIDATION_ERROR');
    }

    const product = await Product.findById(productId);

    if (!product) {
      throw new ApiError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    let newStock;
    if (action === 'set') {
      newStock = quantity;
    } else if (action === 'add') {
      newStock = product.stock + quantity;
    } else if (action === 'subtract') {
      newStock = product.stock - quantity;
    } else {
      throw new ApiError('Invalid action. Must be: set, add, or subtract', 400, 'INVALID_ACTION');
    }

    if (newStock < 0) {
      throw new ApiError('Stock cannot be negative', 400, 'INVALID_STOCK');
    }

    product.stock = newStock;
    await product.save();

    return ApiResponse.success(res, product, 'Product stock updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Get out of stock products
 */
exports.getOutOfStockProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find({ stock: 0, isActive: true })
        .populate('categoryId', 'name')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments({ stock: 0, isActive: true })
    ]);

    return ApiResponse.paginated(res, products, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Out of stock products retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Get low stock products
 */
exports.getLowStockProducts = async (req, res, next) => {
  try {
    const { threshold = 10, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const thresholdNum = parseInt(threshold);

    const [products, total] = await Promise.all([
      Product.find({ stock: { $gt: 0, $lte: thresholdNum }, isActive: true })
        .populate('categoryId', 'name')
        .sort('stock')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments({ stock: { $gt: 0, $lte: thresholdNum }, isActive: true })
    ]);

    return ApiResponse.paginated(res, products, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Low stock products retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Approve featured product
 */
exports.approveFeaturedProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid product ID', 400, 'INVALID_ID');
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      { 
        isFeatured: true,
        featuredAt: new Date()
      },
      { new: true }
    );

    if (!product) {
      throw new ApiError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    return ApiResponse.success(res, product, 'Product marked as featured');
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Reject featured product
 */
exports.rejectFeaturedProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid product ID', 400, 'INVALID_ID');
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      { 
        isFeatured: false,
        featuredAt: null
      },
      { new: true }
    );

    if (!product) {
      throw new ApiError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    return ApiResponse.success(res, product, 'Product removed from featured');
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Get product analytics
 */
exports.getProductAnalytics = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid product ID', 400, 'INVALID_ID');
    }

    const product = await Product.findById(productId);

    if (!product) {
      throw new ApiError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const orderData = await Order.aggregate([
      { $unwind: '$items' },
      { $match: { 'items.productId': product._id } },
      {
        $group: {
          _id: null,
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          avgRating: { $avg: '$items.rating' }
        }
      }
    ]);

    return ApiResponse.success(res, {
      product: {
        id: product._id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        rating: product.rating
      },
      analytics: orderData[0] || {
        totalSold: 0,
        totalRevenue: 0,
        avgRating: 0
      }
    }, 'Product analytics retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
