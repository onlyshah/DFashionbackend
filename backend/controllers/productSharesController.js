const ServiceLoader = require('../services/ServiceLoader');
const productSharesService = ServiceLoader.loadService('productSharesService');


const { sendResponse, sendError } = require('../utils/response');

class ProductSharesController {
  /**
   * Get shares for a product
   * GET /:productId
   */
  static async getProductShares(req, res) {
    try {
      const { productId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const shares = await ProductSharesRepository.findByProductId(productId, { page, limit });
      return sendResponse(res, {
        success: true,
        data: shares,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(shares.total / limit),
          total: shares.total
        },
        message: 'Shares retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Create a product share link
   * POST /:productId
   */
  static async createShare(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user?.id;
      const share = await ProductSharesRepository.create({
        productId,
        userId,
        shortUrl: `share-${Date.now()}`,
        createdAt: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: share,
        message: 'Share link created successfully'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get share by short URL
   * GET /link/:shortUrl
   */
  static async getShareByUrl(req, res) {
    try {
      const { shortUrl } = req.params;
      const share = await ProductSharesRepository.findByShortUrl(shortUrl);
      if (!share) return sendError(res, 'Share link not found', 404);
      return sendResponse(res, {
        success: true,
        data: share,
        message: 'Share link retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Track share link click
   * POST /link/:shortUrl/click
   */
  static async trackShareClick(req, res) {
    try {
      const { shortUrl } = req.params;
      const result = await ProductSharesRepository.trackClick(shortUrl);
      if (!result) return sendError(res, 'Share link not found', 404);
      return sendResponse(res, {
        success: true,
        data: result,
        message: 'Click tracked successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Delete a share
   * DELETE /:shareId
   */
  static async deleteShare(req, res) {
    try {
      const { shareId } = req.params;
      await ProductSharesRepository.delete(shareId);
      return sendResponse(res, {
        success: true,
        message: 'Share deleted successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Like a share
   * POST /:shareId/like
   */
  static async likeShare(req, res) {
    try {
      const { shareId } = req.params;
      const userId = req.user?.id;
      const result = await ProductSharesRepository.toggleLike(shareId, userId);
      return sendResponse(res, {
        success: true,
        data: result,
        message: result.liked ? 'Share liked' : 'Share unliked'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get share analytics
   * GET /:shareId/analytics
   */
  static async getShareAnalytics(req, res) {
    try {
      const { shareId } = req.params;
      const analytics = await ProductSharesRepository.getAnalytics(shareId);
      return sendResponse(res, {
        success: true,
        data: analytics,
        message: 'Share analytics retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }
}

module.exports = ProductSharesController;
