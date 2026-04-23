/**
 * PostgreSQL Wishlist Service
 * Sequelize-backed wishlist operations for PostgreSQL only.
 */

const models = require('../../models_sql');

class WishlistService {
  static async getWishlistByUserId(userId, options = {}) {
    try {
      const Wishlist = models._raw?.Wishlist || models.Wishlist;
      const Product = models._raw?.Product || models.Product;

      const result = await Wishlist.findAndCountAll({
        where: { userId },
        include: [
          {
            model: Product,
            as: 'product',
            required: false
          }
        ],
        order: [['addedAt', 'DESC']],
        ...options
      });

      return {
        success: true,
        data: result.rows,
        count: result.count
      };
    } catch (error) {
      console.error('[WishlistService-PostgreSQL] getWishlistByUserId error:', error.message);
      return { success: false, error: error.message, data: [], count: 0 };
    }
  }

  static async addToWishlist(userId, productId) {
    try {
      const Wishlist = models._raw?.Wishlist || models.Wishlist;
      const Product = models._raw?.Product || models.Product;

      const product = await Product.findByPk(productId);
      if (!product) {
        return { success: false, error: 'Product not found', statusCode: 404 };
      }

      const existing = await Wishlist.findOne({ where: { userId, productId } });
      if (existing) {
        return {
          success: false,
          error: 'Already in wishlist',
          data: existing,
          statusCode: 409
        };
      }

      const wishlistItem = await Wishlist.create({
        userId,
        productId,
        addedAt: new Date()
      });

      return {
        success: true,
        data: wishlistItem,
        statusCode: 201
      };
    } catch (error) {
      console.error('[WishlistService-PostgreSQL] addToWishlist error:', error.message);
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  static async removeFromWishlist(userId, productId) {
    try {
      const Wishlist = models._raw?.Wishlist || models.Wishlist;
      const deletedCount = await Wishlist.destroy({ where: { userId, productId } });

      return {
        success: true,
        removed: deletedCount > 0
      };
    } catch (error) {
      console.error('[WishlistService-PostgreSQL] removeFromWishlist error:', error.message);
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  static async isInWishlist(userId, productId) {
    try {
      const Wishlist = models._raw?.Wishlist || models.Wishlist;
      const item = await Wishlist.findOne({ where: { userId, productId } });

      return { success: true, inWishlist: !!item };
    } catch (error) {
      console.error('[WishlistService-PostgreSQL] isInWishlist error:', error.message);
      return { success: false, error: error.message, inWishlist: false };
    }
  }

  static async getWishlistCount(userId) {
    try {
      const Wishlist = models._raw?.Wishlist || models.Wishlist;
      const count = await Wishlist.count({ where: { userId } });
      return { success: true, count };
    } catch (error) {
      console.error('[WishlistService-PostgreSQL] getWishlistCount error:', error.message);
      return { success: false, error: error.message, count: 0 };
    }
  }
}

module.exports = WishlistService;
