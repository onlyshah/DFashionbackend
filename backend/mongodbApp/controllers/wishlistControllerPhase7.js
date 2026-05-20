/**
 * Wishlist Controller - Complete MongoDB Implementation (Phase 7)
 * 5 methods for user wishlist management
 */

const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Get user's wishlist
 */
exports.getWishlist = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Wishlist.find({ userId: req.user._id, isActive: true })
        .populate('productId', 'name price images rating stock')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Wishlist.countDocuments({ userId: req.user._id, isActive: true })
    ]);

    return ApiResponse.paginated(res, items, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Wishlist retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Add product to wishlist
 */
exports.addToWishlist = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { productId } = req.body;

    if (!productId || !productId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Valid product ID is required', 400, 'VALIDATION_ERROR');
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // Check if already in wishlist
    let wishlistItem = await Wishlist.findOne({
      userId: req.user._id,
      productId
    });

    if (wishlistItem) {
      if (wishlistItem.isActive) {
        throw new ApiError('Product already in wishlist', 400, 'ALREADY_IN_WISHLIST');
      }
      // Reactivate if was removed
      wishlistItem.isActive = true;
      await wishlistItem.save();
    } else {
      wishlistItem = await Wishlist.create({
        userId: req.user._id,
        productId,
        isActive: true
      });
    }

    const item = await Wishlist.findById(wishlistItem._id).populate('productId', 'name price images');

    return ApiResponse.created(res, item, 'Product added to wishlist');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Remove product from wishlist
 */
exports.removeFromWishlist = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { wishlistItemId } = req.params;

    if (!wishlistItemId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid wishlist item ID', 400, 'INVALID_ID');
    }

    const item = await Wishlist.findById(wishlistItemId);

    if (!item) {
      throw new ApiError('Wishlist item not found', 404, 'ITEM_NOT_FOUND');
    }

    if (item.userId.toString() !== req.user._id.toString()) {
      throw new ApiError('Not authorized to remove this item', 403, 'FORBIDDEN');
    }

    // Soft delete
    item.isActive = false;
    await item.save();

    return ApiResponse.success(res, { id: wishlistItemId }, 'Product removed from wishlist');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Clear entire wishlist
 */
exports.clearWishlist = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const result = await Wishlist.updateMany(
      { userId: req.user._id },
      { $set: { isActive: false } }
    );

    return ApiResponse.success(res, {
      clearedCount: result.modifiedCount
    }, 'Wishlist cleared successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Share wishlist with others
 */
exports.shareWishlist = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { shareToEmail, shareMessage } = req.body;

    if (!shareToEmail) {
      throw new ApiError('Email address is required', 400, 'VALIDATION_ERROR');
    }

    const wishlistItems = await Wishlist.find({
      userId: req.user._id,
      isActive: true
    }).populate('productId', 'name price images');

    // In a real app, this would send email
    const shareData = {
      sharedBy: req.user._id,
      sharedWithEmail: shareToEmail,
      message: shareMessage || '',
      itemsCount: wishlistItems.length,
      items: wishlistItems,
      shareLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/wishlist/shared/${req.user._id}`,
      timestamp: new Date()
    };

    return ApiResponse.success(res, shareData, 'Wishlist shared successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
