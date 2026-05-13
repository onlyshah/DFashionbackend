/**
 * ============================================================================
 * CART CONTROLLER - PostgreSQL/Sequelize Implementation
 * ============================================================================
 * Purpose: Shopping cart CRUD, inventory checks, price calculations
 * Database: PostgreSQL via Sequelize ORM
 * 
 * Methods:
 * 1. getCart() - Fetch user's cart with items and totals
 * 2. addToCart() - Add product to cart
 * 3. updateCartItem() - Update quantity
 * 4. removeFromCart() - Remove item
 * 5. clearCart() - Remove all items
 * 6. getCartCount() - Count of unique items
 * 7. getCartTotalCount() - Items + wishlist count
 * 8. getCartItemCount() - Alias for getCartCount
 * 9. getCartByVendors() - Group by vendor
 * 10. moveToWishlist() - Move item to wishlist
 * 11. recalculateCart() - Recalculate totals
 * 12. debugCart() - Debug endpoint
 * 13. bulkRemoveItems() - Bulk delete items
 */

const { Op } = require('sequelize');
const ApiResponse = require('../utils/ApiResponse');

// Constants for calculations
const TAX_RATE = 0.18; // 18% GST
const FREE_SHIPPING_THRESHOLD = 500;
const STANDARD_SHIPPING = 100;

/**
 * Helper: Check if table exists in PostgreSQL
 */
const hasTable = async (sequelize, tableName) => {
  try {
    const result = await sequelize.query(
      'SELECT to_regclass(:tableName) as table_name',
      { replacements: { tableName: `public.${tableName}` }, type: sequelize.QueryTypes.SELECT }
    );
    return !!result[0]?.table_name;
  } catch (err) {
    console.error(`[CartController-Postgres] Error checking table ${tableName}:`, err.message);
    return false;
  }
};

/**
 * Helper: Build SQL for product images
 */
const buildImagesSelectClause = (hasProductImagesTable) => {
  if (!hasProductImagesTable) {
    return "'[]'::json as images";
  }
  return `COALESCE(
    (
      SELECT json_agg(pi.url ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.created_at ASC)
      FROM product_images pi
      WHERE pi.product_id = p.id
    ),
    '[]'::json
  ) as images`;
};

/**
 * Helper: Format cart items with calculations
 */
const formatCartItems = (cartItems) => {
  let subtotal = 0;
  const formattedItems = cartItems.map(item => {
    const itemPrice = item.price || item.product_price || 0;
    const itemSubtotal = itemPrice * item.quantity;
    subtotal += itemSubtotal;

    return {
      id: item.id,
      product: item.product_id ? {
        id: item.product_id,
        name: item.name,
        price: item.product_price,
        images: item.images
      } : null,
      quantity: item.quantity,
      price: itemPrice,
      selectedColor: item.selected_color,
      selectedSize: item.selected_size,
      subtotal: itemSubtotal
    };
  });

  return { formattedItems, subtotal };
};

/**
 * Helper: Load legacy cart items
 */
const loadLegacyCartItems = async (sequelize, userId, hasProductImagesTable) => {
  try {
    return await sequelize.query(
      `SELECT c.id, c.quantity, c.price, c.product_id,
              p.id as product_id, p.name, p.price as product_price,
              ${buildImagesSelectClause(hasProductImagesTable)}
       FROM carts c
       LEFT JOIN products p ON c.product_id = p.id
       WHERE c.user_id = :userId AND c.product_id IS NOT NULL`,
      { replacements: { userId }, type: sequelize.QueryTypes.SELECT }
    );
  } catch (err) {
    console.warn(`[CartController-Postgres] Error loading legacy cart items:`, err.message);
    return [];
  }
};

/**
 * Helper: Extract item ID from request
 */
const extractItemId = (req) => req.params.itemId || req.params.item_id || req.body.itemId || req.body.item_id;

/**
 * METHOD 1: Get user's cart with items and calculations
 */
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sequelize } = require('../models');

    if (!sequelize) {
      console.error('[CartController-Postgres] Sequelize instance not found');
      return ApiResponse.error(res, 'Database connection error', 500, 'DB_CONNECTION_ERROR');
    }

    const hasProductImagesTable = await hasTable(sequelize, 'product_images');

    // Get cart ID
    const cartResult = await sequelize.query(
      'SELECT id FROM carts WHERE user_id = :userId',
      { replacements: { userId }, type: sequelize.QueryTypes.SELECT }
    );

    if (!cartResult || cartResult.length === 0) {
      return ApiResponse.success(res, {
        cartId: null,
        items: [],
        summary: {
          itemsCount: 0,
          subtotal: 0,
          taxAmount: 0,
          shippingCost: STANDARD_SHIPPING,
          totalAmount: STANDARD_SHIPPING
        }
      }, 'Cart is empty');
    }

    const cartId = cartResult[0].id;

    // Get cart items with products
    const cartItems = await sequelize.query(
      `SELECT ci.id, ci.quantity, ci.price, ci.product_id,
              ci.selected_color, ci.selected_size,
              p.id as product_id, p.name, p.price as product_price,
              ${buildImagesSelectClause(hasProductImagesTable)}
       FROM cart_items ci
       LEFT JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = :cartId`,
      { replacements: { cartId }, type: sequelize.QueryTypes.SELECT }
    );

    if (!cartItems || cartItems.length === 0) {
      // Try loading legacy items
      const legacyItems = await loadLegacyCartItems(sequelize, userId, hasProductImagesTable);
      if (legacyItems && legacyItems.length > 0) {
        const { formattedItems, subtotal } = formatCartItems(legacyItems);
        const taxAmount = subtotal * TAX_RATE;
        const shippingCost = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
        const totalAmount = subtotal + taxAmount + shippingCost;

        return ApiResponse.success(res, {
          cartId: cartId,
          items: formattedItems,
          summary: {
            itemsCount: formattedItems.length,
            subtotal: parseFloat(subtotal.toFixed(2)),
            taxAmount: parseFloat(taxAmount.toFixed(2)),
            shippingCost,
            totalAmount: parseFloat(totalAmount.toFixed(2))
          }
        }, 'Cart retrieved successfully');
      }

      return ApiResponse.success(res, {
        cartId: cartId,
        items: [],
        summary: {
          itemsCount: 0,
          subtotal: 0,
          taxAmount: 0,
          shippingCost: STANDARD_SHIPPING,
          totalAmount: STANDARD_SHIPPING
        }
      }, 'Cart is empty');
    }

    // Calculate totals
    const { formattedItems, subtotal } = formatCartItems(cartItems);
    const taxAmount = subtotal * TAX_RATE;
    const shippingCost = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
    const totalAmount = subtotal + taxAmount + shippingCost;

    return ApiResponse.success(res, {
      cartId: cartId,
      items: formattedItems,
      summary: {
        itemsCount: formattedItems.length,
        subtotal: parseFloat(subtotal.toFixed(2)),
        taxAmount: parseFloat(taxAmount.toFixed(2)),
        shippingCost: shippingCost,
        totalAmount: parseFloat(totalAmount.toFixed(2))
      }
    }, 'Cart retrieved successfully');
  } catch (error) {
    console.error('[CartController-Postgres] getCart error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 2: Add item to cart
 */
exports.addToCart = async (req, res) => {
  try {
    const productId = req.body.product_id || req.body.productId;
    const quantity = req.body.quantity || 1;
    const userId = req.user.id;

    console.log('[CartController-Postgres] addToCart:', { productId, quantity, userId });

    if (!productId || quantity < 1) {
      return ApiResponse.error(res, 'Invalid product ID or quantity', 422, 'INVALID_PRODUCT_OR_QUANTITY');
    }

    const { Product, Cart } = require('../models');

    if (!Product || !Product._model || !Cart || !Cart._model) {
      console.error('[CartController-Postgres] Models not initialized');
      return ApiResponse.error(res, 'Models not initialized', 500, 'MODELS_NOT_INITIALIZED');
    }

    // Validate product exists
    const product = await Product._model.findByPk(productId);
    if (!product) {
      return ApiResponse.notFound(res, 'Product', 'PRODUCT_NOT_FOUND');
    }

    // Check stock
    if ((product.stock || 0) < quantity) {
      return ApiResponse.error(res, 'Insufficient stock', 409, 'INSUFFICIENT_STOCK');
    }

    // Get or create user cart
    let cart = await Cart._model.findOne({ where: { user_id: userId } });
    if (!cart) {
      cart = await Cart._model.create({ user_id: userId });
    }

    // Check if item already in cart
    const CartItem = require('../models').CartItem;
    if (CartItem && CartItem._model) {
      const existingItem = await CartItem._model.findOne({
        where: { cart_id: cart.id, product_id: productId }
      });

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if ((product.stock || 0) < newQuantity) {
          return ApiResponse.error(res, 'Insufficient stock for total quantity', 409, 'INSUFFICIENT_STOCK');
        }
        await existingItem.update({ quantity: newQuantity });
      } else {
        await CartItem._model.create({
          cart_id: cart.id,
          product_id: productId,
          quantity,
          price: product.price
        });
      }
    }

    // Return updated cart
    const { sequelize } = require('../models');
    const hasProductImagesTable = await hasTable(sequelize, 'product_images');
    const cartItems = await sequelize.query(
      `SELECT ci.id, ci.quantity, ci.price, ci.product_id,
              ci.selected_color, ci.selected_size,
              p.id as product_id, p.name, p.price as product_price,
              ${buildImagesSelectClause(hasProductImagesTable)}
       FROM cart_items ci
       LEFT JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = :cartId`,
      { replacements: { cartId: cart.id }, type: sequelize.QueryTypes.SELECT }
    );

    const { formattedItems, subtotal } = formatCartItems(cartItems);

    return ApiResponse.success(res, {
      cartId: cart.id,
      items: formattedItems,
      summary: { itemCount: formattedItems.length, subtotal }
    }, 'Item added to cart', 201);
  } catch (error) {
    console.error('[CartController-Postgres] addToCart error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 3: Update cart item quantity
 */
exports.updateCartItem = async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const { quantity } = req.body;
    const userId = req.user?.id;

    console.log('[CartController-Postgres] updateCartItem:', { itemId, quantity, userId });

    if (!itemId || quantity === undefined || quantity < 0) {
      return ApiResponse.error(res, 'Invalid item ID or quantity', 422, 'INVALID_REQUEST');
    }

    const { sequelize } = require('../models');
    const hasProductImagesTable = await hasTable(sequelize, 'product_images');

    // Verify item belongs to user
    const cartItemResult = await sequelize.query(
      `SELECT ci.id, ci.cart_id, ci.product_id, c.user_id, p.stock
       FROM cart_items ci
       INNER JOIN carts c ON ci.cart_id = c.id
       LEFT JOIN products p ON ci.product_id = p.id
       WHERE ci.id = :itemId AND c.user_id = :userId`,
      { replacements: { itemId, userId }, type: sequelize.QueryTypes.SELECT }
    );

    if (!cartItemResult.length) {
      return ApiResponse.notFound(res, 'Cart item', 'CART_ITEM_NOT_FOUND');
    }

    const cartItem = cartItemResult[0];

    // Check stock
    if ((cartItem.stock || 0) < quantity) {
      return ApiResponse.error(res, 'Quantity exceeds available stock', 409, 'INSUFFICIENT_STOCK');
    }

    // Delete if quantity = 0
    if (quantity === 0) {
      await sequelize.query(
        'DELETE FROM cart_items WHERE id = :itemId',
        { replacements: { itemId } }
      );
    } else {
      await sequelize.query(
        'UPDATE cart_items SET quantity = :quantity, updated_at = NOW() WHERE id = :itemId',
        { replacements: { quantity, itemId } }
      );
    }

    // Fetch updated cart
    const cartItems = await sequelize.query(
      `SELECT ci.id, ci.quantity, ci.price, ci.product_id,
              ci.selected_color, ci.selected_size,
              p.name, p.price as product_price,
              ${buildImagesSelectClause(hasProductImagesTable)}
       FROM cart_items ci
       LEFT JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = :cartId`,
      { replacements: { cartId: cartItem.cart_id }, type: sequelize.QueryTypes.SELECT }
    );

    const { formattedItems, subtotal } = formatCartItems(cartItems);

    return ApiResponse.success(res, {
      cartId: cartItem.cart_id,
      items: formattedItems,
      summary: {
        itemCount: formattedItems.length,
        totalQuantity: formattedItems.reduce((sum, i) => sum + i.quantity, 0),
        subtotal,
        discount: 0,
        total: subtotal
      }
    }, 'Cart item updated');
  } catch (error) {
    console.error('[CartController-Postgres] updateCartItem error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 4: Remove item from cart
 */
exports.removeFromCart = async (req, res) => {
  try {
    const item_id = extractItemId(req);
    const productId = req.body.product_id || req.body.productId;
    const userId = req.user?.id;

    console.log('[CartController-Postgres] removeFromCart:', { item_id, productId, userId });

    if (!item_id && !productId) {
      return ApiResponse.error(res, 'Item ID or product ID is required', 422, 'MISSING_ID');
    }

    const { sequelize } = require('../models');
    const hasProductImagesTable = await hasTable(sequelize, 'product_images');

    let cartId;
    if (item_id) {
      // Find and delete by item ID
      const result = await sequelize.query(
        `SELECT ci.cart_id FROM cart_items ci
         INNER JOIN carts c ON ci.cart_id = c.id
         WHERE ci.id = :itemId AND c.user_id = :userId`,
        { replacements: { itemId: item_id, userId }, type: sequelize.QueryTypes.SELECT }
      );

      if (!result.length) {
        return ApiResponse.notFound(res, 'Cart item', 'CART_ITEM_NOT_FOUND');
      }

      cartId = result[0].cart_id;
      await sequelize.query(
        'DELETE FROM cart_items WHERE id = :itemId',
        { replacements: { itemId: item_id } }
      );
    } else if (productId) {
      // Find and delete by product ID
      const result = await sequelize.query(
        `SELECT ci.id, ci.cart_id FROM cart_items ci
         INNER JOIN carts c ON ci.cart_id = c.id
         WHERE ci.product_id = :productId AND c.user_id = :userId LIMIT 1`,
        { replacements: { productId, userId }, type: sequelize.QueryTypes.SELECT }
      );

      if (!result.length) {
        return ApiResponse.notFound(res, 'Cart item', 'CART_ITEM_NOT_FOUND');
      }

      cartId = result[0].cart_id;
      await sequelize.query(
        'DELETE FROM cart_items WHERE id = :itemId',
        { replacements: { itemId: result[0].id } }
      );
    }

    // Fetch updated cart
    const cartItems = await sequelize.query(
      `SELECT ci.id, ci.quantity, ci.price, ci.product_id,
              ci.selected_color, ci.selected_size,
              p.name, p.price as product_price,
              ${buildImagesSelectClause(hasProductImagesTable)}
       FROM cart_items ci
       LEFT JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = :cartId`,
      { replacements: { cartId }, type: sequelize.QueryTypes.SELECT }
    );

    const { formattedItems, subtotal } = formatCartItems(cartItems);

    return ApiResponse.success(res, {
      cartId,
      items: formattedItems,
      summary: { itemCount: formattedItems.length, subtotal }
    }, 'Item removed from cart');
  } catch (error) {
    console.error('[CartController-Postgres] removeFromCart error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 5: Clear entire cart
 */
exports.clearCart = async (req, res) => {
  try {
    const { sequelize } = require('../models');
    const cart = await sequelize.query(
      'SELECT id FROM carts WHERE user_id = :userId LIMIT 1',
      { replacements: { userId: req.user.id }, type: sequelize.QueryTypes.SELECT }
    );

    if (!cart.length) {
      return ApiResponse.notFound(res, 'Cart', 'CART_NOT_FOUND');
    }

    await sequelize.query(
      'DELETE FROM cart_items WHERE cart_id = :cartId',
      { replacements: { cartId: cart[0].id } }
    );

    return ApiResponse.success(res, { cartId: cart[0].id, items: [] }, 'Cart cleared');
  } catch (error) {
    console.error('[CartController-Postgres] clearCart error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 6: Get cart item count
 */
exports.getCartCount = async (req, res) => {
  try {
    const { sequelize } = require('../models');

    const cartCountResult = await sequelize.query(
      `SELECT COUNT(*)::int as count
       FROM cart_items ci
       INNER JOIN carts c ON ci.cart_id = c.id
       WHERE c.user_id = :userId`,
      { replacements: { userId: req.user.id }, type: sequelize.QueryTypes.SELECT }
    );

    let count = cartCountResult[0]?.count || 0;
    if (count === 0) {
      const legacyCountResult = await sequelize.query(
        `SELECT COUNT(*)::int as count
         FROM carts
         WHERE user_id = :userId AND product_id IS NOT NULL`,
        { replacements: { userId: req.user.id }, type: sequelize.QueryTypes.SELECT }
      );
      count = legacyCountResult[0]?.count || 0;
    }

    return ApiResponse.success(res, { count }, 'Cart count retrieved');
  } catch (error) {
    console.error('[CartController-Postgres] getCartCount error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 7: Get cart total count (with wishlist)
 */
exports.getCartTotalCount = async (req, res) => {
  try {
    const { sequelize } = require('../models');
    const hasWishlistsTable = await hasTable(sequelize, 'wishlists');

    let cartItems = await sequelize.query(
      `SELECT ci.id, ci.quantity, ci.price, ci.product_id,
              p.price as product_price
       FROM cart_items ci
       INNER JOIN carts c ON ci.cart_id = c.id
       LEFT JOIN products p ON ci.product_id = p.id
       WHERE c.user_id = :userId`,
      { replacements: { userId: req.user.id }, type: sequelize.QueryTypes.SELECT }
    );

    if (!cartItems || cartItems.length === 0) {
      cartItems = await sequelize.query(
        `SELECT c.id, c.quantity, c.price, c.product_id,
                p.price as product_price
         FROM carts c
         LEFT JOIN products p ON c.product_id = p.id
         WHERE c.user_id = :userId AND c.product_id IS NOT NULL`,
        { replacements: { userId: req.user.id }, type: sequelize.QueryTypes.SELECT }
      );
    }

    const itemCount = cartItems.length;
    const quantityTotal = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalAmount = cartItems.reduce((sum, item) => sum + (((item.product_price || item.price) || 0) * (item.quantity || 0)), 0);

    let wishlistItemCount = 0;
    if (hasWishlistsTable) {
      const wishlistCountResult = await sequelize.query(
        `SELECT COUNT(*)::int as count
         FROM wishlists
         WHERE user_id = :userId`,
        { replacements: { userId: req.user.id }, type: sequelize.QueryTypes.SELECT }
      );
      wishlistItemCount = wishlistCountResult[0]?.count || 0;
    }

    const data = {
      cart: { itemCount, quantityTotal, totalAmount },
      wishlist: { itemCount: wishlistItemCount },
      totalCount: quantityTotal + wishlistItemCount,
      showCartTotalPrice: true
    };

    return ApiResponse.success(res, data, 'Cart total count retrieved');
  } catch (error) {
    console.error('[CartController-Postgres] getCartTotalCount error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 8: Get cart item count (alias)
 */
exports.getCartItemCount = exports.getCartCount;

/**
 * METHOD 9: Get cart by vendors
 */
exports.getCartByVendors = async (req, res) => {
  try {
    // TODO: Group cart items by vendor
    return ApiResponse.success(res, {}, 'Cart by vendors retrieved');
  } catch (error) {
    console.error('[CartController-Postgres] getCartByVendors error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 10: Move item to wishlist
 */
exports.moveToWishlist = async (req, res) => {
  try {
    // TODO: Move cart item to wishlist
    return ApiResponse.success(res, {}, 'Item moved to wishlist');
  } catch (error) {
    console.error('[CartController-Postgres] moveToWishlist error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 11: Recalculate cart
 */
exports.recalculateCart = async (req, res) => {
  try {
    // TODO: Recalculate cart totals and discounts
    return ApiResponse.success(res, {}, 'Cart recalculated');
  } catch (error) {
    console.error('[CartController-Postgres] recalculateCart error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 12: Debug cart
 */
exports.debugCart = async (req, res) => {
  try {
    // TODO: Return debug information about cart
    return ApiResponse.success(res, {}, 'Cart debug info');
  } catch (error) {
    console.error('[CartController-Postgres] debugCart error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 13: Bulk remove items
 */
exports.bulkRemoveItems = async (req, res) => {
  try {
    const item_ids = req.body.item_ids || req.body.itemIds;
    const userId = req.user?.id;

    console.log('[CartController-Postgres] bulkRemoveItems:', { itemIds: item_ids, userId });

    if (!Array.isArray(item_ids) || item_ids.length === 0) {
      return ApiResponse.error(res, 'Item IDs array is required', 422, 'INVALID_ITEM_IDS');
    }

    const { sequelize } = require('../models');

    // Verify all items belong to user
    const items = await sequelize.query(
      `SELECT ci.id, c.user_id
       FROM cart_items ci
       INNER JOIN carts c ON ci.cart_id = c.id
       WHERE ci.id IN (:itemIds)`,
      { replacements: { itemIds: item_ids }, type: sequelize.QueryTypes.SELECT }
    );

    if (items.some(item => item.user_id !== userId)) {
      return ApiResponse.forbidden(res, 'You can only modify your own cart');
    }

    // Delete items
    await sequelize.query(
      'DELETE FROM cart_items WHERE id IN (:itemIds)',
      { replacements: { itemIds: item_ids } }
    );

    return ApiResponse.success(res, { removedCount: items.length }, `${items.length} item(s) removed from cart`);
  } catch (error) {
    console.error('[CartController-Postgres] bulkRemoveItems error:', error);
    return ApiResponse.serverError(res, error);
  }
};


