const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { auth, requireRole, optionalAuth } = require('../middleware/auth');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const User = require('../models/User');

// @route   GET /cart
// @desc    Get user's cart
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const cartItems = req.user.cart || [];
    
    // Populate product details
    const populatedCart = await Promise.all(
      cartItems.map(async (item) => {
        const product = await Product.findById(item.product)
          .select('name price images brand discount originalPrice');
        
        if (!product) return null;
        
        return {
          _id: item._id,
          product,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          addedAt: item.addedAt
        };
      })
    );

    // Filter out null items (deleted products)
    const validCartItems = populatedCart.filter(item => item !== null);

    // Calculate totals
    const subtotal = validCartItems.reduce((total, item) => {
      const price = item.product.originalPrice || item.product.price;
      return total + (price * item.quantity);
    }, 0);

    const discount = validCartItems.reduce((total, item) => {
      if (item.product.originalPrice) {
        const discountAmount = (item.product.originalPrice - item.product.price) * item.quantity;
        return total + discountAmount;
      }
      return total;
    }, 0);

    res.json({
      success: true,
      data: {
        items: validCartItems,
        summary: {
          itemCount: validCartItems.length,
          totalQuantity: validCartItems.reduce((total, item) => total + item.quantity, 0),
          subtotal,
          discount,
          total: subtotal - discount
        }
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart'
    });
  }
});

// @route   POST /cart
// @desc    Add item to cart
// @access  Private
router.post('/', [
  auth,
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('size').optional().notEmpty().withMessage('Size cannot be empty'),
  body('color').optional().notEmpty().withMessage('Color cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { productId, quantity, size, color } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if item already exists in cart
    const existingItemIndex = req.user.cart.findIndex(item => 
      item.product.toString() === productId && 
      item.size === size && 
      item.color === color
    );

    if (existingItemIndex > -1) {
      // Update quantity
      req.user.cart[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      req.user.cart.push({
        product: productId,
        quantity,
        size,
        color,
        addedAt: new Date()
      });
    }

    await req.user.save();

    res.json({
      success: true,
      message: 'Item added to cart successfully'
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart'
    });
  }
});

// @route   PUT /cart/:itemId
// @desc    Update cart item quantity
// @access  Private
router.put('/:itemId', [
  auth,
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { quantity } = req.body;
    const cartItem = req.user.cart.id(req.params.itemId);

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    cartItem.quantity = quantity;
    await req.user.save();

    res.json({
      success: true,
      message: 'Cart item updated successfully'
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart item'
    });
  }
});

// @route   DELETE /cart/:itemId
// @desc    Remove item from cart
// @access  Private
router.delete('/:itemId', auth, async (req, res) => {
  try {
    const cartItem = req.user.cart.id(req.params.itemId);

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    cartItem.remove();
    await req.user.save();

    res.json({
      success: true,
      message: 'Item removed from cart successfully'
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart'
    });
  }
});

// @route   DELETE /cart
// @desc    Clear cart
// @access  Private
router.delete('/', auth, async (req, res) => {
  try {
    req.user.cart = [];
    await req.user.save();

    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart'
    });
  }
});

module.exports = router;

// --- Model-backed endpoints (compatibility for cartNew features) ---

// Debug endpoint (model-backed)
router.get('/debug', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id, isActive: true });
    res.json({ success: true, debug: { cartExists: !!cart, cartId: cart?._id } });
  } catch (error) {
    console.error('Debug cart error:', error);
    res.status(500).json({ success: false, message: 'Debug failed', error: error.message });
  }
});

// Cart count (model)
router.get('/count', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id, isActive: true }).select('totalItems items totalAmount');
    if (!cart) return res.json({ success: true, count: 0, totalItems: 0, itemCount: 0, totalAmount: 0, showTotalPrice: false });
    const totalItems = cart.items.reduce((t, i) => t + i.quantity, 0);
    const itemCount = cart.items.length;
    const totalAmount = cart.totalAmount || 0;
    const showTotalPrice = itemCount >= 4;
    res.json({ success: true, count: totalItems, totalItems, itemCount, totalAmount, showTotalPrice, lastUpdated: cart.lastUpdated });
  } catch (error) {
    console.error('Get cart count error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cart count', error: error.message });
  }
});

// Recalculate cart totals
router.post('/recalculate', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id, isActive: true });
    if (!cart) return res.json({ success: true, message: 'No cart found to recalculate' });
    const oldTotalItems = cart.totalItems;
    const oldTotalAmount = cart.totalAmount;
    cart.calculateTotals();
    await cart.save();
    res.json({ success: true, message: 'Cart totals recalculated successfully', data: { itemsCount: cart.items.length, totalItems: cart.totalItems, totalAmount: cart.totalAmount, changes: { totalItemsChanged: oldTotalItems !== cart.totalItems, totalAmountChanged: oldTotalAmount !== cart.totalAmount } } });
  } catch (error) {
    console.error('Recalculate cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to recalculate cart', error: error.message });
  }
});

// Total-count across cart and wishlist (optionalAuth)
router.get('/total-count', optionalAuth, async (req, res) => {
  try {
    if (!req.user) return res.json({ success: true, data: { cartItemCount: 0, cartQuantityTotal: 0, cartTotalAmount: 0, wishlistItemCount: 0, combinedTotal: 0 } });
    const cart = await Cart.findOne({ user: req.user._id, isActive: true }).select('totalItems items totalAmount');
    const Wishlist = require('../models/Wishlist');
    const wishlist = await Wishlist.findOne({ user: req.user._id }).select('totalItems items');
    const cartItemCount = cart ? cart.items.length : 0;
    const cartQuantityTotal = cart ? cart.items.reduce((total, i) => total + i.quantity, 0) : 0;
    const cartTotalAmount = cart ? cart.totalAmount || 0 : 0;
    const wishlistItemCount = wishlist ? wishlist.items.length : 0;
    const totalCount = cartItemCount + wishlistItemCount;
    const showCartTotalPrice = cartItemCount >= 4;
    res.json({ success: true, userId: req.user._id, username: req.user.username, data: { cart: { itemCount: cartItemCount, quantityTotal: cartQuantityTotal, totalAmount: cartTotalAmount }, wishlist: { itemCount: wishlistItemCount }, totalCount, showCartTotalPrice, cartTotalAmount: showCartTotalPrice ? cartTotalAmount : 0 }, lastUpdated: new Date() });
  } catch (error) {
    console.error('Error getting total count for user:', error);
    res.status(500).json({ success: false, message: 'Failed to get total count', error: error.message });
  }
});

// Model-backed GET / (cart)
router.get('/', optionalAuth, async (req, res) => {
  try {
    if (!req.user) return res.json({ success: true, data: { cart: { _id: null, user: null, items: [], totalItems: 0, totalAmount: 0, isActive: false } } });
    let cart = await Cart.findOne({ user: req.user._id, isActive: true });
    if (!cart) { cart = new Cart({ user: req.user._id }); await cart.save(); }
    try { cart = await Cart.findById(cart._id).populate({ path: 'items.product', select: 'name images price originalPrice brand category isActive sizes colors vendor', populate: { path: 'vendor', select: 'username fullName vendorInfo.businessName' } }); } catch (populateError) { console.error('Populate error:', populateError); }
    let summary;
    try { summary = cart.summary; } catch (summaryError) { console.error('Summary error:', summaryError); summary = { totalItems: 0, totalAmount: 0, totalSavings: 0, itemCount: 0 }; }
    res.json({ success: true, cart, summary });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cart', error: error.message });
  }
});

// Add item to cart (model)
router.post('/add', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const { productId, quantity = 1, size, color, addedFrom = 'manual', notes } = req.body;
    const product = await Product.findById(productId).populate('vendor');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (!product.isActive) return res.status(400).json({ success: false, message: 'Product is not available' });
    if (product.stock < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock available' });
    const cart = await Cart.findOrCreateForUser(req.user._id);
    cart.addItem({ product: productId, quantity: parseInt(quantity), size, color, price: product.price, originalPrice: product.originalPrice, addedFrom, notes, vendor: product.vendor._id });
    await cart.save();
    await cart.populate({ path: 'items.product', select: 'name images price originalPrice brand category isActive', populate: { path: 'vendor', select: 'username fullName vendorInfo.businessName' } });
    res.json({ success: true, message: 'Item added to cart successfully', cart, summary: cart.summary });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to add item to cart', error: error.message });
  }
});

// Update item quantity in cart (model)
router.put('/update/:itemId', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity, size, color, notes } = req.body;
    const cart = await Cart.findOne({ user: req.user._id, isActive: true });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found in cart' });
    if (quantity !== undefined) { if (quantity <= 0) { cart.removeItem(itemId); } else { cart.updateItemQuantity(itemId, parseInt(quantity)); } }
    if (size !== undefined) item.size = size;
    if (color !== undefined) item.color = color;
    if (notes !== undefined) item.notes = notes;
    if (item.parent()) item.updatedAt = new Date();
    await cart.save();
    await cart.populate({ path: 'items.product', select: 'name images price originalPrice brand category isActive', populate: { path: 'vendor', select: 'username fullName vendorInfo.businessName' } });
    res.json({ success: true, message: 'Cart updated successfully', cart, summary: cart.summary });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to update cart', error: error.message });
  }
});

// Remove item (model)
router.delete('/remove/:itemId', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const { itemId } = req.params;
    const cart = await Cart.findOne({ user: req.user._id, isActive: true });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    cart.removeItem(itemId);
    await cart.save();
    await cart.populate({ path: 'items.product', select: 'name images price originalPrice brand category isActive', populate: { path: 'vendor', select: 'username fullName vendorInfo.businessName' } });
    res.json({ success: true, message: 'Item removed from cart successfully', cart, summary: cart.summary });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove item from cart', error: error.message });
  }
});

// Bulk remove
router.delete('/bulk-remove', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const { itemIds } = req.body;
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) return res.status(400).json({ success: false, message: 'Item IDs array is required' });
    const cart = await Cart.findOne({ user: req.user._id, isActive: true });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    let removedCount = 0; itemIds.forEach(itemId => { const itemExists = cart.items.id(itemId); if (itemExists) { cart.removeItem(itemId); removedCount++; } });
    await cart.save();
    await cart.populate({ path: 'items.product', select: 'name images price originalPrice brand category isActive', populate: { path: 'vendor', select: 'username fullName vendorInfo.businessName' } });
    res.json({ success: true, message: `${removedCount} item(s) removed from cart successfully`, removedCount, cart, summary: cart.summary });
  } catch (error) {
    console.error('Bulk remove cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove items from cart', error: error.message });
  }
});

// Clear entire cart
router.delete('/clear', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id, isActive: true });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    const itemCount = cart.items.length; cart.clearCart(); await cart.save(); res.json({ success: true, message: `Cart cleared successfully. ${itemCount} item(s) removed.`, clearedCount: itemCount, cart, summary: cart.summary });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear cart', error: error.message });
  }
});

// Vendors grouping
router.get('/vendors', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const cart = await Cart.findOrCreateForUser(req.user._id).populate({ path: 'items.product', select: 'name images price originalPrice brand category isActive', populate: { path: 'vendor', select: 'username fullName vendorInfo.businessName avatar' } });
    const vendorGroups = cart.getItemsByVendor();
    res.json({ success: true, vendorGroups, summary: cart.summary });
  } catch (error) {
    console.error('Get cart vendors error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cart vendors', error: error.message });
  }
});

// Move to wishlist (model)
router.post('/move-to-wishlist/:itemId', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const { itemId } = req.params; const Wishlist = require('../models/Wishlist');
    const cart = await Cart.findOne({ user: req.user._id, isActive: true }); if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    const item = cart.items.id(itemId); if (!item) return res.status(404).json({ success: false, message: 'Item not found in cart' });
  const wishlist = await Wishlist.findOrCreateForUser(req.user._id);
    wishlist.addItem({ product: item.product, size: item.size, color: item.color, price: item.price, originalPrice: item.originalPrice, addedFrom: 'cart', notes: item.notes, vendor: item.vendor });
    cart.removeItem(itemId);
    await Promise.all([cart.save(), wishlist.save()]);
    res.json({ success: true, message: 'Item moved to wishlist successfully' });
  } catch (error) {
    console.error('Move to wishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to move item to wishlist', error: error.message });
  }
});
