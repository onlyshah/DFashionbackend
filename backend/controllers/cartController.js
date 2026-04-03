/**
 * ============================================================================
 * CART CONTROLLER - PostgreSQL/Sequelize
 * ============================================================================
 * Purpose: Shopping cart CRUD, inventory checks, price calculations
 * Database: PostgreSQL via Sequelize ORM
 */

const dbType = process.env.DB_TYPE || 'mongodb';
const models = dbType.includes('postgres') ? require('../models_sql') : require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');
const { Op } = require('sequelize');
const { formatSingleResponse, buildIncludeClause, validateMultipleFK } = require('../utils/fkResponseFormatter');

// Constants
const TAX_RATE = 0.18; // 18% GST
const FREE_SHIPPING_THRESHOLD = 500;
const STANDARD_SHIPPING = 100;

/**
 * Get user's cart with items and calculations
 */
exports.getCart = async (req, res) => {
  try {
    let cart;
    if (models.isPostgres) {
      cart = await models.Cart.findOne({
        where: { user_id: req.user.id },
        include: {
          model: models.CartItem._model,
          as: 'items',
          include: {
            model: models.Product._model,
            include: [
              { model: models.Brand._model, as: 'brand' },
              { model: models.Category._model, as: 'category' },
              { model: models.User._model, as: 'seller' }
            ]
          }
        }
      });
    } else {
      // MongoDB implementation
      cart = await models.Cart.findOne({ userId: req.user.id })
        .populate({
          path: 'items',
          populate: {
            path: 'product',
            populate: ['brand', 'category', 'seller']
          }
        });
    }

    // If no cart exists, create empty one
    if (!cart) {
      if (models.isPostgres) {
        cart = await models.Cart.create({
          user_id: req.user.id,
          items_count: 0,
          subtotal: 0,
          tax_amount: 0,
          shipping_cost: 0,
          total_amount: 0
        });
        cart.items = [];
      } else {
        cart = await models.Cart.create({
          userId: req.user.id,
          items: [],
          itemsCount: 0,
          subtotal: 0,
          taxAmount: 0,
          shippingCost: 0,
          totalAmount: 0
        });
      }
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of cart.items || []) {
      if (item.Product) {
        subtotal += item.Product.price * item.quantity;
      }
    }

    const tax_amount = subtotal * TAX_RATE;
    const shipping_cost = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
    const total_amount = subtotal + tax_amount + shipping_cost;

    // Format response - removes raw FK IDs from products
    const formattedItems = (cart.items || []).map(item => ({
      id: item.id,
      product: formatSingleResponse(item.Product),  // ← Full product object, not ID
      quantity: item.quantity,
      subtotal: item.Product.price * item.quantity
    }));

    return ApiResponse.success(res, {
      cart_id: cart.id,
      items: formattedItems,
      summary: {
        items_count: formattedItems.length,
        subtotal,
        tax_amount,
        shipping_cost,
        total_amount
      }
    }, 'Cart retrieved successfully');
  } catch (error) {
    console.error('❌ getCart error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Add item to cart
 */
exports.addToCart = async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;

    if (!product_id || quantity < 1) {
      return ApiResponse.error(res, 'Invalid product ID or quantity', 422);
    }

    // VALIDATE foreign keys exist
    const validation = await validateMultipleFK([
      { model: 'User', id: req.user.id },
      { model: 'Product', id: product_id }
    ]);

    if (!validation.isValid) {
      return ApiResponse.error(res, validation.errors.join('; '), 400);
    }

    const product = await models.Product.findByPk(product_id);
    if (!product) {
      return ApiResponse.notFound(res, 'Product');
    }

    if (product.stock < quantity) {
      return ApiResponse.error(res, 'Insufficient stock available', 409);
    }

    let cart = await models.Cart.findOne({
      where: { user_id: req.user.id }
    });

    if (!cart) {
      cart = await models.Cart.create({
        user_id: req.user.id,
        items_count: 0,
        subtotal: 0,
        tax_amount: 0,
        shipping_cost: 0,
        total_amount: 0
      });
    }

    const existingItem = await models.CartItem.findOne({
      where: {
        cart_id: cart.id,
        product_id: product_id
      }
    });

    if (existingItem) {
      const new_quantity = existingItem.quantity + quantity;
      if (new_quantity > product.stock) {
        return ApiResponse.error(res, 'Quantity exceeds available stock', 409);
      }
      await existingItem.update({ quantity: new_quantity });
    } else {
      await models.CartItem.create({
        cart_id: cart.id,
        product_id: product_id,
        quantity
      });
    }

    const updated_cart = await models.Cart.findByPk(cart.id, {
      include: {
        model: models.CartItem,
        as: 'items',
        include: {
          model: models.Product,
          include: buildIncludeClause('Product')  // ← Full product with relationships
        }
      }
    });

    // Format response
    const formattedItems = (updated_cart.items || []).map(item => ({
      id: item.id,
      product: formatSingleResponse(item.Product),
      quantity: item.quantity
    }));

    return ApiResponse.success(res, {
      cart_id: updated_cart.id,
      items: formattedItems
    }, 'Item added to cart');
  } catch (error) {
    console.error('❌ addToCart error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Update cart item quantity
 */
exports.updateCartItem = async (req, res) => {
  try {
    const { item_id } = req.params;
    const { quantity } = req.body;

    if (!item_id || quantity === undefined || quantity < 0) {
      return ApiResponse.error(res, 'Invalid item ID or quantity', 422);
    }

    const cartItem = await models.CartItem.findByPk(item_id, {
      include: [
        { model: models.Cart, attributes: ['user_id'] },
        { model: models.Product, attributes: ['stock'] }
      ]
    });

    if (!cartItem) {
      return ApiResponse.notFound(res, 'Cart item');
    }

    // Verify ownership
    if (cartItem.Cart.user_id !== req.user.id) {
      return ApiResponse.forbidden(res, 'You can only update your own cart');
    }

    // Verify stock
    if (cartItem.Product.stock < quantity) {
      return ApiResponse.error(res, 'Quantity exceeds available stock', 409);
    }

    if (quantity === 0) {
      // Delete item
      await cartItem.destroy();
    } else {
      await cartItem.update({ quantity });
    }

    const cart = await models.Cart.findByPk(cartItem.cart_id, {
      include: {
        model: models.CartItem,
        as: 'items',
        include: { model: models.Product, attributes: ['id', 'name', 'price', 'images'] }
      }
    });

    return ApiResponse.success(res, cart, 'Cart item updated');
  } catch (error) {
    console.error('❌ updateCartItem error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Remove item from cart
 */
exports.removeFromCart = async (req, res) => {
  try {
    const { item_id } = req.params;

    const cartItem = await models.CartItem.findByPk(item_id, {
      include: { model: models.Cart, attributes: ['user_id'] }
    });

    if (!cartItem) {
      return ApiResponse.notFound(res, 'Cart item');
    }

    if (cartItem.Cart.user_id !== req.user.id) {
      return ApiResponse.forbidden(res, 'You can only remove from your own cart');
    }

    const cart_id = cartItem.cart_id;
    await cartItem.destroy();

    const cart = await models.Cart.findByPk(cart_id, {
      include: {
        model: models.CartItem,
        as: 'items',
        include: { model: models.Product, attributes: ['id', 'name', 'price', 'images'] }
      }
    });

    return ApiResponse.success(res, cart, 'Item removed from cart');
  } catch (error) {
    console.error('❌ removeFromCart error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Clear entire cart
 */
exports.clearCart = async (req, res) => {
  try {
    const cart = await models.Cart.findOne({
      where: { user_id: req.user.id }
    });

    if (!cart) {
      return ApiResponse.notFound(res, 'Cart');
    }

    await models.CartItem.destroy({
      where: { cart_id: cart.id }
    });

    const updated_cart = await models.Cart.findByPk(cart.id);
    
    return ApiResponse.success(res, updated_cart, 'Cart cleared');
  } catch (error) {
    console.error('❌ clearCart error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get cart item count
 */
exports.getCartCount = async (req, res) => {
  try {
    const count = await models.CartItem.count({
      include: {
        model: models.Cart,
        where: { user_id: req.user.id },
        attributes: []
      }
    });

    return ApiResponse.success(res, { count }, 'Cart count retrieved');
  } catch (error) {
    console.error('❌ getCartCount error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getCartTotalCount = async (req, res) => {
  try {
    const cart = await models.Cart.findOne({
      where: { user_id: req.user.id },
      include: {
        model: models.CartItem,
        as: 'items'
      }
    });

    const cartItems = cart?.items || [];
    const itemCount = cartItems.length;
    const quantityTotal = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalAmount = cartItems.reduce((sum, item) => sum + ((item.Product?.price || 0) * (item.quantity || 0)), 0);

    const data = {
      cart: {
        itemCount,
        quantityTotal,
        totalAmount
      },
      wishlist: {
        itemCount: 0
      },
      totalCount: quantityTotal,
      showCartTotalPrice: true
    };

    return ApiResponse.success(res, data, 'Cart total count retrieved');
  } catch (error) {
    console.error('❌ getCartTotalCount error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Bulk remove items from cart
 */
// Alias method name for backward compatibility
exports.getCartItemCount = exports.getCartCount;

exports.getCartByVendors = async (req, res) => {
  return ApiResponse.success(res, {}, 'Cart by vendors retrieved');
};

exports.moveToWishlist = async (req, res) => {
  return ApiResponse.success(res, {}, 'Item moved to wishlist');
};

exports.recalculateCart = async (req, res) => {
  return ApiResponse.success(res, {}, 'Cart recalculated');
};

exports.debugCart = async (req, res) => {
  return ApiResponse.success(res, {}, 'Cart debug info');
};

exports.bulkRemoveItems = async (req, res) => {
  try {
    const { item_ids } = req.body;

    if (!Array.isArray(item_ids) || item_ids.length === 0) {
      return ApiResponse.error(res, 'Item IDs array is required', 422);
    }

    // Verify all items belong to user
    const items = await models.CartItem.findAll({
      where: { id: item_ids },
      include: [{ model: models.Cart, attributes: ['user_id'] }, { model: models.Product, attributes: ['id', 'name', 'price'] }]
    });

    for (const item of items) {
      if (item.Cart.user_id !== req.user.id) {
        return ApiResponse.forbidden(res, 'You can only modify your own cart');
      }
    }

    const removed_count = await models.CartItem.destroy({
      where: { id: item_ids }
    });

    const cart = await models.Cart.findOne({
      where: { user_id: req.user.id },
      include: {
        model: models.CartItem,
        as: 'items',
        include: { model: models.Product, attributes: ['id', 'name', 'price', 'images'] }
      }
    });

    return ApiResponse.success(res, {
      removed_count,
      cart
    }, `${removed_count} item(s) removed from cart`);
  } catch (error) {
    console.error('❌ bulkRemoveItems error:', error);
    return ApiResponse.serverError(res, error);
  }
};


