/**
 * ============================================================================
 * CART MODEL - PostgreSQL/Sequelize Implementation
 * ============================================================================
 * Manages shopping cart operations for PostgreSQL database
 * Provides consistent interface matching models_mongo/Cart.js methods
 */

const TAX_RATE = 0.18;
const FREE_SHIPPING_THRESHOLD = 500;
const STANDARD_SHIPPING = 100;

module.exports = (sequelize, DataTypes) => {
  const Cart = sequelize.define('Cart', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId: { type: DataTypes.UUID, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: true },
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 }
  }, { 
    tableName: 'carts', 
    timestamps: true, 
    underscored: true, 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  });

  /**
   * Helper: Check if table exists
   */
  Cart.hasTable = async function(tableName) {
    const result = await sequelize.query(
      'SELECT to_regclass(:tableName) as table_name',
      { 
        replacements: { tableName: `public.${tableName}` }, 
        type: sequelize.QueryTypes.SELECT 
      }
    );
    return !!result[0]?.table_name;
  };

  /**
   * Helper: Build product images SELECT clause
   */
  Cart.buildImagesSelectClause = function(hasProductImagesTable) {
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
   * Get user's cart with items and product details
   */
  Cart.getCartByUserId = async function(userId) {
    try {
      const hasProductImagesTable = await Cart.hasTable('product_images');

      // Get cart ID
      const cartResult = await sequelize.query(
        'SELECT id FROM carts WHERE user_id = :userId',
        { replacements: { userId }, type: sequelize.QueryTypes.SELECT }
      );

      if (!cartResult || cartResult.length === 0) {
        return {
          cartId: null,
          items: [],
          summary: {
            itemsCount: 0,
            subtotal: 0,
            taxAmount: 0,
            shippingCost: STANDARD_SHIPPING,
            totalAmount: STANDARD_SHIPPING
          }
        };
      }

      const cartId = cartResult[0].id;

      // Get cart items with products
      const cartItems = await sequelize.query(
        `SELECT ci.id, ci.quantity, ci.price, ci.product_id,
                ci.selected_color, ci.selected_size,
                p.id as product_id, p.name, p.price as product_price,
                ${Cart.buildImagesSelectClause(hasProductImagesTable)}
         FROM cart_items ci
         LEFT JOIN products p ON ci.product_id = p.id
         WHERE ci.cart_id = :cartId`,
        { replacements: { cartId }, type: sequelize.QueryTypes.SELECT }
      );

      if (!cartItems || cartItems.length === 0) {
        return {
          cartId: cartId,
          items: [],
          summary: {
            itemsCount: 0,
            subtotal: 0,
            taxAmount: 0,
            shippingCost: STANDARD_SHIPPING,
            totalAmount: STANDARD_SHIPPING
          }
        };
      }

      // Format items and calculate totals
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

      const taxAmount = subtotal * TAX_RATE;
      const shippingCost = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
      const totalAmount = subtotal + taxAmount + shippingCost;

      return {
        cartId: cartId,
        items: formattedItems,
        summary: {
          itemsCount: formattedItems.length,
          subtotal: parseFloat(subtotal.toFixed(2)),
          taxAmount: parseFloat(taxAmount.toFixed(2)),
          shippingCost: shippingCost,
          totalAmount: parseFloat(totalAmount.toFixed(2))
        }
      };
    } catch (error) {
      throw new Error(`Failed to get cart: ${error.message}`);
    }
  };

  /**
   * Add item to cart or update quantity if exists
   */
  Cart.addToCart = async function(userId, cartData) {
    try {
      const { productId, quantity, selectedColor, selectedSize, price } = cartData;
      
      if (!productId || quantity < 1) {
        throw new Error('Invalid product ID or quantity');
      }

      // Validate product exists and has stock
      const product = await sequelize.query(
        'SELECT id, price, stock FROM products WHERE id = :productId',
        { replacements: { productId }, type: sequelize.QueryTypes.SELECT }
      );

      if (!product || product.length === 0) {
        throw new Error('Product not found');
      }

      const prod = product[0];
      if (prod.stock < quantity) {
        throw new Error('Insufficient stock available');
      }

      // Get or create cart
      let cartResult = await sequelize.query(
        'SELECT id FROM carts WHERE user_id = :userId',
        { replacements: { userId }, type: sequelize.QueryTypes.SELECT }
      );

      let cartId;
      if (cartResult.length > 0) {
        cartId = cartResult[0].id;
      } else {
        const newCart = await sequelize.query(
          'INSERT INTO carts (user_id, created_at, updated_at) VALUES (:userId, NOW(), NOW()) RETURNING id',
          { replacements: { userId }, type: sequelize.QueryTypes.INSERT }
        );
        cartId = newCart[0][0]?.id || newCart[0]?.id;
      }

      if (!cartId) {
        throw new Error('Failed to create/find cart');
      }

      // Check for existing item
      const existingItem = await sequelize.query(
        `SELECT id FROM cart_items 
         WHERE cart_id = :cartId AND product_id = :productId 
         AND (selected_color = :selectedColor OR (selected_color IS NULL AND :selectedColor IS NULL))
         AND (selected_size = :selectedSize OR (selected_size IS NULL AND :selectedSize IS NULL))`,
        { 
          replacements: { cartId, productId, selectedColor, selectedSize }, 
          type: sequelize.QueryTypes.SELECT 
        }
      );

      if (existingItem && existingItem.length > 0) {
        // Update quantity
        await sequelize.query(
          `UPDATE cart_items 
           SET quantity = quantity + :quantity, updated_at = NOW() 
           WHERE id = :itemId`,
          { replacements: { quantity, itemId: existingItem[0].id }, type: sequelize.QueryTypes.UPDATE }
        );
      } else {
        // Add new item
        await sequelize.query(
          `INSERT INTO cart_items (cart_id, product_id, quantity, price, selected_color, selected_size, created_at, updated_at)
           VALUES (:cartId, :productId, :quantity, :price, :selectedColor, :selectedSize, NOW(), NOW())`,
          { 
            replacements: { 
              cartId, productId, quantity, 
              price: prod.price || price,
              selectedColor, 
              selectedSize 
            }, 
            type: sequelize.QueryTypes.INSERT 
          }
        );
      }

      return Cart.getCartByUserId(userId);
    } catch (error) {
      throw new Error(`Failed to add to cart: ${error.message}`);
    }
  };

  /**
   * Remove item from cart
   */
  Cart.removeFromCart = async function(userId, itemId) {
    try {
      await sequelize.query(
        'DELETE FROM cart_items WHERE id = :itemId',
        { replacements: { itemId }, type: sequelize.QueryTypes.DELETE }
      );

      return Cart.getCartByUserId(userId);
    } catch (error) {
      throw new Error(`Failed to remove from cart: ${error.message}`);
    }
  };

  /**
   * Update cart item quantity
   */
  Cart.updateCartItem = async function(userId, itemId, quantity) {
    try {
      if (quantity <= 0) {
        await sequelize.query(
          'DELETE FROM cart_items WHERE id = :itemId',
          { replacements: { itemId }, type: sequelize.QueryTypes.DELETE }
        );
      } else {
        await sequelize.query(
          `UPDATE cart_items 
           SET quantity = :quantity, updated_at = NOW() 
           WHERE id = :itemId`,
          { replacements: { quantity, itemId }, type: sequelize.QueryTypes.UPDATE }
        );
      }

      return Cart.getCartByUserId(userId);
    } catch (error) {
      throw new Error(`Failed to update cart item: ${error.message}`);
    }
  };

  /**
   * Clear all items from cart
   */
  Cart.clearCart = async function(userId) {
    try {
      const cartResult = await sequelize.query(
        'SELECT id FROM carts WHERE user_id = :userId',
        { replacements: { userId }, type: sequelize.QueryTypes.SELECT }
      );

      if (cartResult.length > 0) {
        await sequelize.query(
          'DELETE FROM cart_items WHERE cart_id = :cartId',
          { replacements: { cartId: cartResult[0].id }, type: sequelize.QueryTypes.DELETE }
        );
      }

      return Cart.getCartByUserId(userId);
    } catch (error) {
      throw new Error(`Failed to clear cart: ${error.message}`);
    }
  };

  /**
   * Get cart item count (unique items)
   */
  Cart.getCartCount = async function(userId) {
    try {
      const result = await sequelize.query(
        `SELECT COUNT(*) as count FROM cart_items ci
         JOIN carts c ON ci.cart_id = c.id
         WHERE c.user_id = :userId`,
        { replacements: { userId }, type: sequelize.QueryTypes.SELECT }
      );

      return result[0]?.count || 0;
    } catch (error) {
      throw new Error(`Failed to get cart count: ${error.message}`);
    }
  };

  /**
   * Get total items count in cart (sum of quantities)
   */
  Cart.getCartTotalCount = async function(userId) {
    try {
      const result = await sequelize.query(
        `SELECT COALESCE(SUM(ci.quantity), 0) as count FROM cart_items ci
         JOIN carts c ON ci.cart_id = c.id
         WHERE c.user_id = :userId`,
        { replacements: { userId }, type: sequelize.QueryTypes.SELECT }
      );

      return result[0]?.count || 0;
    } catch (error) {
      throw new Error(`Failed to get total count: ${error.message}`);
    }
  };

  /**
   * Bulk remove items from cart
   */
  Cart.bulkRemoveItems = async function(userId, itemIds = []) {
    try {
      if (itemIds.length === 0) {
        return Cart.getCartByUserId(userId);
      }

      await sequelize.query(
        `DELETE FROM cart_items WHERE id IN (:itemIds)`,
        { replacements: { itemIds }, type: sequelize.QueryTypes.DELETE }
      );

      return Cart.getCartByUserId(userId);
    } catch (error) {
      throw new Error(`Failed to bulk remove items: ${error.message}`);
    }
  };

  return Cart;
};
