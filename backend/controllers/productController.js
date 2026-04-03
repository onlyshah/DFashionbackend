/**
 * ============================================================================
 * PRODUCT CONTROLLER - Unified Database Support
 * ============================================================================
 * Purpose: Product catalog management, filtering, search, featured collections
 * Database: PostgreSQL/MongoDB via unified models
 */

const dbType = process.env.DB_TYPE || 'mongodb';
const models = dbType.includes('postgres') ? require('../models_sql') : require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');
const { formatPaginatedResponse, formatSingleResponse, validateFK, validateMultipleFK } = require('../utils/fkResponseFormatter');

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

    // Search - handle differently for each database
    if (search) {
      if (models.isPostgres) {
        const { Op } = require('sequelize');
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      } else {
        // MongoDB regex search
        where.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
    }

    // Filters
    if (category_id) where.categoryId = category_id;
    if (brand_id) where.brandId = brand_id;
    if (is_featured) where.is_featured = is_featured === 'true';

    // Price range
    if (min_price || max_price) {
      where.price = {};
      if (models.isPostgres) {
        const { Op } = require('sequelize');
        if (min_price) where.price[Op.gte] = parseFloat(min_price);
        if (max_price) where.price[Op.lte] = parseFloat(max_price);
      } else {
        if (min_price) where.price.$gte = parseFloat(min_price);
        if (max_price) where.price.$lte = parseFloat(max_price);
      }
    }

    let result;
    if (models.isPostgres) {
      // PostgreSQL with includes
      const includeClause = [
        { model: models.Brand._model, as: 'brand', attributes: ['id', 'name'] },
        { model: models.Category._model, as: 'category', attributes: ['id', 'name'] },
        { model: models.User._model, as: 'seller', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: models.Inventory._model, as: 'inventory', attributes: ['id', 'quantity', 'warehouseId'], required: false }
      ];

      result = await models.Product.findAndCountAll({
        where,
        include: includeClause,
        order: [[sort_by, sort_order]],
        limit,
        offset,
        distinct: true
      });
    } else {
      // MongoDB with populates
      const sortOptions = {};
      sortOptions[sort_by] = sort_order === 'DESC' ? -1 : 1;

      result = await models.Product.findAndCountAll({
        where,
        populate: [
          { path: 'brand', select: 'id name' },
          { path: 'category', select: 'id name' },
          { path: 'seller', select: 'id firstName lastName email' },
          { path: 'inventory', select: 'id quantity warehouseId' }
        ],
        sort: sortOptions,
        limit,
        offset
      });
    }

    const pagination = { page, limit, total: result.count, totalPages: Math.ceil(result.count / limit) };

    // Return raw data - formatter disabled during debugging
    return ApiResponse.paginated(res, result.rows, pagination, 'Products retrieved successfully');
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

    let product;
    if (models.isPostgres) {
      // PostgreSQL with includes
      const includeClause = [
        { model: models.Brand._model, as: 'brand', attributes: ['id', 'name'] },
        { model: models.Category._model, as: 'category', attributes: ['id', 'name'] },
        { model: models.User._model, as: 'seller', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: models.Inventory._model, as: 'inventory', attributes: ['id', 'quantity', 'warehouseId'], required: false }
      ];

      product = await models.Product.findByPk(id, { include: includeClause });
    } else {
      // MongoDB with populates
      product = await models.Product.findById(id)
        .populate('brand', 'id name')
        .populate('category', 'id name')
        .populate('seller', 'id firstName lastName email')
        .populate('inventory', 'id quantity warehouseId');
    }

    if (!product) {
      return ApiResponse.notFound(res, 'Product');
    }

    // Calculate average rating (if reviews are included)
    const avg_rating = product.Reviews?.length > 0
      ? (product.Reviews.reduce((sum, r) => sum + r.rating, 0) / product.Reviews.length).toFixed(1)
      : 0;

    // Increment views (handle differently for each database)
    if (models.isPostgres) {
      await product.increment('views_count');
    } else {
      await models.Product.updateOne({ _id: id }, { $inc: { views_count: 1 } });
    }

    // Format response - removes raw FK IDs, includes nested objects
    const response = formatSingleResponse(product);

    return ApiResponse.success(res, {
      ...response,
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

    let result;
    if (models.isPostgres) {
      const { Op } = require('sequelize');
      result = await models.Product.findAndCountAll({
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
    } else {
      // MongoDB search
      const searchRegex = { $regex: q, $options: 'i' };
      result = await models.Product.findAndCountAll({
        where: {
          $or: [
            { name: searchRegex },
            { description: searchRegex },
            { tags: { $in: [q] } }
          ],
          is_active: true,
          is_approved: true
        },
        limit,
        offset
      });
    }

    const pagination = { page, limit, total: result.count, totalPages: Math.ceil(result.count / limit) };

    return ApiResponse.paginated(res, result.rows, pagination, 'Search completed successfully');
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

    if (category_ids?.length) {
      if (models.isPostgres) {
        const { Op } = require('sequelize');
        where.categoryId = { [Op.in]: category_ids };
      } else {
        where.categoryId = { $in: category_ids };
      }
    }
    if (brand_ids?.length) {
      if (models.isPostgres) {
        const { Op } = require('sequelize');
        where.brandId = { [Op.in]: brand_ids };
      } else {
        where.brandId = { $in: brand_ids };
      }
    }

    if (min_price !== undefined || max_price !== undefined) {
      where.price = {};
      if (models.isPostgres) {
        const { Op } = require('sequelize');
        if (min_price !== undefined) where.price[Op.gte] = parseFloat(min_price);
        if (max_price !== undefined) where.price[Op.lte] = parseFloat(max_price);
      } else {
        if (min_price !== undefined) where.price.$gte = parseFloat(min_price);
        if (max_price !== undefined) where.price.$lte = parseFloat(max_price);
      }
    }

    if (in_stock) {
      if (models.isPostgres) {
        const { Op } = require('sequelize');
        where.stock = { [Op.gt]: 0 };
      } else {
        where.stock = { $gt: 0 };
      }
    }

    let result;
    if (models.isPostgres) {
      result = await models.Product.findAndCountAll({
        where,
        include: [
          { model: models.Category._model, as: 'category', attributes: ['id', 'name'], required: false },
          { model: models.Brand._model, as: 'brand', attributes: ['id', 'name'], required: false }
        ],
        limit,
        offset,
        distinct: true
      });
    } else {
      result = await models.Product.findAndCountAll({
        where,
        populate: [
          { path: 'category', select: 'id name' },
          { path: 'brand', select: 'id name' }
        ],
        limit,
        offset
      });
    }

    const pagination = { page, limit, total: result.count, totalPages: Math.ceil(result.count / limit) };

    return ApiResponse.paginated(res, result.rows, pagination, 'Products filtered successfully');
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

    let category;
    if (models.isPostgres) {
      category = await models.Category.findByPk(category_id);
    } else {
      category = await models.Category.findById(category_id);
    }

    if (!category) {
      return ApiResponse.notFound(res, 'Category');
    }

    let result;
    if (models.isPostgres) {
      result = await models.Product.findAndCountAll({
        where: {
          categoryId: category_id,
          is_active: true,
          is_approved: true
        },
        include: { model: models.Brand._model, as: 'brand', attributes: ['id', 'name'] },
        limit,
        offset,
        distinct: true
      });
    } else {
      result = await models.Product.findAndCountAll({
        where: {
          categoryId: category_id,
          is_active: true,
          is_approved: true
        },
        populate: { path: 'brand', select: 'id name' },
        limit,
        offset
      });
    }

    const pagination = { page, limit, total: result.count, totalPages: Math.ceil(result.count / limit) };

    return ApiResponse.paginated(res, result.rows, pagination, 'Category products retrieved successfully');
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

    let products;
    if (models.isPostgres) {
      const includeClause = [
        { model: models.Brand._model, as: 'brand', attributes: ['id', 'name'] },
        { model: models.Category._model, as: 'category', attributes: ['id', 'name'] },
        { model: models.User._model, as: 'seller', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: models.Inventory._model, as: 'inventory', attributes: ['id', 'quantity', 'warehouseId'], required: false }
      ];

      products = await models.Product.findAll({
        where: {
          is_featured: true,
          is_active: true,
          is_approved: true
        },
        include: includeClause,
        order: [['featured_at', 'DESC']],
        limit: parseInt(limit)
      });
    } else {
      products = await models.Product.find({
        is_featured: true,
        is_active: true,
        is_approved: true
      })
      .populate('brand', 'id name')
      .populate('category', 'id name')
      .populate('seller', 'id firstName lastName email')
      .populate('inventory', 'id quantity warehouseId')
      .sort({ featured_at: -1 })
      .limit(parseInt(limit));
    }

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

    let products;
    if (models.isPostgres) {
      const includeClause = [
        { model: models.Brand._model, as: 'brand', attributes: ['id', 'name'] },
        { model: models.Category._model, as: 'category', attributes: ['id', 'name'] },
        { model: models.User._model, as: 'seller', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: models.Inventory._model, as: 'inventory', attributes: ['id', 'quantity', 'warehouseId'], required: false }
      ];

      products = await models.Product.findAll({
        where: {
          is_active: true,
          is_approved: true
        },
        include: includeClause,
        order: [['avg_rating', 'DESC']],
        limit: parseInt(limit)
      });
    } else {
      products = await models.Product.find({
        is_active: true,
        is_approved: true
      })
      .populate('brand', 'id name')
      .populate('category', 'id name')
      .populate('seller', 'id firstName lastName email')
      .populate('inventory', 'id quantity warehouseId')
      .sort({ avg_rating: -1 })
      .limit(parseInt(limit));
    }

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

    let products;
    if (models.isPostgres) {
      const { Op } = require('sequelize');
      const includeClause = [
        { model: models.Brand._model, as: 'brand', attributes: ['id', 'name'] },
        { model: models.Category._model, as: 'category', attributes: ['id', 'name'] },
        { model: models.User._model, as: 'seller', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: models.Inventory._model, as: 'inventory', attributes: ['id', 'quantity', 'warehouseId'], required: false }
      ];

      products = await models.Product.findAll({
        where: {
          is_active: true,
          is_approved: true,
          updatedAt: { [Op.gte]: date }
        },
        include: includeClause,
        order: [['views_count', 'DESC']],
        limit: parseInt(limit)
      });
    } else {
      products = await models.Product.find({
        is_active: true,
        is_approved: true,
        updatedAt: { $gte: date }
      })
      .populate('brand', 'id name')
      .populate('category', 'id name')
      .populate('seller', 'id firstName lastName email')
      .populate('inventory', 'id quantity warehouseId')
      .sort({ views_count: -1 })
      .limit(parseInt(limit));
    }

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
  try {
    const { name, description, price, stock, category_id, brand_id, seller_id, tags = [] } = req.body;

    // validate required fields (simplified)
    if (!name || !price || !category_id || !brand_id || !seller_id) {
      return ApiResponse.error(res, 'Missing required fields', 422);
    }

    // foreign key validation
    const fkResult = await validateMultipleFK([
      { model: 'Category', id: category_id },
      { model: 'Brand', id: brand_id },
      { model: 'User', id: seller_id }
    ]);
    if (!fkResult.isValid) {
      return ApiResponse.error(res, fkResult.errors.join('; '), 400);
    }

    const product = await models.Product.create({
      name,
      description,
      price,
      stock,
      categoryId: category_id,
      brandId: brand_id,
      sellerId: seller_id,
      tags
    });

    let result;
    if (models.isPostgres) {
      const includeClause = [
        { model: models.Brand._model, as: 'brand', attributes: ['id', 'name'] },
        { model: models.Category._model, as: 'category', attributes: ['id', 'name'] },
        { model: models.User._model, as: 'seller', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: models.Inventory._model, as: 'inventory', attributes: ['id', 'quantity', 'warehouseId'], required: false }
      ];
      result = await models.Product.findByPk(product.id, { include: includeClause });
    } else {
      result = await models.Product.findById(product._id)
        .populate('brand', 'id name')
        .populate('category', 'id name')
        .populate('seller', 'id firstName lastName email')
        .populate('inventory', 'id quantity warehouseId');
    }

    return ApiResponse.created(res, formatSingleResponse(result), 'Product created successfully');
  } catch (error) {
    console.error('❌ createProduct error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    let product;
    if (models.isPostgres) {
      product = await models.Product.findByPk(id);
    } else {
      product = await models.Product.findById(id);
    }

    if (!product) {
      return ApiResponse.notFound(res, 'Product');
    }

    // if FK fields are being modified, validate them
    const fkChecks = [];
    if (updates.category_id) fkChecks.push({ model: 'Category', id: updates.category_id });
    if (updates.brand_id) fkChecks.push({ model: 'Brand', id: updates.brand_id });
    if (updates.seller_id) fkChecks.push({ model: 'User', id: updates.seller_id });
    if (fkChecks.length) {
      const fkResult = await validateMultipleFK(fkChecks);
      if (!fkResult.isValid) {
        return ApiResponse.error(res, fkResult.errors.join('; '), 400);
      }
    }

    // Normalize field names for unified interface
    const normalizedUpdates = { ...updates };
    if (updates.category_id) normalizedUpdates.categoryId = updates.category_id;
    if (updates.brand_id) normalizedUpdates.brandId = updates.brand_id;
    if (updates.seller_id) normalizedUpdates.sellerId = updates.seller_id;

    if (models.isPostgres) {
      await product.update(normalizedUpdates);
    } else {
      await models.Product.updateOne({ _id: id }, normalizedUpdates);
    }

    let result;
    if (models.isPostgres) {
      const includeClause = [
        { model: models.Brand._model, as: 'brand', attributes: ['id', 'name'] },
        { model: models.Category._model, as: 'category', attributes: ['id', 'name'] },
        { model: models.User._model, as: 'seller', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: models.Inventory._model, as: 'inventory', attributes: ['id', 'quantity', 'warehouseId'], required: false }
      ];
      result = await models.Product.findByPk(id, { include: includeClause });
    } else {
      result = await models.Product.findById(id)
        .populate('brand', 'id name')
        .populate('category', 'id name')
        .populate('seller', 'id firstName lastName email')
        .populate('inventory', 'id quantity warehouseId');
    }

    return ApiResponse.success(res, formatSingleResponse(result), 'Product updated successfully');
  } catch (error) {
    console.error('❌ updateProduct error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    let product;
    if (models.isPostgres) {
      product = await models.Product.findByPk(id);
    } else {
      product = await models.Product.findById(id);
    }

    if (!product) {
      return ApiResponse.notFound(res, 'Product');
    }

    // check for FK dependencies before deletion
    let dependentCounts;
    if (models.isPostgres) {
      dependentCounts = await Promise.all([
        models.CartItem.count({ where: { productId: id } }),
        models.Wishlist.count({ where: { productId: id } }),
        models.OrderItem ? models.OrderItem.count({ where: { productId: id } }) : Promise.resolve(0),
        models.Inventory.count({ where: { productId: id } }),
        models.ProductComment ? models.ProductComment.count({ where: { productId: id } }) : Promise.resolve(0)
      ]);
    } else {
      dependentCounts = await Promise.all([
        models.CartItem.countDocuments({ productId: id }),
        models.Wishlist.countDocuments({ productId: id }),
        models.OrderItem ? models.OrderItem.countDocuments({ productId: id }) : Promise.resolve(0),
        models.Inventory.countDocuments({ productId: id }),
        models.ProductComment ? models.ProductComment.countDocuments({ productId: id }) : Promise.resolve(0)
      ]);
    }

    const [inCart, inWishlist, inOrder, inInventory, inReview] = dependentCounts;
    if (inCart || inWishlist || inOrder || inInventory || inReview) {
      return ApiResponse.error(res, 'Product has related records and cannot be deleted', 409);
    }

    if (models.isPostgres) {
      await product.destroy();
    } else {
      await models.Product.deleteOne({ _id: id });
    }

    return ApiResponse.success(res, {}, 'Product deleted successfully');
  } catch (error) {
    console.error('❌ deleteProduct error:', error);
    return ApiResponse.serverError(res, error);
  }
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
      include: buildIncludeClause('Product'),
      limit: parseInt(limit),
      order: [['views_count', 'DESC']]
    });

    return ApiResponse.success(res, recommendations, 'Recommendations retrieved successfully');
  } catch (error) {
    console.error('❌ getRecommendations error:', error);
    return ApiResponse.serverError(res, error);
  }
};
