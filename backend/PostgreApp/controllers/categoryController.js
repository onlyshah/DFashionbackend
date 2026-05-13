/**
 * ============================================================================
 * CATEGORY CONTROLLER - PostgreSQL/Sequelize Version
 * ============================================================================
 * Purpose: Category management and product filtering
 * Database: PostgreSQL via Sequelize ORM
 * Methods: 10
 */

const { Op } = require('sequelize');
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validateFK } = require('../utils/fkResponseFormatter');

/**
 * Get all categories
 */
exports.getAllCategories = async (req, res) => {
  try {
    const { limit = 50, level = 'parent' } = req.query;
    console.log('🔍 getAllCategories called with:', { limit, level });

    const categories = await models.Category.findAll({
      where: level === 'parent' ? { parentId: null } : {},
      limit: parseInt(limit),
      order: [['name', 'ASC']],
      raw: true
    });

    console.log('🔍 getAllCategories PostgreSQL returned:', categories.length, 'categories');
    return ApiResponse.success(res, categories, 'Categories retrieved successfully');
  } catch (error) {
    console.error('❌ getAllCategories error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get category by slug
 */
exports.getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await models.Category.findOne({
      where: { slug },
      include: [{
        model: models.Category,
        as: 'SubCategories',
        attributes: ['id', 'name', 'slug']
      }]
    });

    if (!category) {
      return ApiResponse.notFound(res, 'Category');
    }

    const subcategories = await models.Category.findAll({
      where: { parentId: category.id },
      attributes: ['id', 'name', 'slug', 'description'],
      raw: true
    });

    return ApiResponse.success(res, {
      category: category.toJSON(),
      subcategories
    }, 'Category retrieved successfully');
  } catch (error) {
    console.error('❌ getCategoryBySlug error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get category with products
 */
exports.getCategoryProducts = async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 20, sort = 'createdAt' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const category = await models.Category.findOne({
      where: { slug }
    });

    if (!category) {
      return ApiResponse.notFound(res, 'Category');
    }

    const sortOrder = sort.startsWith('-') ? 'DESC' : 'ASC';
    const sortField = sort.replace('-', '');

    const { count, rows } = await models.Product.findAndCountAll({
      where: { categoryId: category.id },
      order: [[sortField, sortOrder]],
      offset,
      limit: parseInt(limit),
      raw: true,
      distinct: true
    });

    const pagination = {
      currentPage: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / parseInt(limit))
    };

    return ApiResponse.paginated(res, rows, pagination, 'Products retrieved successfully');
  } catch (error) {
    console.error('❌ getCategoryProducts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Create category (admin)
 */
exports.createCategory = async (req, res) => {
  try {
    const { name, description, slug, parentId, icon, color } = req.body;

    if (!name || !slug) {
      return ApiResponse.error(res, 'Name and slug are required', 422);
    }

    const existing = await models.Category.findOne({
      where: { slug }
    });

    if (existing) {
      return ApiResponse.error(res, 'Slug already exists', 409);
    }

    // Validate parent FK if provided
    if (parentId) {
      const parentExists = await models.Category.findByPk(parentId);
      if (!parentExists) {
        return ApiResponse.error(res, 'Parent category not found', 422);
      }
    }

    const category = await models.Category.create({
      name,
      description,
      slug,
      parentId: parentId || null,
      icon,
      color
    });

    return ApiResponse.created(res, category.toJSON(), 'Category created successfully');
  } catch (error) {
    console.error('❌ createCategory error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Update category (admin)
 */
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, slug, parentId, icon, color } = req.body;

    const category = await models.Category.findByPk(id);
    if (!category) {
      return ApiResponse.notFound(res, 'Category');
    }

    // Validate parent FK if provided
    if (parentId && parentId !== category.parentId) {
      const parentExists = await models.Category.findByPk(parentId);
      if (!parentExists) {
        return ApiResponse.error(res, 'Parent category not found', 422);
      }
    }

    // Check for slug uniqueness
    if (slug && slug !== category.slug) {
      const slugExists = await models.Category.findOne({
        where: { slug }
      });
      if (slugExists) {
        return ApiResponse.error(res, 'Slug already exists', 409);
      }
    }

    await category.update({
      name: name !== undefined ? name : category.name,
      description: description !== undefined ? description : category.description,
      slug: slug !== undefined ? slug : category.slug,
      parentId: parentId !== undefined ? parentId : category.parentId,
      icon: icon !== undefined ? icon : category.icon,
      color: color !== undefined ? color : category.color
    });

    return ApiResponse.success(res, category.toJSON(), 'Category updated successfully');
  } catch (error) {
    console.error('❌ updateCategory error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Delete category (admin)
 */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await models.Category.findByPk(id);
    if (!category) {
      return ApiResponse.notFound(res, 'Category');
    }

    // Check for product count
    const productCount = await models.Product.count({
      where: { categoryId: id }
    });

    if (productCount > 0) {
      return ApiResponse.error(res, `Cannot delete category with ${productCount} products`, 400);
    }

    // Check for subcategories
    const childCount = await models.Category.count({
      where: { parentId: id }
    });

    if (childCount > 0) {
      return ApiResponse.error(res, `Cannot delete category with ${childCount} subcategories`, 400);
    }

    await category.destroy();

    return ApiResponse.success(res, {}, 'Category deleted successfully');
  } catch (error) {
    console.error('❌ deleteCategory error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get category by ID
 */
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await models.Category.findByPk(id, {
      include: [{
        model: models.Category,
        as: 'SubCategories',
        attributes: ['id', 'name', 'slug']
      }]
    });

    if (!category) {
      return ApiResponse.notFound(res, 'Category');
    }

    return ApiResponse.success(res, category.toJSON(), 'Category retrieved successfully');
  } catch (error) {
    console.error('❌ getCategoryById error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Generate invoice (utility)
 */
exports.generateInvoice = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await models.Category.findByPk(categoryId);
    if (!category) {
      return ApiResponse.notFound(res, 'Category');
    }

    const productCount = await models.Product.count({
      where: { categoryId }
    });

    const invoice = {
      categoryId,
      categoryName: category.name,
      productCount,
      generatedAt: new Date().toISOString()
    };

    return ApiResponse.success(res, invoice, 'Invoice generated successfully');
  } catch (error) {
    console.error('❌ generateInvoice error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Verify payment (utility)
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return ApiResponse.error(res, 'Transaction ID required', 422);
    }

    // Placeholder verification logic
    const verified = true;

    return ApiResponse.success(res, {
      transactionId,
      verified,
      timestamp: new Date().toISOString()
    }, 'Payment verified');
  } catch (error) {
    console.error('❌ verifyPayment error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Handle webhook (utility)
 */
exports.handleWebhook = async (req, res) => {
  try {
    const { event, data } = req.body;

    if (!event) {
      return ApiResponse.error(res, 'Event type required', 422);
    }

    console.log('🔄 Webhook event received:', event);

    return ApiResponse.success(res, {
      event,
      status: 'processed',
      timestamp: new Date().toISOString()
    }, 'Webhook handled successfully');
  } catch (error) {
    console.error('❌ handleWebhook error:', error);
    return ApiResponse.serverError(res, error);
  }
};


