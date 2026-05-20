/**
 * Product Controller - Complete MongoDB Implementation (Phase 3)
 * 18 methods for full e-commerce product management
 */

const Product = require('../models/Product');
const Category = require('../models/Category');
const Review = require('../models/Review');
const SearchHistory = require('../models/SearchHistory');
const UserBehavior = require('../models/UserBehavior');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Get all products with pagination, filtering, and sorting
 */
exports.getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort = '-createdAt', categoryId, minPrice, maxPrice, search } = req.query;
    
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const filter = { isActive: true };
    if (categoryId) filter.categoryId = categoryId;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('categoryId', 'name description')
        .populate('brandId', 'name logo')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter)
    ]);

    return ApiResponse.success(res, products, 'Products retrieved', {
      page: pageNum, limit: limitNum, total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get single product by ID
 */
exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid product ID', 400, 'INVALID_ID');
    }

    const product = await Product.findById(id)
      .populate('categoryId', 'name')
      .populate('brandId', 'name logo')
      .lean();

    if (!product || !product.isActive) {
      throw new ApiError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // Track behavior
    if (req.user) {
      await UserBehavior.create({
        userId: req.user._id, action: 'view_product', productId: id
      }).catch(() => {});
    }

    return ApiResponse.success(res, product, 'Product retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Create product (Vendor/Admin)
 */
exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, categoryId, brandId, price, stock, images, sku } = req.body;

    if (!name || !price || !categoryId) {
      throw new ApiError('Name, price, categoryId required', 400, 'INVALID_INPUT');
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      throw new ApiError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }

    const product = await Product.create({
      name, description, categoryId, brandId, price,
      stock: stock || 0, images: images || [],
      sku: sku || `SKU-${Date.now()}`,
      vendorId: req.user._id, isActive: true
    });

    return ApiResponse.success(res, await product.populate(['categoryId', 'brandId']), 'Product created', null, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Update product
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid product ID', 400, 'INVALID_ID');
    }

    delete updates.vendorId;
    delete updates.createdAt;

    const product = await Product.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
      .populate(['categoryId', 'brandId']);

    if (!product) throw new ApiError('Product not found', 404, 'PRODUCT_NOT_FOUND');

    return ApiResponse.success(res, product, 'Product updated');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Delete product (soft delete)
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid product ID', 400, 'INVALID_ID');
    }

    const product = await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!product) throw new ApiError('Product not found', 404, 'PRODUCT_NOT_FOUND');

    return ApiResponse.success(res, null, 'Product deleted');
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Search products
 */
exports.searchProducts = async (req, res, next) => {
  try {
    const { q, categoryId, minPrice, maxPrice, page = 1, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      throw new ApiError('Search query min 2 chars', 400, 'INVALID_SEARCH');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } }
      ]
    };

    if (categoryId) filter.categoryId = categoryId;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (req.user) {
      await SearchHistory.create({ userId: req.user._id, query: q }).catch(() => {});
    }

    const [products, total] = await Promise.all([
      Product.find(filter).populate('categoryId', 'name').populate('brandId', 'name')
        .skip(skip).limit(limitNum).lean(),
      Product.countDocuments(filter)
    ]);

    return ApiResponse.success(res, products, 'Search results', {
      page: pageNum, limit: limitNum, total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Get products by category
 */
exports.getProductsByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

    if (!categoryId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid category ID', 400, 'INVALID_ID');
    }

    const category = await Category.findById(categoryId);
    if (!category) throw new ApiError('Category not found', 404, 'CATEGORY_NOT_FOUND');

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find({ categoryId, isActive: true })
        .populate('categoryId', 'name').populate('brandId', 'name')
        .sort(sort).skip(skip).limit(limitNum).lean(),
      Product.countDocuments({ categoryId, isActive: true })
    ]);

    return ApiResponse.success(res, products, 'Category products', {
      page: pageNum, limit: limitNum, total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Get trending products
 */
exports.getTrendingProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find({ isActive: true })
        .populate('categoryId', 'name').populate('brandId', 'name')
        .sort({ sales: -1, rating: -1 }).skip(skip).limit(limitNum).lean(),
      Product.countDocuments({ isActive: true })
    ]);

    return ApiResponse.success(res, products, 'Trending products', {
      page: pageNum, limit: limitNum, total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 9. Get new arrivals
 */
exports.getNewArrivals = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [products, total] = await Promise.all([
      Product.find({ isActive: true, createdAt: { $gte: thirtyDaysAgo } })
        .populate('categoryId', 'name').populate('brandId', 'name')
        .sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Product.countDocuments({ isActive: true, createdAt: { $gte: thirtyDaysAgo } })
    ]);

    return ApiResponse.success(res, products, 'New arrivals', {
      page: pageNum, limit: limitNum, total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 10. Get featured products
 */
exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find({ isActive: true, isFeatured: true })
        .populate('categoryId', 'name').populate('brandId', 'name')
        .sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Product.countDocuments({ isActive: true, isFeatured: true })
    ]);

    return ApiResponse.success(res, products, 'Featured products', {
      page: pageNum, limit: limitNum, total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 11. Add review
 */
exports.addReview = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;

    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid product ID', 400, 'INVALID_ID');
    }

    if (!rating || rating < 1 || rating > 5) {
      throw new ApiError('Rating 1-5', 400, 'INVALID_RATING');
    }

    const product = await Product.findById(productId);
    if (!product) throw new ApiError('Product not found', 404, 'PRODUCT_NOT_FOUND');

    const review = await Review.create({
      productId, userId: req.user._id, rating, comment: comment || ''
    });

    const allReviews = await Review.find({ productId, isActive: true });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await Product.findByIdAndUpdate(productId, { rating: avgRating, reviewCount: allReviews.length });

    return ApiResponse.success(res, review, 'Review added', null, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 12. Get reviews
 */
exports.getReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid product ID', 400, 'INVALID_ID');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      Review.find({ productId, isActive: true })
        .populate('userId', 'username avatar')
        .sort(sort).skip(skip).limit(limitNum).lean(),
      Review.countDocuments({ productId, isActive: true })
    ]);

    return ApiResponse.success(res, reviews, 'Reviews', {
      page: pageNum, limit: limitNum, total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 13. Get search suggestions
 */
exports.getSearchSuggestions = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return ApiResponse.success(res, [], 'Suggestions');
    }

    const suggestions = await Product.distinct('name', {
      name: { $regex: q, $options: 'i' }, isActive: true
    }).limit(10);

    return ApiResponse.success(res, suggestions, 'Suggestions');
  } catch (error) {
    next(error);
  }
};

/**
 * 14. Get trending searches
 */
exports.getTrendingSearches = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const trending = await SearchHistory.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$query', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) || 10 },
      { $project: { _id: 0, query: '$_id', count: 1 } }
    ]);

    return ApiResponse.success(res, trending, 'Trending searches');
  } catch (error) {
    next(error);
  }
};

/**
 * 15. Get filters
 */
exports.getFilters = async (req, res, next) => {
  try {
    const { categoryId } = req.query;
    const filter = { isActive: true };
    if (categoryId) filter.categoryId = categoryId;

    const [priceRange, brands] = await Promise.all([
      Product.aggregate([
        { $match: filter },
        { $group: { _id: null, minPrice: { $min: '$price' }, maxPrice: { $max: '$price' } } }
      ]),
      Product.distinct('brandId', filter)
    ]);

    return ApiResponse.success(res, {
      priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0 },
      brandCount: brands.length
    }, 'Filters');
  } catch (error) {
    next(error);
  }
};

/**
 * 16. Track search interaction
 */
exports.trackSearchInteraction = async (req, res, next) => {
  try {
    const { query, resultCount } = req.body;

    if (!query) throw new ApiError('Query required', 400, 'INVALID_INPUT');

    await SearchHistory.create({
      userId: req.user?._id || null, query, results: resultCount || 0
    });

    return ApiResponse.success(res, null, 'Search tracked');
  } catch (error) {
    next(error);
  }
};

/**
 * 17. Get user recent searches
 */
exports.getUserRecentSearches = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;

    if (!req.user) throw new ApiError('Auth required', 401, 'UNAUTHORIZED');

    const searches = await SearchHistory.find({ userId: req.user._id })
      .sort({ timestamp: -1 }).limit(parseInt(limit) || 5)
      .select('query timestamp').lean();

    return ApiResponse.success(res, searches, 'Recent searches');
  } catch (error) {
    next(error);
  }
};

/**
 * 18. Get categories
 */
exports.getCategories = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [categories, total] = await Promise.all([
      Category.find({ isActive: true })
        .skip(skip).limit(limitNum).lean(),
      Category.countDocuments({ isActive: true })
    ]);

    return ApiResponse.success(res, categories, 'Categories', {
      page: pageNum, limit: limitNum, total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    });
  } catch (error) {
    next(error);
  }
};
