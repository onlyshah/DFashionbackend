/**
 * ============================================================================
 * PRODUCT CONTROLLER - PostgreSQL (Sequelize) Implementation
 * ============================================================================
 * Production-ready controller for Product entity
 * Uses Sequelize ORM for PostgreSQL database
 * NEVER import MongoDB models or use conditional DB logic here
 */

// Standard API Response Format
const response = {
  success: (res, message, data = null, statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      errorCode: null
    });
  },
  error: (res, message, errorCode, statusCode = 400, data = null) => {
    return res.status(statusCode).json({
      success: false,
      message,
      errorCode,
      data,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get all products with pagination, filtering, and associations
 * 
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 10)
 * - search: string (searches in name, description)
 * - categoryId: UUID
 * - brandId: UUID
 * - sortBy: 'name' | 'price' | 'createdAt' | 'updatedAt'
 * - sortOrder: 'ASC' | 'DESC'
 */
exports.getAll = async (req, res) => {
  try {
    const { Product, Category, Brand } = require('../models');
    
    // Validate models are initialized
    if (!Product || !Product._model) {
      return response.error(res, 'Product model not initialized', 'MODEL_NOT_INITIALIZED', 500);
    }

    const {
      page = 1,
      limit = 10,
      search = '',
      categoryId = null,
      brandId = null,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const whereClause = {};
    if (search) {
      const { Op } = require('sequelize');
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (categoryId) whereClause.categoryId = categoryId;
    if (brandId) whereClause.brandId = brandId;

    // Validate sort
    const validSortFields = ['name', 'price', 'createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = ['ASC', 'DESC'].includes(String(sortOrder).toUpperCase()) ? sortOrder : 'DESC';

    // Query with associations
    const { count, rows } = await Product._model.findAndCountAll({
      where: whereClause,
      include: [
        { 
          association: 'category',
          attributes: ['id', 'name', 'slug']
        },
        { 
          association: 'brand',
          attributes: ['id', 'name', 'logo']
        }
      ],
      order: [[sortField, order]],
      limit: limitNum,
      offset: offset,
      distinct: true
    });

    return response.success(res, 'Products retrieved successfully', {
      products: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(count / limitNum)
      }
    });

  } catch (error) {
    console.error('[ProductController] getAll error:', error);
    return response.error(res, 'Failed to fetch products', 'FETCH_ERROR', 500);
  }
};

/**
 * Get single product by ID with full details and associations
 */
exports.getById = async (req, res) => {
  try {
    const { Product } = require('../models');
    const { id } = req.params;

    // Validate models
    if (!Product || !Product._model) {
      return response.error(res, 'Product model not initialized', 'MODEL_NOT_INITIALIZED', 500);
    }

    // Validate ID
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return response.error(res, 'Product ID is required and must be a valid string', 'INVALID_ID', 400);
    }

    // Fetch product with associations
    const product = await Product._model.findByPk(id, {
      include: [
        { 
          association: 'category',
          attributes: ['id', 'name', 'slug', 'description']
        },
        { 
          association: 'brand',
          attributes: ['id', 'name', 'logo', 'description']
        }
      ]
    });

    if (!product) {
      return response.error(res, `Product with ID '${id}' not found`, 'PRODUCT_NOT_FOUND', 404);
    }

    return response.success(res, 'Product retrieved successfully', product);

  } catch (error) {
    console.error('[ProductController] getById error:', error);
    return response.error(res, 'Failed to fetch product', 'FETCH_ERROR', 500);
  }
};

/**
 * Create new product
 * 
 * Required fields (in request body):
 * - name: string
 * - description: string
 * - price: number
 * - categoryId: UUID
 * - brandId: UUID (optional)
 * 
 * Optional fields:
 * - stock: number
 * - sku: string
 * - image: string (URL)
 */
exports.create = async (req, res) => {
  try {
    const { Product } = require('../models');
    const { name, description, price, categoryId, brandId, stock = 0, sku, image } = req.body;

    // Validate models
    if (!Product || !Product._model) {
      return response.error(res, 'Product model not initialized', 'MODEL_NOT_INITIALIZED', 500);
    }

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return response.error(res, 'Product name is required and must be a non-empty string', 'INVALID_NAME', 400);
    }

    if (!description || typeof description !== 'string' || description.trim() === '') {
      return response.error(res, 'Product description is required and must be a non-empty string', 'INVALID_DESCRIPTION', 400);
    }

    if (price === undefined || price === null || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      return response.error(res, 'Product price is required and must be a positive number', 'INVALID_PRICE', 400);
    }

    if (!categoryId || typeof categoryId !== 'string' || categoryId.trim() === '') {
      return response.error(res, 'Category ID is required and must be a valid string', 'INVALID_CATEGORY_ID', 400);
    }

    // Create product
    const newProduct = await Product._model.create({
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      categoryId,
      brandId: brandId || null,
      stock: Math.max(0, parseInt(stock) || 0),
      sku: sku ? sku.trim() : null,
      image: image ? image.trim() : null
    });

    // Fetch with associations
    const productWithDetails = await Product._model.findByPk(newProduct.id, {
      include: [
        { association: 'category', attributes: ['id', 'name'] },
        { association: 'brand', attributes: ['id', 'name'] }
      ]
    });

    return response.success(res, 'Product created successfully', productWithDetails, 201);

  } catch (error) {
    console.error('[ProductController] create error:', error);
    
    // Handle unique constraint violations
    if (error.name === 'SequelizeUniqueConstraintError') {
      return response.error(res, 'Product with this SKU or name already exists', 'DUPLICATE_ENTRY', 409);
    }

    return response.error(res, 'Failed to create product', 'CREATE_ERROR', 500);
  }
};

/**
 * Update existing product
 * 
 * URL Parameter:
 * - id: UUID
 * 
 * Body (any of these fields):
 * - name: string
 * - description: string
 * - price: number
 * - categoryId: UUID
 * - brandId: UUID
 * - stock: number
 * - sku: string
 * - image: string
 */
exports.update = async (req, res) => {
  try {
    const { Product } = require('../models');
    const { id } = req.params;
    const updateData = req.body;

    // Validate models
    if (!Product || !Product._model) {
      return response.error(res, 'Product model not initialized', 'MODEL_NOT_INITIALIZED', 500);
    }

    // Validate ID
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return response.error(res, 'Product ID is required and must be a valid string', 'INVALID_ID', 400);
    }

    // Check if product exists
    const product = await Product._model.findByPk(id);
    if (!product) {
      return response.error(res, `Product with ID '${id}' not found`, 'PRODUCT_NOT_FOUND', 404);
    }

    // Validate and sanitize update data
    const sanitizedData = {};
    
    if (updateData.name !== undefined) {
      if (typeof updateData.name !== 'string' || updateData.name.trim() === '') {
        return response.error(res, 'Product name must be a non-empty string', 'INVALID_NAME', 400);
      }
      sanitizedData.name = updateData.name.trim();
    }

    if (updateData.description !== undefined) {
      if (typeof updateData.description !== 'string' || updateData.description.trim() === '') {
        return response.error(res, 'Product description must be a non-empty string', 'INVALID_DESCRIPTION', 400);
      }
      sanitizedData.description = updateData.description.trim();
    }

    if (updateData.price !== undefined) {
      if (isNaN(parseFloat(updateData.price)) || parseFloat(updateData.price) < 0) {
        return response.error(res, 'Product price must be a positive number', 'INVALID_PRICE', 400);
      }
      sanitizedData.price = parseFloat(updateData.price);
    }

    if (updateData.categoryId !== undefined) {
      if (typeof updateData.categoryId !== 'string' || updateData.categoryId.trim() === '') {
        return response.error(res, 'Category ID must be a valid string', 'INVALID_CATEGORY_ID', 400);
      }
      sanitizedData.categoryId = updateData.categoryId;
    }

    if (updateData.brandId !== undefined) {
      sanitizedData.brandId = updateData.brandId || null;
    }

    if (updateData.stock !== undefined) {
      sanitizedData.stock = Math.max(0, parseInt(updateData.stock) || 0);
    }

    if (updateData.sku !== undefined) {
      sanitizedData.sku = updateData.sku ? updateData.sku.trim() : null;
    }

    if (updateData.image !== undefined) {
      sanitizedData.image = updateData.image ? updateData.image.trim() : null;
    }

    // Update product
    await product.update(sanitizedData);

    // Fetch updated product with associations
    const updatedProduct = await Product._model.findByPk(id, {
      include: [
        { association: 'category', attributes: ['id', 'name'] },
        { association: 'brand', attributes: ['id', 'name'] }
      ]
    });

    return response.success(res, 'Product updated successfully', updatedProduct);

  } catch (error) {
    console.error('[ProductController] update error:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return response.error(res, 'Product with this SKU or name already exists', 'DUPLICATE_ENTRY', 409);
    }

    return response.error(res, 'Failed to update product', 'UPDATE_ERROR', 500);
  }
};

/**
 * Delete product by ID
 * 
 * URL Parameter:
 * - id: UUID
 */
exports.delete = async (req, res) => {
  try {
    const { Product } = require('../models');
    const { id } = req.params;

    // Validate models
    if (!Product || !Product._model) {
      return response.error(res, 'Product model not initialized', 'MODEL_NOT_INITIALIZED', 500);
    }

    // Validate ID
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return response.error(res, 'Product ID is required and must be a valid string', 'INVALID_ID', 400);
    }

    // Find and delete product
    const product = await Product._model.findByPk(id);
    if (!product) {
      return response.error(res, `Product with ID '${id}' not found`, 'PRODUCT_NOT_FOUND', 404);
    }

    await product.destroy();

    return response.success(res, 'Product deleted successfully', {
      id: id,
      deletedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[ProductController] delete error:', error);
    return response.error(res, 'Failed to delete product', 'DELETE_ERROR', 500);
  }
};

module.exports = exports;


