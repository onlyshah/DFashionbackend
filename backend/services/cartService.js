/**
 * ============================================================================
 * UNIFIED CART SERVICE - PostgreSQL with Adapter Pattern
 * ============================================================================
 * Purpose: Manages shopping cart operations
 * Uses: PostgreSQL adapter (DB-agnostic)
 * 
 * Architecture: Single service file, uses adapter for all DB operations
 * Migration: Combines logic from:
 *   - services/postgres/cartService.js (PostgreSQL)
 *   - services/mongodb/cartService.js (MongoDB - disabled)
 */

const db = require('./adapters');
const BaseService = require('./postgres/BaseService');

class CartService extends BaseService {
  constructor() {
    super(db.Cart, 'Cart');
    this.CartItem = db.CartItem;
    this.Product = db.Product;
    this.User = db.User;
    this.Op = db.Op;
  }

  /**
   * Get user's cart with items and product details
   */
  async getCartByUserId(userId, options = {}) {
    try {
      await this.db.ensureModelsReady();

      const cart = await this.model.findOne({
        where: { user_id: userId },
        include: [
          {
            model: this.CartItem,
            as: 'items',
            include: [
              {
                model: this.Product,
                as: 'product',
                attributes: ['id', 'name', 'selling_price', 'base_price', 'image_url']
              }
            ]
          }
        ],
        ...options
      });

      if (!cart) {
        return { success: true, data: null, message: 'Cart not found' };
      }

      // Calculate totals
      const items = cart.items || [];
      const subtotal = items.reduce((sum, item) => {
        const price = item.product?.selling_price || 0;
        return sum + (price * item.quantity);
      }, 0);

      return {
        success: true,
        data: {
          ...cart.toJSON(),
          summary: {
            itemCount: items.length,
            subtotal: parseFloat(subtotal.toFixed(2)),
            tax: 0,
            total: parseFloat(subtotal.toFixed(2))
          }
        }
      };
    } catch (error) {
      console.error('[CartService] getCartByUserId error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(userId, productId, quantity = 1) {
    try {
      await this.db.ensureModelsReady();

      // Validate product exists
      const product = await this.Product.findByPk(productId);
      if (!product) {
        return { success: false, error: 'Product not found', statusCode: 404 };
      }

      // Validate quantity
      if (product.quantity_available < quantity) {
        return { success: false, error: 'Insufficient stock', statusCode: 400 };
      }

      // Get or create cart
      let cart = await this.model.findOne({ where: { user_id: userId } });
      if (!cart) {
        cart = await this.model.create({ user_id: userId });
      }

      // Check if product already in cart
      let cartItem = await this.CartItem.findOne({
        where: { cart_id: cart.id, product_id: productId }
      });

      if (cartItem) {
        // Update quantity (idempotent - increment instead of blocking)
        cartItem.quantity += quantity;
        await cartItem.save();
        return {
          success: true,
          data: cartItem,
          message: 'Product quantity updated in cart',
          itemExists: true
        };
      }

      // Create new cart item
      cartItem = await this.CartItem.create({
        cart_id: cart.id,
        product_id: productId,
        quantity,
        price: product.selling_price
      });

      return {
        success: true,
        data: cartItem,
        message: 'Product added to cart',
        itemExists: false
      };
    } catch (error) {
      console.error('[CartService] addToCart error:', error.message);
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(userId, productId) {
    try {
      await this.db.ensureModelsReady();

      const cart = await this.model.findOne({ where: { user_id: userId } });
      if (!cart) {
        return { success: false, error: 'Cart not found', statusCode: 404 };
      }

      const cartItem = await this.CartItem.findOne({
        where: { cart_id: cart.id, product_id: productId }
      });

      if (!cartItem) {
        return { success: true, message: 'Item not found in cart', statusCode: 404 };
      }

      await cartItem.destroy();
      return { success: true, message: 'Item removed from cart' };
    } catch (error) {
      console.error('[CartService] removeFromCart error:', error.message);
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItemQuantity(userId, productId, quantity) {
    try {
      await this.db.ensureModelsReady();

      if (quantity <= 0) {
        return this.removeFromCart(userId, productId);
      }

      const cart = await this.model.findOne({ where: { user_id: userId } });
      if (!cart) {
        return { success: false, error: 'Cart not found', statusCode: 404 };
      }

      const cartItem = await this.CartItem.findOne({
        where: { cart_id: cart.id, product_id: productId }
      });

      if (!cartItem) {
        return { success: false, error: 'Item not in cart', statusCode: 404 };
      }

      cartItem.quantity = quantity;
      await cartItem.save();

      return {
        success: true,
        data: cartItem,
        message: 'Cart item quantity updated'
      };
    } catch (error) {
      console.error('[CartService] updateCartItemQuantity error:', error.message);
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(userId) {
    try {
      await this.db.ensureModelsReady();

      const cart = await this.model.findOne({ where: { user_id: userId } });
      if (!cart) {
        return { success: true, message: 'Cart already empty' };
      }

      await this.CartItem.destroy({ where: { cart_id: cart.id } });
      return { success: true, message: 'Cart cleared' };
    } catch (error) {
      console.error('[CartService] clearCart error:', error.message);
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  /**
   * Get cart count
   */
  async getCartCount(userId) {
    try {
      await this.db.ensureModelsReady();

      const cart = await this.model.findOne({ where: { user_id: userId } });
      if (!cart) {
        return { success: true, count: 0 };
      }

      const count = await this.CartItem.count({ where: { cart_id: cart.id } });
      return { success: true, count };
    } catch (error) {
      console.error('[CartService] getCartCount error:', error.message);
      return { success: false, error: error.message, count: 0 };
    }
  }
}

module.exports = new CartService();
