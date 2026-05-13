/**
 * ============================================================================
 * PROMOTIONS CONTROLLER - PostgreSQL/Sequelize Version
 * ============================================================================
 * Purpose: Promotional campaign management
 * Database: PostgreSQL via Sequelize ORM
 * Methods: 7
 */

const { Op } = require('sequelize');
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Get all promotions
 */
exports.getAllPromotions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'active' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = {};
    if (status) where.status = status;

    const { count, rows } = await models.Promotion.findAndCountAll({
      where,
      offset,
      limit: parseInt(limit),
      order: [['startDate', 'DESC']],
      distinct: true
    });

    const pagination = { currentPage: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)), total: count };
    return ApiResponse.paginated(res, rows, pagination, 'Promotions retrieved successfully');
  } catch (error) {
    console.error('❌ getAllPromotions error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get promotion by ID
 */
exports.getPromotionById = async (req, res) => {
  try {
    const { promotionId } = req.params;

    const promotion = await models.Promotion.findByPk(promotionId, {
      include: [{
        model: models.Product,
        as: 'applicableProducts',
        through: { attributes: [] }
      }]
    });

    if (!promotion) return ApiResponse.notFound(res, 'Promotion');

    return ApiResponse.success(res, promotion.toJSON(), 'Promotion retrieved successfully');
  } catch (error) {
    console.error('❌ getPromotionById error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Create a promotion (admin)
 */
exports.createPromotion = async (req, res) => {
  try {
    const { title, description, discount, startDate, endDate, applicableProducts, status = 'active' } = req.body;

    if (!title || !discount) {
      return ApiResponse.error(res, 'Title and discount are required', 422);
    }

    const promotion = await models.Promotion.create({
      title,
      description,
      discount: parseFloat(discount),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status,
      createdAt: new Date()
    });

    if (applicableProducts && Array.isArray(applicableProducts)) {
      await promotion.addProducts(applicableProducts);
    }

    return ApiResponse.created(res, promotion.toJSON(), 'Promotion created successfully');
  } catch (error) {
    console.error('❌ createPromotion error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Update a promotion (admin)
 */
exports.updatePromotion = async (req, res) => {
  try {
    const { promotionId } = req.params;
    const { title, description, discount, startDate, endDate, status, applicableProducts } = req.body;

    const promotion = await models.Promotion.findByPk(promotionId);
    if (!promotion) return ApiResponse.notFound(res, 'Promotion');

    await promotion.update({
      title: title !== undefined ? title : promotion.title,
      description: description !== undefined ? description : promotion.description,
      discount: discount !== undefined ? parseFloat(discount) : promotion.discount,
      startDate: startDate !== undefined ? new Date(startDate) : promotion.startDate,
      endDate: endDate !== undefined ? new Date(endDate) : promotion.endDate,
      status: status !== undefined ? status : promotion.status
    });

    if (applicableProducts && Array.isArray(applicableProducts)) {
      await promotion.setProducts(applicableProducts);
    }

    return ApiResponse.success(res, promotion.toJSON(), 'Promotion updated successfully');
  } catch (error) {
    console.error('❌ updatePromotion error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Delete a promotion (admin)
 */
exports.deletePromotion = async (req, res) => {
  try {
    const { promotionId } = req.params;

    const promotion = await models.Promotion.findByPk(promotionId);
    if (!promotion) return ApiResponse.notFound(res, 'Promotion');

    await promotion.destroy();

    return ApiResponse.success(res, {}, 'Promotion deleted successfully');
  } catch (error) {
    console.error('❌ deletePromotion error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get active promotions
 */
exports.getActivePromotions = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const now = new Date();

    const promotions = await models.Promotion.findAll({
      where: {
        status: 'active',
        startDate: { [Op.lte]: now },
        endDate: { [Op.gte]: now }
      },
      limit: parseInt(limit),
      order: [['startDate', 'DESC']]
    });

    return ApiResponse.success(res, promotions, 'Active promotions retrieved');
  } catch (error) {
    console.error('❌ getActivePromotions error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get promotion analytics
 */
exports.getPromotionAnalytics = async (req, res) => {
  try {
    const { promotionId } = req.params;

    const promotion = await models.Promotion.findByPk(promotionId);
    if (!promotion) return ApiResponse.notFound(res, 'Promotion');

    const analytics = {
      promotionId,
      title: promotion.title,
      discount: promotion.discount,
      activationCount: 0,
      usageCount: 0,
      revenue: 0,
      averageDiscount: promotion.discount
    };

    return ApiResponse.success(res, analytics, 'Promotion analytics retrieved');
  } catch (error) {
    console.error('❌ getPromotionAnalytics error:', error);
    return ApiResponse.serverError(res, error);
  }
};


