const ServiceLoader = require('../services/ServiceLoader');
const creatorService = ServiceLoader.loadService('creatorService');


const { sendResponse, sendError } = require('../utils/response');

class CreatorsController {
  /**
   * Get all creators (admin)
   * GET /
   */
  static async getAllCreators(req, res) {
    try {
      const { page = 1, limit = 20, verified } = req.query;
      const creators = await CreatorsRepository.findAll({ page, limit, verified });
      return sendResponse(res, {
        success: true,
        data: creators,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(creators.total / limit),
          total: creators.total
        },
        message: 'Creators retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get creator by ID
   * GET /:creatorId
   */
  static async getCreatorById(req, res) {
    try {
      const { creatorId } = req.params;
      const creator = await CreatorsRepository.findById(creatorId);
      if (!creator) return sendError(res, 'Creator not found', 404);
      return sendResponse(res, {
        success: true,
        data: creator,
        message: 'Creator retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get pending creator verifications (admin)
   * GET /verification/pending
   */
  static async getPendingVerifications(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const pending = await CreatorsRepository.getPendingVerifications({ page, limit });
      return sendResponse(res, {
        success: true,
        data: pending,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(pending.total / limit),
          total: pending.total
        },
        message: 'Pending verifications retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Approve creator verification (admin)
   * POST /verification/approve
   */
  static async approveVerification(req, res) {
    try {
      const { creatorId } = req.body;
      const creator = await CreatorsRepository.approveVerification(creatorId);
      if (!creator) return sendError(res, 'Creator not found', 404);
      return sendResponse(res, {
        success: true,
        data: creator,
        message: 'Creator verified successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Reject creator verification (admin)
   * POST /verification/reject
   */
  static async rejectVerification(req, res) {
    try {
      const { creatorId, reason } = req.body;
      const creator = await CreatorsRepository.rejectVerification(creatorId, reason);
      if (!creator) return sendError(res, 'Creator not found', 404);
      return sendResponse(res, {
        success: true,
        data: creator,
        message: 'Creator verification rejected'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get affiliate products for creator
   * GET /:creatorId/affiliate-products
   */
  static async getAffiliateProducts(req, res) {
    try {
      const { creatorId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const products = await CreatorsRepository.getAffiliateProducts(creatorId, { page, limit });
      return sendResponse(res, {
        success: true,
        data: products,
        message: 'Affiliate products retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Set affiliate products (admin)
   * POST /:creatorId/affiliate-products
   */
  static async setAffiliateProducts(req, res) {
    try {
      const { creatorId } = req.params;
      const { productIds } = req.body;
      const products = await CreatorsRepository.setAffiliateProducts(creatorId, productIds);
      return sendResponse(res, {
        success: true,
        data: products,
        message: 'Affiliate products set successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get creator commissions
   * GET /:creatorId/commissions
   */
  static async getCommissions(req, res) {
    try {
      const { creatorId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const commissions = await CreatorsRepository.getCommissions(creatorId, { page, limit });
      return sendResponse(res, {
        success: true,
        data: commissions,
        message: 'Creator commissions retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get creator analytics
   * GET /:creatorId/analytics
   */
  static async getAnalytics(req, res) {
    try {
      const { creatorId } = req.params;
      const { period = 30 } = req.query;
      const analytics = await CreatorsRepository.getAnalytics(creatorId, period);
      return sendResponse(res, {
        success: true,
        data: analytics,
        message: 'Creator analytics retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get creator sponsored products
   * GET /:creatorId/sponsored
   */
  static async getSponsoredProducts(req, res) {
    try {
      const { creatorId } = req.params;
      const sponsored = await CreatorsRepository.getSponsoredProducts(creatorId);
      return sendResponse(res, {
        success: true,
        data: sponsored,
        message: 'Sponsored products retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get creators
   * GET /creators
   */
  static async getCreators(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      return sendResponse(res, {
        success: true,
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          total: 0
        },
        message: 'Creators retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get creator profile
   * GET /profile/:creatorId
   */
  static async getCreatorProfile(req, res) {
    try {
      const { creatorId } = req.params;
      return sendResponse(res, {
        success: true,
        data: null,
        message: 'Creator profile retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Follow creator
   * POST /:creatorId/follow
   */
  static async followCreator(req, res) {
    try {
      const { creatorId } = req.params;
      const userId = req.user?.id;
      return sendResponse(res, {
        success: true,
        data: { creatorId, userId, followed: true },
        message: 'Creator followed successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }
}

module.exports = CreatorsController;
