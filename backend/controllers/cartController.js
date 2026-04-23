/**
 * ============================================================================
 * CART CONTROLLER - PostgreSQL/Sequelize
 * ============================================================================
 * Purpose: Shopping cart CRUD, inventory checks, price calculations
 * Database: PostgreSQL via Sequelize ORM
 */

const dbType = process.env.DB_TYPE || 'mongodb';
const { randomUUID } = require('crypto');
const models = dbType.includes('postgres') ? require('../models_sql') : require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');
const { Op } = require('sequelize');
const { formatSingleResponse, buildIncludeClause, validateMultipleFK } = require('../utils/fkResponseFormatter');

// Helper to ensure models are initialized before use
const ensureModelsReady = async () => {
  try {
    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }
  } catch (err) {
    console.warn('⚠️  Warning: Could not reinitialize models:', err.message);
  }
};

// Constants
const TAX_RATE = 0.18; // 18% GST
const FREE_SHIPPING_THRESHOLD = 500;
const STANDARD_SHIPPING = 100;

const hasTable = async (sequelize, tableName) => {
  const result = await sequelize.query(
    'SELECT to_regclass(:tableName) as table_name',
    { replacements: { tableName: `public.${tableName}` }, type: sequelize.QueryTypes.SELECT }
  );
  return !!result[0]?.table_name;
};

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

const loadLegacyCartItems = async (sequelize, userId, hasProductImagesTable) => {
  return sequelize.query(
    `SELECT c.id, c.quantity, c.price, c.product_id,
            p.id as product_id, p.name, p.price as product_price,
            ${buildImagesSelectClause(hasProductImagesTable)}
     FROM carts c
     LEFT JOIN products p ON c.product_id = p.id
     WHERE c.user_id = :userId AND c.product_id IS NOT NULL`,
    { replacements: { userId }, type: sequelize.QueryTypes.SELECT }
  );
};

const extractItemId = (req) => req.params.itemId || req.params.item_id || req.body.itemId || req.body.item_id;

/**
 * Get user's cart with items and calculations
 */
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const sequelize = require('../models_sql').sequelize;
    const hasProductImagesTable = await hasTable(sequelize, 'product_images');

    // Get cart ID using raw query
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

    // Get cart items with products using raw query
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
    console.error('❌ getCart error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Add item to cart
 */
exports.addToCart = async (req, res) => {
  try {
    // Accept both productId and product_id for flexibility
    const productId = req.body.product_id || req.body.productId;
    const quantity = req.body.quantity || 1;

    if (!productId || quantity < 1) {
      return ApiResponse.error(res, 'Invalid product ID or quantity', 422);
    }

    // Bypass wrapper/association issues - use raw Sequelize directly
    const sequelize = require('../models_sql').sequelize;
    const hasProductImagesTable = await hasTable(sequelize, 'product_images');
    
    // Validate product exists using raw query (avoids model/wrapper issues)
    const product = await sequelize.query(
      'SELECT id, price, stock FROM products WHERE id = :productId',
      { replacements: { productId }, type: sequelize.QueryTypes.SELECT }
    );
    
    if (!product || product.length === 0) {
      return ApiResponse.notFound(res, 'Product');
    }
    
    const prod = product[0];
    if (prod.stock < quantity) {
      return ApiResponse.error(res, 'Insufficient stock available', 409);
    }

    // Get or create cart using raw queries
    let cartResult = await sequelize.query(
      'SELECT id FROM carts WHERE user_id = :userId',
      { replacements: { userId: req.user.id }, type: sequelize.QueryTypes.SELECT }
    );
    
    let cartId;
    if (cartResult.length > 0) {
      cartId = cartResult[0].id;
    } else {
      const newCart = await sequelize.query(
        'INSERT INTO carts (user_id, created_at, updated_at) VALUES (:userId, NOW(), NOW()) RETURNING id',
        { replacements: { userId: req.user.id }, type: sequelize.QueryTypes.INSERT }
      );
      cartId = newCart[0][0]?.id || newCart[0]?.id;
    }

    if (!cartId) {
      return ApiResponse.error(res, 'Failed to create/find cart', 500);
    }

    // Check for existing item
    const existingItemResult = await sequelize.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = :cartId AND product_id = :productId',
      { replacements: { cartId, productId }, type: sequelize.QueryTypes.SELECT }
    );

    if (existingItemResult.length > 0) {
      const newQty = existingItemResult[0].quantity + quantity;
      if (newQty > prod.stock) {
        return ApiResponse.error(res, 'Quantity exceeds available stock', 409);
      }
      await sequelize.query(
        'UPDATE cart_items SET quantity = :quantity, updated_at = NOW() WHERE id = :itemId',
        { replacements: { quantity: newQty, itemId: existingItemResult[0].id } }
      );
    } else {
      await sequelize.query(
        'INSERT INTO cart_items (id, cart_id, product_id, quantity, price, added_at, updated_at) VALUES (:id, :cartId, :productId, :quantity, :price, NOW(), NOW())',
        { replacements: { id: randomUUID(), cartId, productId, quantity, price: prod.price } }
      );
    }

    // Get cart items with products using raw query
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
        subtotal: itemSubtotal
      };
    });

    return ApiResponse.success(res, {
      cartId,
      items: formattedItems,
      summary: {
        subtotal,
        tax: subtotal * TAX_RATE,
        shipping: subtotal > FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING,
        total: subtotal + (subtotal * TAX_RATE) + (subtotal > FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING)
      }
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
    const item_id = extractItemId(req);
    const { quantity } = req.body;

    console.log('🔄 UPDATE CART ITEM REQUEST:', {
      itemId: item_id,
      quantity,
      userId: req.user?.id,
      userEmail: req.user?.email
    });

    if (!item_id || quantity === undefined || quantity < 0) {
      console.warn('❌ Invalid parameters:', { item_id, quantity });
      return ApiResponse.error(res, 'Invalid item ID or quantity', 422);
    }

    const sequelize = require('../models_sql').sequelize;
    const hasProductImagesTable = await hasTable(sequelize, 'product_images');
    
    // Fetch cart item with full context
    const cartItemResult = await sequelize.query(
      `SELECT ci.id, ci.cart_id, ci.product_id, c.user_id, p.stock
       FROM cart_items ci
       INNER JOIN carts c ON ci.cart_id = c.id
       LEFT JOIN products p ON ci.product_id = p.id
       WHERE ci.id = :itemId`,
      { replacements: { itemId: item_id }, type: sequelize.QueryTypes.SELECT }
    );

    if (!cartItemResult.length) {
      console.warn('❌ Cart item not found:', item_id);
      return ApiResponse.notFound(res, 'Cart item');
    }

    const cartItem = cartItemResult[0];
    console.log('✅ Cart item found:', {
      cartItemId: cartItem.id,
      productId: cartItem.product_id,
      cartId: cartItem.cart_id,
      stock: cartItem.stock
    });

    // Verify ownership
    if (cartItem.user_id !== req.user.id) {
      console.warn('❌ Unauthorized: User cannot modify cart', {
        requestUserId: req.user.id,
        cartUserId: cartItem.user_id
      });
      return ApiResponse.forbidden(res, 'You can only update your own cart');
    }

    // Verify stock
    if ((cartItem.stock || 0) < quantity) {
      console.warn('❌ Insufficient stock:', {
        requestQuantity: quantity,
        availableStock: cartItem.stock
      });
      return ApiResponse.error(res, 'Quantity exceeds available stock', 409);
    }

    if (quantity === 0) {
      console.log('🗑️ Deleting cart item (quantity = 0):', item_id);
      await sequelize.query(
        'DELETE FROM cart_items WHERE id = :itemId',
        { replacements: { itemId: item_id } }
      );
    } else {
      console.log('✏️ Updating cart item quantity:', {
        itemId: item_id,
        newQuantity: quantity
      });
      await sequelize.query(
        'UPDATE cart_items SET quantity = :quantity, updated_at = NOW() WHERE id = :itemId',
        { replacements: { quantity, itemId: item_id } }
      );
    }

    // Fetch updated cart state
    const cartItems = await sequelize.query(
      `SELECT ci.id, ci.quantity, ci.price, ci.product_id,
              ci.selected_color, ci.selected_size,
              p.id as product_id, p.name, p.price as product_price,
              ${buildImagesSelectClause(hasProductImagesTable)}
       FROM cart_items ci
       LEFT JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = :cartId`,
      { replacements: { cartId: cartItem.cart_id }, type: sequelize.QueryTypes.SELECT }
    );

    const { formattedItems, subtotal } = formatCartItems(cartItems);
    console.log('✅ Cart updated successfully:', {
      itemsCount: formattedItems.length,
      subtotal,
      updatedItemId: item_id
    });

    return ApiResponse.success(res, {
      cartId: cartItem.cart_id,
      items: formattedItems,
      summary: {
        itemCount: formattedItems.length,
        totalQuantity: formattedItems.reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
        discount: 0,
        total: subtotal
      }
    }, 'Cart item updated');
  } catch (error) {
    console.error('❌ updateCartItem error:', error.message, error.stack);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Remove item from cart
 */
exports.removeFromCart = async (req, res) => {
  try {
    const item_id = extractItemId(req);
    const productId = req.body.product_id || req.body.productId;
    const sequelize = require('../models_sql').sequelize;
    const hasProductImagesTable = await hasTable(sequelize, 'product_images');

    console.log('🗑️ REMOVE FROM CART REQUEST:', {
      itemId: item_id,
      productId,
      userId: req.user?.id,
      userEmail: req.user?.email
    });

    let cartItemResult = [];
    if (item_id) {
      cartItemResult = await sequelize.query(
        `SELECT ci.id, ci.cart_id, ci.product_id, c.user_id
         FROM cart_items ci
         INNER JOIN carts c ON ci.cart_id = c.id
         WHERE ci.id = :itemId`,
        { replacements: { itemId: item_id }, type: sequelize.QueryTypes.SELECT }
      );
    } else if (productId) {
      cartItemResult = await sequelize.query(
        `SELECT ci.id, ci.cart_id, ci.product_id, c.user_id
         FROM cart_items ci
         INNER JOIN carts c ON ci.cart_id = c.id
         WHERE c.user_id = :userId AND ci.product_id = :productId
         LIMIT 1`,
        { replacements: { userId: req.user.id, productId }, type: sequelize.QueryTypes.SELECT }
      );
    } else {
      console.warn('❌ Neither item ID nor product ID provided');
      return ApiResponse.error(res, 'Item ID or product ID is required', 422);
    }

    if (!cartItemResult.length) {
      console.warn('❌ Cart item not found');
      return ApiResponse.notFound(res, 'Cart item');
    }

    const cartItem = cartItemResult[0];
    console.log('✅ Cart item found:', {
      cartItemId: cartItem.id,
      productId: cartItem.product_id,
      cartId: cartItem.cart_id
    });

    if (cartItem.user_id !== req.user.id) {
      console.warn('❌ Unauthorized cart removal');
      return ApiResponse.forbidden(res, 'You can only remove from your own cart');
    }

    const cartId = cartItem.cart_id;
    console.log('🗑️ Deleting cart item:', cartItem.id);
    
    await sequelize.query(
      'DELETE FROM cart_items WHERE id = :itemId',
      { replacements: { itemId: cartItem.id } }
    );

    console.log('✅ Cart item deleted, fetching updated cart...');

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

    const { formattedItems, subtotal } = formatCartItems(cartItems);
    console.log('✅ Cart updated after removal:', {
      itemsCount: formattedItems.length,
      subtotal,
      removedItemId: item_id
    });

    return ApiResponse.success(res, {
      cartId,
      items: formattedItems,
      summary: {
        itemCount: formattedItems.length,
        totalQuantity: formattedItems.reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
        discount: 0,
        total: subtotal
      }
    }, 'Item removed from cart');
  } catch (error) {
    console.error('❌ removeFromCart error:', error.message, error.stack);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Clear entire cart
 */
exports.clearCart = async (req, res) => {
  try {
    const sequelize = require('../models_sql').sequelize;
    const cart = await sequelize.query(
      'SELECT id FROM carts WHERE user_id = :userId LIMIT 1',
      { replacements: { userId: req.user.id }, type: sequelize.QueryTypes.SELECT }
    );

    if (!cart.length) {
      return ApiResponse.notFound(res, 'Cart');
    }

    await sequelize.query(
      'DELETE FROM cart_items WHERE cart_id = :cartId',
      { replacements: { cartId: cart[0].id } }
    );

    return ApiResponse.success(res, { cartId: cart[0].id, items: [] }, 'Cart cleared');
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
    const sequelize = require('../models_sql').sequelize;
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
    console.error('❌ getCartCount error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getCartTotalCount = async (req, res) => {
  try {
    const sequelize = require('../models_sql').sequelize;
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
      cart: {
        itemCount,
        quantityTotal,
        totalAmount
      },
      wishlist: {
        itemCount: wishlistItemCount
      },
      totalCount: quantityTotal + wishlistItemCount,
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
    const item_ids = req.body.item_ids || req.body.itemIds;

    console.log('🗑️ BULK REMOVE REQUEST:', {
      itemIds: item_ids,
      count: item_ids?.length,
      userId: req.user?.id,
      userEmail: req.user?.email
    });

    if (!Array.isArray(item_ids) || item_ids.length === 0) {
      console.warn('❌ Invalid item IDs array');
      return ApiResponse.error(res, 'Item IDs array is required', 422);
    }

    const sequelize = require('../models_sql').sequelize;
    const items = await sequelize.query(
      `SELECT ci.id, c.user_id
       FROM cart_items ci
       INNER JOIN carts c ON ci.cart_id = c.id
       WHERE ci.id IN (:itemIds)`,
      { replacements: { itemIds: item_ids }, type: sequelize.QueryTypes.SELECT }
    );

    console.log('✅ Found items to delete:', items.length);

    if (items.some(item => item.user_id !== req.user.id)) {
      console.warn('❌ Unauthorized bulk removal');
      return ApiResponse.forbidden(res, 'You can only modify your own cart');
    }

    console.log('🗑️ Deleting cart items:', item_ids);
    
    await sequelize.query(
      'DELETE FROM cart_items WHERE id IN (:itemIds)',
      { replacements: { itemIds: item_ids } }
    );

    console.log('✅ Bulk removal completed:', items.length, 'items deleted');

    return ApiResponse.success(res, {
      removedCount: items.length
    }, `${items.length} item(s) removed from cart`);
  } catch (error) {
    console.error('❌ bulkRemoveItems error:', error.message, error.stack);
    return ApiResponse.serverError(res, error);
  }
};


