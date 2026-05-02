/**
 * ============================================================================
 * CART MODEL - Smart Database Switcher
 * ============================================================================
 * This is the main entry point for Cart operations.
 * Routes requests to either MongoDB or PostgreSQL implementation
 * based on DB_TYPE environment variable.
 * 
 * Usage:
 *   const Cart = require('../models/Cart');
 *   const cart = await Cart.getCartByUserId(userId);
 */

const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();

let CartModel;
let RawCartModel; // Keep raw model separate

if (DB_TYPE.includes('postgres')) {
  // PostgreSQL via Sequelize - lazy loaded after DB initialization
  CartModel = null;
  RawCartModel = null;
  
  module.exports = {
    /**
     * Lazy getter that loads the PostgreSQL Cart model
     * This is called after models initialization in models/index.js
     */
    _setPostgresModel: (model) => {
      RawCartModel = model;
      // Immediately wrap to provide methods
      CartModel = model;
    },

    /**
     * Get user's cart with items and product details
     */
    getCartByUserId: async (userId) => {
      if (!RawCartModel) throw new Error('Cart model not initialized');
      return RawCartModel.getCartByUserId(userId);
    },

    /**
     * Add item to cart
     */
    addToCart: async (userId, cartData) => {
      if (!RawCartModel) throw new Error('Cart model not initialized');
      return RawCartModel.addToCart(userId, cartData);
    },

    /**
     * Remove item from cart
     */
    removeFromCart: async (userId, itemId) => {
      if (!RawCartModel) throw new Error('Cart model not initialized');
      return RawCartModel.removeFromCart(userId, itemId);
    },

    /**
     * Update cart item quantity
     */
    updateCartItem: async (userId, itemId, quantity) => {
      if (!RawCartModel) throw new Error('Cart model not initialized');
      return RawCartModel.updateCartItem(userId, itemId, quantity);
    },

    /**
     * Clear all items from cart
     */
    clearCart: async (userId) => {
      if (!RawCartModel) throw new Error('Cart model not initialized');
      return RawCartModel.clearCart(userId);
    },

    /**
     * Get cart item count (unique items)
     */
    getCartCount: async (userId) => {
      if (!RawCartModel) throw new Error('Cart model not initialized');
      return RawCartModel.getCartCount(userId);
    },

    /**
     * Get total items count in cart (sum of quantities)
     */
    getCartTotalCount: async (userId) => {
      if (!RawCartModel) throw new Error('Cart model not initialized');
      return RawCartModel.getCartTotalCount(userId);
    },

    /**
     * Bulk remove items from cart
     */
    bulkRemoveItems: async (userId, itemIds) => {
      if (!RawCartModel) throw new Error('Cart model not initialized');
      return RawCartModel.bulkRemoveItems(userId, itemIds);
    }
  };
} else if (DB_TYPE.includes('mongo')) {
  // MongoDB - load directly
  CartModel = require('../models_mongo/Cart');

  module.exports = {
    /**
     * Get user's cart with items and product details
     */
    getCartByUserId: (userId) => CartModel.getCartByUserId(userId),

    /**
     * Add item to cart
     */
    addToCart: (userId, cartData) => CartModel.addToCart(userId, cartData),

    /**
     * Remove item from cart
     */
    removeFromCart: (userId, itemId) => CartModel.removeFromCart(userId, itemId),

    /**
     * Update cart item quantity
     */
    updateCartItem: (userId, itemId, quantity) => CartModel.updateCartItem(userId, itemId, quantity),

    /**
     * Clear all items from cart
     */
    clearCart: (userId) => CartModel.clearCart(userId),

    /**
     * Get cart item count (unique items)
     */
    getCartCount: (userId) => CartModel.getCartCount(userId),

    /**
     * Get total items count in cart (sum of quantities)
     */
    getCartTotalCount: (userId) => CartModel.getCartTotalCount(userId),

    /**
     * Bulk remove items from cart
     */
    bulkRemoveItems: (userId, itemIds) => CartModel.bulkRemoveItems(userId, itemIds)
  };
} else {
  throw new Error(`Unsupported DB_TYPE: ${DB_TYPE}. Must be 'postgres' or 'mongo'.`);
}
