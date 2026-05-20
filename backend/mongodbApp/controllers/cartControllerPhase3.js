/**
 * Cart Controller - Complete MongoDB Implementation (Phase 3)
 * 6 methods for shopping cart management
 */

const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');
const Product = require('../models/Product');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Get user's cart
 */
exports.getCart = async (req, res, next) => {
  try {
    const userId = req.user._id;

    let cart = await Cart.findOne({ userId }).populate({
      path: 'items',
      populate: { path: 'productId', select: 'name price images stock' }
    });

    if (!cart) {
      cart = await Cart.create({ userId, items: [], total: 0 });
    }

    // Calculate totals
    const itemsWithSubtotal = cart.items.map(item => ({
      ...item.toObject(),
      subtotal: item.quantity * item.price
    }));

    const total = itemsWithSubtotal.reduce((sum, item) => sum + item.subtotal, 0);

    return ApiResponse.success(res, { items: itemsWithSubtotal, total }, 'Cart retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Add to cart
 */
exports.addToCart = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { productId, quantity = 1 } = req.body;

    if (!productId || !productId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid product ID', 400, 'INVALID_ID');
    }

    if (quantity < 1) {
      throw new ApiError('Quantity must be at least 1', 400, 'INVALID_QUANTITY');
    }

    // Verify product exists and has stock
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw new ApiError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    if (product.stock < quantity) {
      throw new ApiError('Insufficient stock', 400, 'OUT_OF_STOCK');
    }

    // Get or create cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    // Check if item already in cart
    const existingItem = await CartItem.findOne({ cartId: cart._id, productId });

    let cartItem;
    if (existingItem) {
      cartItem = await CartItem.findByIdAndUpdate(
        existingItem._id,
        { quantity: existingItem.quantity + quantity },
        { new: true }
      );
    } else {
      cartItem = await CartItem.create({
        cartId: cart._id,
        productId,
        quantity,
        price: product.price
      });

      if (!cart.items.includes(cartItem._id)) {
        cart.items.push(cartItem._id);
        await cart.save();
      }
    }

    return ApiResponse.success(res, cartItem, 'Item added to cart', null, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Update cart item quantity
 */
exports.updateCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!itemId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid item ID', 400, 'INVALID_ID');
    }

    if (quantity < 1) {
      throw new ApiError('Quantity must be at least 1', 400, 'INVALID_QUANTITY');
    }

    const cartItem = await CartItem.findById(itemId);
    if (!cartItem) {
      throw new ApiError('Cart item not found', 404, 'ITEM_NOT_FOUND');
    }

    // Check stock
    const product = await Product.findById(cartItem.productId);
    if (product.stock < quantity) {
      throw new ApiError('Insufficient stock', 400, 'OUT_OF_STOCK');
    }

    const updated = await CartItem.findByIdAndUpdate(
      itemId,
      { quantity },
      { new: true }
    ).populate('productId', 'name price');

    return ApiResponse.success(res, updated, 'Cart item updated');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Remove from cart
 */
exports.removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;

    if (!itemId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid item ID', 400, 'INVALID_ID');
    }

    const cartItem = await CartItem.findById(itemId);
    if (!cartItem) {
      throw new ApiError('Cart item not found', 404, 'ITEM_NOT_FOUND');
    }

    // Remove from cart
    await Cart.findOneAndUpdate(
      { userId },
      { $pull: { items: itemId } }
    );

    // Delete cart item
    await CartItem.findByIdAndDelete(itemId);

    return ApiResponse.success(res, null, 'Item removed from cart');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Clear entire cart
 */
exports.clearCart = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new ApiError('Cart not found', 404, 'CART_NOT_FOUND');
    }

    // Delete all cart items
    await CartItem.deleteMany({ _id: { $in: cart.items } });

    // Clear cart
    cart.items = [];
    await cart.save();

    return ApiResponse.success(res, null, 'Cart cleared');
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Get cart total with tax
 */
exports.getCartTotal = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId }).populate({
      path: 'items',
      populate: { path: 'productId', select: 'price' }
    });

    if (!cart) {
      return ApiResponse.success(res, { subtotal: 0, tax: 0, total: 0 }, 'Cart total');
    }

    const subtotal = cart.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const tax = subtotal * 0.18; // 18% tax
    const total = subtotal + tax;

    return ApiResponse.success(res, {
      subtotal,
      tax,
      total,
      itemCount: cart.items.length
    }, 'Cart total calculated');
  } catch (error) {
    next(error);
  }
};
