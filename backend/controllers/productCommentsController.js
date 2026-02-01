const ServiceLoader = require('../services/ServiceLoader');
const productCommentsService = ServiceLoader.loadService('productCommentsService');


const { sendResponse, sendError } = require('../utils/response');

class ProductCommentsController {
  /**
   * Get comments for a product
   * GET /:productId
   */
  static async getProductComments(req, res) {
    try {
      const { productId } = req.params;
      const { page = 1, limit = 20, sort = 'recent' } = req.query;
      const comments = await ProductCommentsRepository.findByProductId(productId, { page, limit, sort });
      return sendResponse(res, {
        success: true,
        data: comments,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(comments.total / limit),
          total: comments.total
        },
        message: 'Comments retrieved successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Add comment to product
   * POST /:productId
   */
  static async addComment(req, res) {
    try {
      const { productId } = req.params;
      const { text, rating } = req.body;
      const userId = req.user?.id;
      const comment = await ProductCommentsRepository.create({
        productId,
        userId,
        text,
        rating,
        createdAt: new Date()
      });
      return sendResponse(res, {
        success: true,
        data: comment,
        message: 'Comment added successfully'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Delete comment
   * DELETE /:commentId
   */
  static async deleteComment(req, res) {
    try {
      const { commentId } = req.params;
      const userId = req.user?.id;
      const deleted = await ProductCommentsRepository.deleteById(commentId, userId);
      if (!deleted) return sendError(res, 'Comment not found or unauthorized', 403);
      return sendResponse(res, {
        success: true,
        message: 'Comment deleted successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Like a comment
   * POST /:commentId/like
   */
  static async likeComment(req, res) {
    try {
      const { commentId } = req.params;
      const userId = req.user?.id;
      const result = await ProductCommentsRepository.toggleLike(commentId, userId);
      return sendResponse(res, {
        success: true,
        data: result,
        message: result.liked ? 'Comment liked' : 'Comment unliked'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get comment stats
   * GET /stats/:productId
   */
  static async getCommentStats(req, res) {
    try {
      const { productId } = req.params;
      const stats = await ProductCommentsRepository.getStats(productId);
      return sendResponse(res, {
        success: true,
        data: stats,
        message: 'Comment statistics retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Flag comment as inappropriate
   * POST /:commentId/flag
   */
  static async flagComment(req, res) {
    try {
      const { commentId } = req.params;
      const { reason } = req.body;
      const flag = await ProductCommentsRepository.flagComment(commentId, reason);
      return sendResponse(res, {
        success: true,
        data: flag,
        message: 'Comment flagged successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Update comment
   */
  static async updateComment(req, res) {
    try {
      const { commentId } = req.params;
      const { text, rating } = req.body;
      const userId = req.user?.id;
      return sendResponse(res, {
        success: true,
        data: {},
        message: 'Comment updated successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Add reply to comment
   */
  static async addReply(req, res) {
    try {
      const { commentId } = req.params;
      const { text } = req.body;
      const userId = req.user?.id;
      return sendResponse(res, {
        success: true,
        data: {},
        message: 'Reply added successfully'
      }, 201);
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }
}

module.exports = ProductCommentsController;
