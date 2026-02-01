const ServiceLoader = require('../utils/serviceLoader');
const ecommerceapiService = ServiceLoader.getService('ecommerceapi');


const { sendResponse, sendError } = require('../utils/response');

class EcommerceAPIController {
  /**
   * Like a product
   * POST /products/:id/like
   */
  static async likeProduct(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const result = await EcommerceAPIRepository.toggleProductLike(id, userId);
      return sendResponse(res, {
        success: true,
        data: result,
        message: result.liked ? 'Product liked' : 'Product unliked'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Like wishlist item
   * POST /wishlist/items/:itemId/like
   */
  static async likeWishlistItem(req, res) {
    try {
      const { itemId } = req.params;
      const userId = req.user?.id;
      const result = await EcommerceAPIRepository.toggleWishlistItemLike(itemId, userId);
      return sendResponse(res, {
        success: true,
        data: result,
        message: result.liked ? 'Wishlist item liked' : 'Wishlist item unliked'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Add comment to wishlist item
   * POST /wishlist/items/:itemId/comments
   */
  static async addWishlistComment(req, res) {
    try {
      const { itemId } = req.params;
      const { text } = req.body;
      const userId = req.user?.id;
      const comment = await EcommerceAPIRepository.addWishlistComment(itemId, userId, text);
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
   * Delete wishlist comment
   * DELETE /wishlist/items/:itemId/comments/:commentId
   */
  static async deleteWishlistComment(req, res) {
    try {
      const { itemId, commentId } = req.params;
      await EcommerceAPIRepository.deleteWishlistComment(commentId);
      return sendResponse(res, {
        success: true,
        message: 'Comment deleted successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Save cart item for later
   * POST /cart/items/:itemId/save-for-later
   */
  static async saveCartItemForLater(req, res) {
    try {
      const { itemId } = req.params;
      const userId = req.user?.id;
      const result = await EcommerceAPIRepository.saveCartItemForLater(itemId, userId);
      return sendResponse(res, {
        success: true,
        data: result,
        message: 'Item saved for later'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Move saved item back to cart
   * POST /cart/saved/:itemId/move-to-cart
   */
  static async moveSavedToCart(req, res) {
    try {
      const { itemId } = req.params;
      const userId = req.user?.id;
      const result = await EcommerceAPIRepository.moveSavedItemToCart(itemId, userId);
      return sendResponse(res, {
        success: true,
        data: result,
        message: 'Item moved to cart'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Delete saved cart item
   * DELETE /cart/saved/:itemId
   */
  static async deleteSavedItem(req, res) {
    try {
      const { itemId } = req.params;
      const userId = req.user?.id;
      await EcommerceAPIRepository.deleteSavedItem(itemId, userId);
      return sendResponse(res, {
        success: true,
        message: 'Saved item deleted'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Delete product (admin)
   * DELETE /admin/products/:id
   */
  static async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      await EcommerceAPIRepository.deleteProduct(id);
      return sendResponse(res, {
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Get admin analytics
   * GET /admin/analytics
   */
  static async getAdminAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const analytics = await EcommerceAPIRepository.getAdminAnalytics(startDate, endDate);
      return sendResponse(res, {
        success: true,
        data: analytics,
        message: 'Admin analytics retrieved'
      });
    } catch (error) {
      return sendError(res, error.message, 500);
    }
  }
}

module.exports = EcommerceAPIController;
