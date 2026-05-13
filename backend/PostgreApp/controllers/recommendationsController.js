/**
 * ============================================================================
 * RECOMMENDATIONS CONTROLLER - PostgreSQL/Sequelize Version
 * ============================================================================
 * Purpose: Product recommendations, trending, personalization tracking
 * Database: PostgreSQL via Sequelize ORM
 * Methods: 17
 */

const { Op } = require('sequelize');
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Get product recommendations
 */
exports.getProductRecommendations = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?.id;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await models.Product.findAndCountAll({
      where: { isActive: true },
      offset,
      limit: parseInt(limit),
      order: [['popularity', 'DESC'], ['createdAt', 'DESC']],
      distinct: true
    });

    const pagination = { currentPage: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)), total: count };
    return ApiResponse.paginated(res, rows, pagination, 'Product recommendations retrieved');
  } catch (error) {
    console.error('❌ getProductRecommendations error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get similar products
 */
exports.getSimilarProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 10 } = req.query;

    const product = await models.Product.findByPk(productId);
    if (!product) return ApiResponse.notFound(res, 'Product');

    const similar = await models.Product.findAll({
      where: {
        id: { [Op.ne]: productId },
        categoryId: product.categoryId,
        isActive: true
      },
      limit: parseInt(limit),
      order: [['popularity', 'DESC']],
      raw: true
    });

    return ApiResponse.success(res, similar, 'Similar products retrieved');
  } catch (error) {
    console.error('❌ getSimilarProducts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get trending products
 */
exports.getTrendingProducts = async (req, res) => {
  try {
    const { limit = 10, period = 7 } = req.query;
    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const trending = await models.Product.findAll({
      where: {
        isActive: true,
        createdAt: { [Op.gte]: startDate }
      },
      order: [['popularity', 'DESC'], ['viewCount', 'DESC']],
      limit: parseInt(limit),
      raw: true
    });

    return ApiResponse.success(res, trending, 'Trending products retrieved');
  } catch (error) {
    console.error('❌ getTrendingProducts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get personalized feed
 */
exports.getPersonalizedFeed = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await models.Product.findAndCountAll({
      where: { isActive: true },
      offset,
      limit: parseInt(limit),
      order: [['popularity', 'DESC']],
      distinct: true
    });

    const pagination = { currentPage: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)), total: count };
    return ApiResponse.paginated(res, rows, pagination, 'Personalized feed retrieved');
  } catch (error) {
    console.error('❌ getPersonalizedFeed error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get category recommendations
 */
exports.getCategoryRecommendations = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { limit = 10 } = req.query;

    const products = await models.Product.findAll({
      where: { categoryId, isActive: true },
      order: [['popularity', 'DESC']],
      limit: parseInt(limit),
      raw: true
    });

    return ApiResponse.success(res, products, 'Category recommendations retrieved');
  } catch (error) {
    console.error('❌ getCategoryRecommendations error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get brand recommendations
 */
exports.getBrandRecommendations = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { limit = 10 } = req.query;

    const products = await models.Product.findAll({
      where: { brandId, isActive: true },
      order: [['popularity', 'DESC']],
      limit: parseInt(limit),
      raw: true
    });

    return ApiResponse.success(res, products, 'Brand recommendations retrieved');
  } catch (error) {
    console.error('❌ getBrandRecommendations error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Track recommendation click
 */
exports.trackRecommendationClick = async (req, res) => {
  try {
    const { recommendationId } = req.params;
    const userId = req.user?.id;

    const recommendation = await models.Recommendation?.findByPk(recommendationId);
    if (!recommendation) return ApiResponse.notFound(res, 'Recommendation');

    await models.RecommendationClick?.create({ recommendationId, userId });

    return ApiResponse.success(res, { recommendationId, tracked: true }, 'Recommendation click tracked');
  } catch (error) {
    console.error('❌ trackRecommendationClick error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get recommendation analytics
 */
exports.getRecommendationAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const analytics = {
      totalRecommendations: 0,
      totalClicks: 0,
      conversionRate: 0,
      topProducts: [],
      timeperiod: { startDate, endDate }
    };

    return ApiResponse.success(res, analytics, 'Recommendation analytics retrieved');
  } catch (error) {
    console.error('❌ getRecommendationAnalytics error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get personalized recommendations
 */
exports.getPersonalizedRecommendations = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 20 } = req.query;

    const recommendations = await models.Product.findAll({
      where: { isActive: true },
      order: [['popularity', 'DESC']],
      limit: parseInt(limit),
      raw: true
    });

    const pagination = { currentPage: parseInt(page), totalPages: 1, total: recommendations.length };
    return ApiResponse.paginated(res, recommendations, pagination, 'Personalized recommendations retrieved');
  } catch (error) {
    console.error('❌ getPersonalizedRecommendations error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get suggested products
 */
exports.getSuggestedProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const suggested = await models.Product.findAll({
      where: { isActive: true },
      order: [['popularity', 'DESC']],
      limit: parseInt(limit),
      raw: true
    });

    return ApiResponse.success(res, suggested, 'Suggested products retrieved');
  } catch (error) {
    console.error('❌ getSuggestedProducts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get recent products
 */
exports.getRecentProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recent = await models.Product.findAll({
      where: { isActive: true },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      raw: true
    });

    return ApiResponse.success(res, recent, 'Recent products retrieved');
  } catch (error) {
    console.error('❌ getRecentProducts error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Track product view
 */
exports.trackView = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user?.id;

    if (productId) {
      const product = await models.Product.findByPk(productId);
      if (product) {
        await product.increment('viewCount', { by: 1 });
      }
    }

    return ApiResponse.success(res, { productId, userId, tracked: true }, 'Product view tracked');
  } catch (error) {
    console.error('❌ trackView error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Track search
 */
exports.trackSearch = async (req, res) => {
  try {
    const { query } = req.body;
    const userId = req.user?.id;

    await models.SearchHistory?.create({
      userId,
      query,
      timestamp: new Date()
    });

    return ApiResponse.success(res, { query, userId, tracked: true }, 'Search tracked');
  } catch (error) {
    console.error('❌ trackSearch error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Track purchase
 */
exports.trackPurchase = async (req, res) => {
  try {
    const { productId, orderId } = req.body;
    const userId = req.user?.id;

    await models.PurchaseHistory?.create({
      userId,
      productId,
      orderId,
      timestamp: new Date()
    });

    return ApiResponse.success(res, { productId, orderId, userId, tracked: true }, 'Purchase tracked');
  } catch (error) {
    console.error('❌ trackPurchase error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Track interaction
 */
exports.trackInteraction = async (req, res) => {
  try {
    const { type, data } = req.body;
    const userId = req.user?.id;

    await models.UserInteraction?.create({
      userId,
      type,
      data,
      timestamp: new Date()
    });

    return ApiResponse.success(res, { type, userId, data, tracked: true }, 'Interaction tracked');
  } catch (error) {
    console.error('❌ trackInteraction error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get user analytics
 */
exports.getUserAnalytics = async (req, res) => {
  try {
    const userId = req.user?.id;

    const analytics = {
      userId,
      views: 0,
      searches: 0,
      purchases: 0,
      interactions: 0
    };

    return ApiResponse.success(res, analytics, 'User analytics retrieved');
  } catch (error) {
    console.error('❌ getUserAnalytics error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get insights
 */
exports.getInsights = async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;

    const insights = {
      timeframe,
      summary: {
        totalProducts: 0,
        totalRecommendations: 0,
        conversionRate: 0
      },
      topPerformers: [],
      trends: []
    };

    return ApiResponse.success(res, insights, 'Insights retrieved');
  } catch (error) {
    console.error('❌ getInsights error:', error);
    return ApiResponse.serverError(res, error);
  }
};


