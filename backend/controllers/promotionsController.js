const ServiceLoader = require('../utils/serviceLoader');
const promotionsService = ServiceLoader.getService('promotions');


const { sendResponse, sendError } = require('../utils/response');

class PromotionsController {
  /**
   * Get all promotions
   * GET /
   */
  static async getAllPromotions(req, res) {
    try {
      const { page = 1, limit = 20, status = 'active' } = req.query;
      const promotions = await PromotionsRepository.findAll({ page, limit, status });
      return sendResponse(res, {
        success: true,
        data: promotions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(promotions.total / limit),
          total: promotions.total
        },
        message: 'Promotions retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get promotion by ID
   * GET /:promotionId
   */
  static async getPromotionById(req, res) {
    try {
      const { promotionId } = req.params;
      const promotion = await PromotionsRepository.findById(promotionId);
      if (!promotion) return sendError(res, 'Promotion not found', 404);
      return sendResponse(res, {
        success: true,
        data: promotion,
        message: 'Promotion retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Create a promotion (admin)
   * POST /
   */
  static async createPromotion(req, res) {
    try {
      const { title, description, discount, startDate, endDate, applicableProducts } = req.body;
      const promotion = await PromotionsRepository.create({
        title,
        description,
        discount,
        startDate,
        endDate,
        applicableProducts,
        status: 'active',
        createdAt: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: promotion,
        message: 'Promotion created successfully'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Update a promotion (admin)
   * PUT /:promotionId
   */
  static async updatePromotion(req, res) {
    try {
      const { promotionId } = req.params;
      const updates = req.body;
      const promotion = await PromotionsRepository.update(promotionId, updates);
      if (!promotion) return sendError(res, 'Promotion not found', 404);
      return sendResponse(res, {
        success: true,
        data: promotion,
        message: 'Promotion updated successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Delete a promotion (admin)
   * DELETE /:promotionId
   */
  static async deletePromotion(req, res) {
    try {
      const { promotionId } = req.params;
      await PromotionsRepository.delete(promotionId);
      return sendResponse(res, {
        success: true,
        message: 'Promotion deleted successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get active promotions
   * GET /active
   */
  static async getActivePromotions(req, res) {
    try {
      const { limit = 10 } = req.query;
      const promotions = await PromotionsRepository.getActive(limit);
      return sendResponse(res, {
        success: true,
        data: promotions,
        message: 'Active promotions retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get promotion analytics
   * GET /:promotionId/analytics
   */
  static async getPromotionAnalytics(req, res) {
    try {
      const { promotionId } = req.params;
      const analytics = await PromotionsRepository.getAnalytics(promotionId);
      return sendResponse(res, {
        success: true,
        data: analytics,
        message: 'Promotion analytics retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }
}

module.exports = PromotionsController;
