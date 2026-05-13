/**
 * ============================================================================
 * BRANDS CONTROLLER - PostgreSQL/Sequelize Version
 * ============================================================================
 * Purpose: Brand management and brand-product relationships
 * Database: PostgreSQL via Sequelize ORM
 * Methods: 7
 */

const { Op } = require('sequelize');
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Get all brands
 */
exports.getAllBrands = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = {};
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    const { count, rows } = await models.Brand.findAndCountAll({
      where,
      offset,
      limit: parseInt(limit),
      order: [['name', 'ASC']],
      distinct: true
    });

    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
      total: count
    };

    return ApiResponse.paginated(res, rows, pagination, 'Brands retrieved successfully');
  } catch (error) {
    console.error('❌ getAllBrands error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get brand by ID
 */
exports.getBrandById = async (req, res) => {
  try {
    const { brandId } = req.params;

    const brand = await models.Brand.findByPk(brandId, {
      include: [{
        model: models.Product,
        as: 'products',
        attributes: ['id', 'name', 'price', 'imageUrl'],
        limit: 5
      }]
    });

    if (!brand) {
      return ApiResponse.notFound(res, 'Brand');
    }

    return ApiResponse.success(res, brand.toJSON(), 'Brand retrieved successfully');
  } catch (error) {
    console.error('❌ getBrandById error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Create a new brand (admin)
 */
exports.createBrand = async (req, res) => {
  try {
    const { name, description, logo, website } = req.body;

    if (!name) {
      return ApiResponse.error(res, 'Brand name is required', 422);
    }

    const brand = await models.Brand.create({
      name,
      description,
      logo,
      website,
      createdAt: new Date()
    });

    return ApiResponse.created(res, brand.toJSON(), 'Brand created successfully');
  } catch (error) {
    console.error('❌ createBrand error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Update a brand (admin)
 */
exports.updateBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { name, description, logo, website } = req.body;

    const brand = await models.Brand.findByPk(brandId);
    if (!brand) {
      return ApiResponse.notFound(res, 'Brand');
    }

    await brand.update({
      name: name !== undefined ? name : brand.name,
      description: description !== undefined ? description : brand.description,
      logo: logo !== undefined ? logo : brand.logo,
      website: website !== undefined ? website : brand.website
    });

    return ApiResponse.success(res, brand.toJSON(), 'Brand updated successfully');
  } catch (error) {
    console.error('❌ updateBrand error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Delete a brand (admin)
 */
exports.deleteBrand = async (req, res) => {
  try {
    const { brandId } = req.params;

    const brand = await models.Brand.findByPk(brandId);
    if (!brand) {
      return ApiResponse.notFound(res, 'Brand');
    }

    // Check for associated products
    const productCount = await models.Product.count({
      where: { brandId }
    });

    if (productCount > 0) {
      return ApiResponse.error(res, `Cannot delete brand with ${productCount} associated products`, 400);
    }

    await brand.destroy();

    return ApiResponse.success(res, {}, 'Brand deleted successfully');
  } catch (error) {
    console.error('❌ deleteBrand error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get popular brands
 */
exports.getPopularBrands = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const brands = await models.Brand.findAll({
      include: [{
        model: models.Product,
        as: 'products',
        attributes: ['id'],
        required: false
      }],
      order: [[models.sequelize.fn('COUNT', models.sequelize.col('products.id')), 'DESC']],
      group: ['Brand.id'],
      subQuery: false,
      limit: parseInt(limit),
      attributes: ['id', 'name', 'logo', 'description']
    });

    return ApiResponse.success(res, brands, 'Popular brands retrieved');
  } catch (error) {
    console.error('❌ getPopularBrands error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get brand products
 */
exports.getBrandProducts = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const brand = await models.Brand.findByPk(brandId);
    if (!brand) {
      return ApiResponse.notFound(res, 'Brand');
    }

    const { count, rows } = await models.Product.findAndCountAll({
      where: { brandId },
      offset,
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']],
      distinct: true
    });

    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
      total: count
    };

    return ApiResponse.paginated(res, rows, pagination, 'Brand products retrieved');
  } catch (error) {
    console.error('❌ getBrandProducts error:', error);
    return ApiResponse.serverError(res, error);
  }
};


