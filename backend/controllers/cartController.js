/**
 * Cart Controller
 * Handles shopping cart operations and management
 * Model → Controller → Routes pattern
 */

const dbType = (process.env.DB_TYPE || '').toLowerCase();
const models = dbType === 'postgres' ? require('../models_sql') : require('../models')();
const { Cart, Product, Wishlist } = models;

// ==================== CART OPERATIONS ====================

/**
 * Get user's cart
 */
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.userId })
      .populate('items.productId', 'name price images brand category stock');

    if (!cart) {
      cart = new Cart({
        userId: req.user.userId,
        items: [],
        subtotal: 0,
        tax: 0,
        shipping: 0,
        total: 0
      });
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of cart.items) {
      if (item.productId) {
        subtotal += item.productId.price * item.quantity;
      }
    }

    const tax = subtotal * 0.18; // 18% GST
    const shipping = subtotal > 500 ? 0 : 100; // Free shipping above 500
    const total = subtotal + tax + shipping;

    cart.subtotal = subtotal;
    cart.tax = tax;
    cart.shipping = shipping;
    cart.total = total;

    res.json({
      success: true,
      data: {
        cart,
        summary: {
          itemCount: cart.items.length,
          subtotal,
          tax,
          shipping,
          total
        }
      }
    });
  } catch (error) {
    console.error('Get cart error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart',
      error: error.message
    });
  }
};

/**
 * Add item to cart
 */
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Validate inputs
    if (!productId || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID or quantity'
      });
    }

    // Verify product exists and has stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock available'
      });
    }

    // Get or create cart
    let cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) {
      cart = new Cart({
        userId: req.user.userId,
        items: []
      });
    }

    // Check if product already in cart
    const existingItem = cart.items.find(
      item => item.productId.toString() === productId
    );

    if (existingItem) {
      // Update quantity
      existingItem.quantity += quantity;
      if (existingItem.quantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: 'Quantity exceeds available stock'
        });
      }
    } else {
      // Add new item
      cart.items.push({
        productId,
        quantity,
        addedAt: Date.now()
      });
    }

    await cart.save();
    await cart.populate('items.productId', 'name price images brand');

    res.json({
      success: true,
      message: 'Item added to cart',
      data: { cart }
    });
  } catch (error) {
    console.error('Add to cart error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart',
      error: error.message
    });
  }
};

/**
 * Update cart item quantity
 */
exports.updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!itemId || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID or quantity'
      });
    }

    const cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const cartItem = cart.items.find(item => item._id.toString() === itemId);
    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Verify stock
    const product = await Product.findById(cartItem.productId);
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Quantity exceeds available stock'
      });
    }

    if (quantity === 0) {
      // Remove item if quantity is 0
      cart.items = cart.items.filter(
        item => item._id.toString() !== itemId
      );
    } else {
      cartItem.quantity = quantity;
    }

    await cart.save();
    await cart.populate('items.productId', 'name price images brand');

    res.json({
      success: true,
      message: 'Cart item updated',
      data: { cart }
    });
  } catch (error) {
    console.error('Update cart item error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart item',
      error: error.message
    });
  }
};

/**
 * Remove item from cart
 */
exports.removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: 'Item ID is required'
      });
    }

    const cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    await cart.save();

    res.json({
      success: true,
      message: 'Item removed from cart',
      data: { cart }
    });
  } catch (error) {
    console.error('Remove from cart error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart',
      error: error.message
    });
  }
};

/**
 * Clear entire cart
 */
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items = [];
    await cart.save();

    res.json({
      success: true,
      message: 'Cart cleared',
      data: { cart }
    });
  } catch (error) {
    console.error('Clear cart error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
      error: error.message
    });
  }
};

/**
 * Move item from cart to wishlist
 */
exports.moveToWishlist = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: 'Item ID is required'
      });
    }

    const cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const cartItem = cart.items.find(item => item._id.toString() === itemId);
    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Add to wishlist
    let wishlist = await Wishlist.findOne({ userId: req.user.userId });
    if (!wishlist) {
      wishlist = new Wishlist({
        userId: req.user.userId,
        items: []
      });
    }

    if (!wishlist.items.find(item => item.productId.toString() === cartItem.productId.toString())) {
      wishlist.items.push({
        productId: cartItem.productId,
        addedAt: Date.now()
      });
      await wishlist.save();
    }

    // Remove from cart
    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    await cart.save();

    res.json({
      success: true,
      message: 'Item moved to wishlist',
      data: { cart, wishlist }
    });
  } catch (error) {
    console.error('Move to wishlist error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to move item to wishlist',
      error: error.message
    });
  }
};

/**
 * Apply coupon to cart
 */
exports.applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required'
      });
    }

    const cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // For now, return mock response
    cart.couponCode = couponCode;
    cart.discount = Math.floor(cart.subtotal * 0.1); // 10% discount
    await cart.save();

    res.json({
      success: true,
      message: 'Coupon applied',
      data: {
        cart,
        discount: cart.discount
      }
    });
  } catch (error) {
    console.error('Apply coupon error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to apply coupon',
      error: error.message
    });
  }
};
