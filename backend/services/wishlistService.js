/**
 * ============================================================================
 * UNIFIED WISHLIST SERVICE - PostgreSQL with Adapter Pattern
 * ============================================================================
 * Purpose: Manages user wishlist operations
 * Uses: PostgreSQL adapter (DB-agnostic)
 * 
 * Architecture: Single service file, uses adapter for all DB operations
 * Migration: Combines logic from:
 *   - services/postgres/wishlistService.js (PostgreSQL)
 *   - services/mongodb/wishlistService.js (MongoDB - disabled)
 */

const db = require('./adapters');
const BaseService = require('./postgres/BaseService');

class WishlistService extends BaseService {
  constructor() {
    super(db.Wishlist, 'Wishlist');
    this.Product = db.Product;
    this.User = db.User;
    this.Op = db.Op;
  }

  /**
   * Get user's wishlist with products
   */
  async getWishlistByUserId(userId, options = {}) {
    try {
      await this.db.ensureModelsReady();

      const wishlistItems = await this.model.findAll({
        where: { user_id: userId },
        include: [
          {
            model: this.Product,
            as: 'product',
            attributes: ['id', 'name', 'selling_price', 'base_price', 'image_url', 'rating']
          }
        ],
        order: [['createdAt', 'DESC']],
        ...options
      });

      return {
        success: true,
        data: wishlistItems,
        count: wishlistItems.length
      };
    } catch (error) {
      console.error('[WishlistService] getWishlistByUserId error:', error.message);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Add product to wishlist
   */
  async addToWishlist(userId, productId) {
    try {
      await this.db.ensureModelsReady();

      // Validate product exists
      const product = await this.Product.findByPk(productId);
      if (!product) {
        return { success: false, error: 'Product not found', statusCode: 404 };
      }

      // Check if already in wishlist
      const existing = await this.model.findOne({
        where: { user_id: userId, product_id: productId }
      });

      if (existing) {
        // Idempotent: return success even if already exists
        return {
          success: true,
          data: existing,
          message: 'Product is in wishlist',
          itemExists: true
        };
      }

      // Add to wishlist
      const wishlistItem = await this.model.create({
        user_id: userId,
        product_id: productId
      });

      return {
        success: true,
        data: wishlistItem,
        message: 'Product added to wishlist',
        itemExists: false
      };
    } catch (error) {
      console.error('[WishlistService] addToWishlist error:', error.message);
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  /**
   * Remove product from wishlist
   */
  async removeFromWishlist(userId, productId) {
    try {
      await this.db.ensureModelsReady();

      const wishlistItem = await this.model.findOne({
        where: { user_id: userId, product_id: productId }
      });

      if (!wishlistItem) {
        // Idempotent: return success even if not found
        return { success: true, message: 'Product not in wishlist', statusCode: 404 };
      }

      await wishlistItem.destroy();
      return { success: true, message: 'Product removed from wishlist' };
    } catch (error) {
      console.error('[WishlistService] removeFromWishlist error:', error.message);
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  /**
   * Check if product is in wishlist
   */
  async isInWishlist(userId, productId) {
    try {
      await this.db.ensureModelsReady();

      const item = await this.model.findOne({
        where: { user_id: userId, product_id: productId }
      });

      return { success: true, inWishlist: !!item };
    } catch (error) {
      console.error('[WishlistService] isInWishlist error:', error.message);
      return { success: false, error: error.message, inWishlist: false };
    }
  }

  /**
   * Get wishlist count
   */
  async getWishlistCount(userId) {
    try {
      await this.db.ensureModelsReady();

      const count = await this.model.count({ where: { user_id: userId } });
      return { success: true, count };
    } catch (error) {
      console.error('[WishlistService] getWishlistCount error:', error.message);
      return { success: false, error: error.message, count: 0 };
    }
  }

  /**
   * Clear entire wishlist
   */
  async clearWishlist(userId) {
    try {
      await this.db.ensureModelsReady();

      await this.model.destroy({ where: { user_id: userId } });
      return { success: true, message: 'Wishlist cleared' };
    } catch (error) {
      console.error('[WishlistService] clearWishlist error:', error.message);
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  /**
   * Move item from wishlist to cart
   */
  async moveToCart(userId, productId) {
    try {
      await this.db.ensureModelsReady();

      // Remove from wishlist
      const removeResult = await this.removeFromWishlist(userId, productId);
      if (!removeResult.success) {
        return removeResult;
      }

      // Add to cart (use CartService)
      const CartService = require('./cartService');
      const addResult = await CartService.addToCart(userId, productId, 1);
      
      return {
        success: addResult.success,
        message: 'Product moved to cart',
        data: addResult.data
      };
    } catch (error) {
      console.error('[WishlistService] moveToCart error:', error.message);
      return { success: false, error: error.message, statusCode: 500 };
    }
  }
}

module.exports = new WishlistService();
