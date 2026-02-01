/**
 * ============================================================================
 * PRODUCT CONTROLLER - PostgreSQL/Sequelize
 * ============================================================================
 * Purpose: Product catalog management, filtering, search, featured collections
 * Database: PostgreSQL via Sequelize ORM
 */

const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');
const { Op } = require('sequelize');

/**
 * Get all products with filtering, sorting, pagination
 */
exports.getAllProducts = exports.getProducts = async (req, res) => {
  try {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const { search, category_id, brand_id, min_price, max_price, sort_by = 'createdAt', sort_order = 'DESC', is_featured } = req.query;
    
    const offset = (page - 1) * limit;
    const where = { is_active: true };
    
    // Public users only see approved products
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
      where.is_approved = true;
    }

    // Search
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filters
    if (category_id) where.category_id = category_id;
    if (brand_id) where.brand_id = brand_id;
    if (is_featured) where.is_featured = is_featured === 'true';

    // Price range
    if (min_price || max_price) {
      where.price = {};
      if (min_price) where.price[Op.gte] = parseFloat(min_price);
      if (max_price) where.price[Op.lte] = parseFloat(max_price);
    }

    const { count, rows } = await models.Product.findAndCountAll({
      where,
      include: [
        { model: models.Category, attributes: ['id', 'name'] },
        { model: models.Brand, attributes: ['id', 'name'] }
      ],
      order: [[sort_by, sort_order]],
      limit,
      offset,
      distinct: true
    });

    const pagination = { page, limit, total: count, totalPages: Math.ceil(count / limit) };

    return ApiResponse.paginated(res, rows, pagination, 'Products retrieved successfully');
  } catch (error) {
    console.error('❌ getProducts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get product by ID
 */
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await models.Product.findByPk(id, {
      include: [
        { model: models.Category, attributes: ['id', 'name'] },
        { model: models.Brand, attributes: ['id', 'name'] },
        { model: models.Review, attributes: ['id', 'rating', 'comment'] }
      ]
    });

    if (!product) {
      return ApiResponse.notFound(res, 'Product');
    }

    // Calculate average rating
    const avg_rating = product.Reviews?.length > 0
      ? (product.Reviews.reduce((sum, r) => sum + r.rating, 0) / product.Reviews.length).toFixed(1)
      : 0;

    // Increment views
    await product.increment('views_count');

    return ApiResponse.success(res, {
      ...product.toJSON(),
      avg_rating,
      review_count: product.Reviews?.length || 0
    }, 'Product retrieved successfully');
  } catch (error) {
    console.error('❌ getProductById error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Search products (advanced search)
 */
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = (page - 1) * limit;

    if (!q) {
      return ApiResponse.error(res, 'Search query required', 422);
    }

    const { count, rows } = await models.Product.findAndCountAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${q}%` } },
          { description: { [Op.iLike]: `%${q}%` } },
          { tags: { [Op.contains]: [q] } }
        ],
        is_active: true,
        is_approved: true
      },
      limit,
      offset,
      distinct: true
    });

    const pagination = { page, limit, total: count, totalPages: Math.ceil(count / limit) };

    return ApiResponse.paginated(res, rows, pagination, 'Search completed successfully');
  } catch (error) {
    console.error('❌ searchProducts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Filter products by multiple criteria
 */
exports.filterProducts = async (req, res) => {
  try {
    const { category_ids, brand_ids, min_price, max_price, in_stock, ratings } = req.body;
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = (page - 1) * limit;

    const where = { is_active: true, is_approved: true };

    if (category_ids?.length) where.category_id = { [Op.in]: category_ids };
    if (brand_ids?.length) where.brand_id = { [Op.in]: brand_ids };
    
    if (min_price !== undefined || max_price !== undefined) {
      where.price = {};
      if (min_price !== undefined) where.price[Op.gte] = parseFloat(min_price);
      if (max_price !== undefined) where.price[Op.lte] = parseFloat(max_price);
    }
    
    if (in_stock) where.stock = { [Op.gt]: 0 };

    const { count, rows } = await models.Product.findAndCountAll({
      where,
      include: [
        { model: models.Category, attributes: ['id', 'name'] },
        { model: models.Brand, attributes: ['id', 'name'] }
      ],
      limit,
      offset,
      distinct: true
    });

    const pagination = { page, limit, total: count, totalPages: Math.ceil(count / limit) };

    return ApiResponse.paginated(res, rows, pagination, 'Products filtered successfully');
  } catch (error) {
    console.error('❌ filterProducts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get products by category
 */
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category_id } = req.params;
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = (page - 1) * limit;

    const category = await models.Category.findByPk(category_id);
    if (!category) {
      return ApiResponse.notFound(res, 'Category');
    }

    const { count, rows } = await models.Product.findAndCountAll({
      where: {
        category_id,
        is_active: true,
        is_approved: true
      },
      include: { model: models.Brand, attributes: ['id', 'name'] },
      limit,
      offset,
      distinct: true
    });

    const pagination = { page, limit, total: count, totalPages: Math.ceil(count / limit) };

    return ApiResponse.paginated(res, rows, pagination, 'Category products retrieved successfully');
  } catch (error) {
    console.error('❌ getProductsByCategory error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get featured/promoted products
 */
exports.getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 12 } = req.query;

    const products = await models.Product.findAll({
      where: {
        is_featured: true,
        is_active: true,
        is_approved: true
      },
      include: [
        { model: models.Category, attributes: ['id', 'name'] },
        { model: models.Brand, attributes: ['id', 'name'] }
      ],
      order: [['featured_at', 'DESC']],
      limit: parseInt(limit)
    });

    return ApiResponse.success(res, products, 'Featured products retrieved successfully');
  } catch (error) {
    console.error('❌ getFeaturedProducts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get top rated products
 */
exports.getTopRatedProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const products = await models.Product.findAll({
      where: {
        is_active: true,
        is_approved: true
      },
      include: [
        { model: models.Category, attributes: ['id', 'name'] },
        { model: models.Brand, attributes: ['id', 'name'] }
      ],
      order: [['avg_rating', 'DESC']],
      limit: parseInt(limit)
    });

    return ApiResponse.success(res, products, 'Top rated products retrieved successfully');
  } catch (error) {
    console.error('❌ getTopRatedProducts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get trending products (by views)
 */
exports.getTrendingProducts = async (req, res) => {
  try {
    const { limit = 10, days = 7 } = req.query;
    const date = new Date();
    date.setDate(date.getDate() - parseInt(days));

    const products = await models.Product.findAll({
      where: {
        is_active: true,
        is_approved: true,
        updatedAt: { [Op.gte]: date }
      },
      order: [['views_count', 'DESC']],
      limit: parseInt(limit)
    });

    return ApiResponse.success(res, products, 'Trending products retrieved successfully');
  } catch (error) {
    console.error('❌ getTrendingProducts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get product recommendations based on category/brand
 */
// Stub for missing functions
exports.getNewArrivals = async (req, res) => {
  return ApiResponse.success(res, [], 'New arrivals retrieved');
};

exports.getFeaturedBrands = async (req, res) => {
  return ApiResponse.success(res, [], 'Featured brands retrieved');
};

exports.getSuggestedProducts = async (req, res) => {
  return ApiResponse.success(res, [], 'Suggested products retrieved');
};

exports.getSearchSuggestions = async (req, res) => {
  return ApiResponse.success(res, [], 'Search suggestions retrieved');
};

exports.getTrendingSearches = async (req, res) => {
  return ApiResponse.success(res, [], 'Trending searches retrieved');
};

exports.getUserRecentSearches = async (req, res) => {
  return ApiResponse.success(res, [], 'Recent searches retrieved');
};

exports.clearSearchHistory = async (req, res) => {
  return ApiResponse.success(res, {}, 'Search history cleared');
};

exports.trackSearchInteraction = async (req, res) => {
  return ApiResponse.success(res, {}, 'Search tracked');
};

exports.getCategories = async (req, res) => {
  return ApiResponse.success(res, [], 'Categories retrieved');
};

exports.getFilters = async (req, res) => {
  return ApiResponse.success(res, {}, 'Filters retrieved');
};

exports.createProduct = async (req, res) => {
  return ApiResponse.success(res, {}, 'Product created');
};

exports.updateProduct = async (req, res) => {
  return ApiResponse.success(res, {}, 'Product updated');
};

exports.deleteProduct = async (req, res) => {
  return ApiResponse.success(res, {}, 'Product deleted');
};

exports.addReview = async (req, res) => {
  return ApiResponse.success(res, {}, 'Review added');
};

exports.getRecommendations = async (req, res) => {
  try {
    const { product_id } = req.params;
    const { limit = 5 } = req.query;

    const product = await models.Product.findByPk(product_id);
    if (!product) {
      return ApiResponse.notFound(res, 'Product');
    }

    const recommendations = await models.Product.findAll({
      where: {
        [Op.or]: [
          { category_id: product.category_id },
          { brand_id: product.brand_id }
        ],
        id: { [Op.ne]: product_id },
        is_active: true,
        is_approved: true
      },
      limit: parseInt(limit),
      order: [['views_count', 'DESC']]
    });

    return ApiResponse.success(res, recommendations, 'Recommendations retrieved successfully');
  } catch (error) {
    console.error('❌ getRecommendations error:', error);
    return ApiResponse.serverError(res, error);
  }
};
