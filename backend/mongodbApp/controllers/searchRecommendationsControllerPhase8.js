/**
 * Search & Recommendations Controller - Complete MongoDB Implementation (Phase 8)
 * 12 methods for search, recommendations, and trending
 */

const Product = require('../models/Product');
const User = require('../models/User');
const Post = require('../models/Post');
const SearchHistory = require('../models/SearchHistory');
const UserView = require('../models/UserView');
const Order = require('../models/Order');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Search products
 */
exports.searchProducts = async (req, res, next) => {
  try {
    const { q, category, minPrice, maxPrice, rating, page = 1, limit = 20, sortBy = '-createdAt' } = req.query;

    if (!q) {
      throw new ApiError('Search query is required', 400, 'VALIDATION_ERROR');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ]
    };

    if (category) filter.category = category;
    if (minPrice) filter.price = { $gte: parseFloat(minPrice) };
    if (maxPrice) {
      filter.price = filter.price || {};
      filter.price.$lte = parseFloat(maxPrice);
    }
    if (rating) filter.rating = { $gte: parseFloat(rating) };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortBy)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter)
    ]);

    // Track search if user authenticated
    if (req.user) {
      SearchHistory.create({
        userId: req.user._id,
        query: q,
        type: 'product'
      }).catch(() => {});
    }

    return ApiResponse.paginated(res, products, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Products search completed');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Search users
 */
exports.searchUsers = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
      throw new ApiError('Search query is required', 400, 'VALIDATION_ERROR');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find({
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { username: { $regex: q, $options: 'i' } }
        ]
      })
        .select('-password')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments({
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { username: { $regex: q, $options: 'i' } }
        ]
      })
    ]);

    return ApiResponse.paginated(res, users, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Users search completed');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Search posts
 */
exports.searchPosts = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
      throw new ApiError('Search query is required', 400, 'VALIDATION_ERROR');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [posts, total] = await Promise.all([
      Post.find({
        $or: [
          { caption: { $regex: q, $options: 'i' } },
          { hashtags: { $in: [new RegExp(q, 'i')] } }
        ]
      })
        .populate('userId', 'name profilePic')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Post.countDocuments({
        $or: [
          { caption: { $regex: q, $options: 'i' } },
          { hashtags: { $in: [new RegExp(q, 'i')] } }
        ]
      })
    ]);

    return ApiResponse.paginated(res, posts, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Posts search completed');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Get trending products
 */
exports.getTrendingProducts = async (req, res, next) => {
  try {
    const { timeframe = 'week', page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const dateRanges = {
      day: 1,
      week: 7,
      month: 30
    };

    const days = dateRanges[timeframe] || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [products, total] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$productId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $skip: skip },
        { $limit: limitNum },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        { $replaceRoot: { newRoot: '$product' } }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$productId' } },
        { $count: 'total' }
      ])
    ]);

    const totalCount = total[0]?.total || 0;

    return ApiResponse.paginated(res, products, {
      page: pageNum,
      limit: limitNum,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Trending products retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Get trending hashtags
 */
exports.getTrendingHashtags = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const hashtags = await Post.aggregate([
      { $unwind: '$hashtags' },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $skip: skip },
      { $limit: limitNum }
    ]);

    return ApiResponse.success(res, hashtags, 'Trending hashtags retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Get similar products
 */
exports.getSimilarProducts = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { limit = 10 } = req.query;

    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid product ID', 400, 'INVALID_ID');
    }

    const product = await Product.findById(productId).lean();

    if (!product) {
      throw new ApiError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const similar = await Product.find({
      _id: { $ne: productId },
      category: product.category,
      $or: [
        { tags: { $in: product.tags } },
        { price: { $gte: product.price * 0.8, $lte: product.price * 1.2 } }
      ]
    })
      .limit(parseInt(limit) || 10)
      .lean();

    return ApiResponse.success(res, similar, 'Similar products retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Get recommended products
 */
exports.getRecommendedProducts = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    // Get user's purchase categories
    const userOrders = await Order.find({ userId: req.user._id }).select('productId');
    const purchasedProductIds = userOrders.map(o => o.productId);

    const purchasedProducts = await Product.find({ _id: { $in: purchasedProductIds } }).select('category tags');
    const categories = [...new Set(purchasedProducts.map(p => p.category))];
    const tags = [...new Set(purchasedProducts.flatMap(p => p.tags || []))];

    const recommendations = await Product.find({
      _id: { $nin: purchasedProductIds },
      $or: [
        { category: { $in: categories } },
        { tags: { $in: tags } }
      ]
    })
      .sort('-rating')
      .skip(skip)
      .limit(limitNum)
      .lean();

    return ApiResponse.paginated(res, recommendations, {
      page: pageNum,
      limit: limitNum,
      total: recommendations.length
    }, 'Recommendations retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Get recommended users
 */
exports.getRecommendedUsers = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const alreadyFollowing = await Follow.find({ follower: req.user._id }).select('following');
    const followingIds = alreadyFollowing.map(f => f.following);

    const recommendations = await User.find({
      _id: { $nin: [...followingIds, req.user._id] }
    })
      .select('-password')
      .sort('-followers')
      .skip(skip)
      .limit(limitNum)
      .lean();

    return ApiResponse.paginated(res, recommendations, {
      page: pageNum,
      limit: limitNum
    }, 'User recommendations retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 9. Get popular posts
 */
exports.getPopularPosts = async (req, res, next) => {
  try {
    const { timeframe = 'week', page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const dateRanges = {
      day: 1,
      week: 7,
      month: 30
    };

    const days = dateRanges[timeframe] || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [posts, total] = await Promise.all([
      Post.find({ createdAt: { $gte: startDate } })
        .sort({ likesCount: -1, commentsCount: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'name profilePic')
        .lean(),
      Post.countDocuments({ createdAt: { $gte: startDate } })
    ]);

    return ApiResponse.paginated(res, posts, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Popular posts retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 10. Get search history
 */
exports.getSearchHistory = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [history, total] = await Promise.all([
      SearchHistory.find({ userId: req.user._id })
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SearchHistory.countDocuments({ userId: req.user._id })
    ]);

    return ApiResponse.paginated(res, history, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Search history retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 11. Save search
 */
exports.saveSearch = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { searchQuery } = req.body;

    if (!searchQuery) {
      throw new ApiError('Search query is required', 400, 'VALIDATION_ERROR');
    }

    const saved = await SearchHistory.create({
      userId: req.user._id,
      query: searchQuery,
      type: 'saved',
      isSaved: true
    });

    return ApiResponse.created(res, saved, 'Search saved');
  } catch (error) {
    next(error);
  }
};

/**
 * 12. Delete search
 */
exports.deleteSearch = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { searchId } = req.params;

    if (!searchId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid search ID', 400, 'INVALID_ID');
    }

    const search = await SearchHistory.findById(searchId);

    if (!search) {
      throw new ApiError('Search not found', 404, 'SEARCH_NOT_FOUND');
    }

    if (search.userId.toString() !== req.user._id.toString()) {
      throw new ApiError('Not authorized', 403, 'FORBIDDEN');
    }

    await SearchHistory.findByIdAndDelete(searchId);

    return ApiResponse.success(res, { id: searchId }, 'Search deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
