const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { auth, requireRole, optionalAuth } = require('../middleware/auth');
const Product = require('../models/Product');
const Wishlist = require('../models/Wishlist');
const User = require('../models/User');

// NOTE: This single router provides compatibility for the older user-attached wishlist
// as well as the richer Wishlist model backed endpoints (likes/comments, move-to-cart,
// add/update/remove with population). Frontend should use /api/wishlist for canonical
// access. Endpoints:
//  - GET    /         (optionalAuth) -> returns wishlist (model-backed if user exists)
//  - POST   /add      (auth + end_user) -> add item (model)
//  - PUT    /update/:itemId (auth + end_user) -> update item (model)
//  - DELETE /remove/:itemId (auth + end_user) -> remove item (model)
//  - DELETE /         (auth + end_user) -> clear wishlist (user document)
//  - POST   /like/:itemId (auth) -> like item
//  - DELETE /unlike/:itemId (auth) -> unlike item
//  - POST   /comment/:itemId (auth) -> add comment
//  - POST   /move-to-cart/:itemId (auth + end_user) -> move item to cart (model/cart)

// Defensive helper: safe populate selection used in several handlers
const populateSelection = {
  path: 'items.product',
  select: 'name images price originalPrice brand category isActive',
  populate: {
    path: 'vendor',
    select: 'username fullName vendorInfo.businessName'
  }
};

// GET / - return wishlist (model-backed if user exists)
router.get('/', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({
        success: true,
        data: { wishlist: { _id: null, user: null, items: [], totalItems: 0 } }
      });
    }

    const wishlist = await Wishlist.findOrCreateForUser(req.user._id, true);
    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }

    res.json({ success: true, wishlist, summary: wishlist.summary });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch wishlist', error: error.message });
  }
});

// POST /add - add item to model-backed wishlist
router.post('/add', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const { productId, size, color, addedFrom = 'manual', notes, priority = 'medium' } = req.body;

    const product = await Product.findById(productId).populate('vendor');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const wishlist = await Wishlist.findOrCreateForUser(req.user._id, false);

    wishlist.addItem({
      product: productId,
      size,
      color,
      price: product.price,
      originalPrice: product.originalPrice,
      addedFrom,
      notes,
      priority,
      vendor: product.vendor ? product.vendor._id : null
    });

    await wishlist.save();
    await wishlist.populate(populateSelection);

    res.json({ success: true, message: 'Item added to wishlist successfully', wishlist, summary: wishlist.summary });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to add item to wishlist', error: error.message });
  }
});

// PUT /update/:itemId - update wishlist item (model)
router.put('/update/:itemId', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const { itemId } = req.params;
    const { size, color, notes, priority } = req.body;

    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) return res.status(404).json({ success: false, message: 'Wishlist not found' });

    const updateData = {};
    if (size !== undefined) updateData.size = size;
    if (color !== undefined) updateData.color = color;
    if (notes !== undefined) updateData.notes = notes;
    if (priority !== undefined) updateData.priority = priority;

    wishlist.updateItem(itemId, updateData);
    await wishlist.save();
    await wishlist.populate(populateSelection);

    res.json({ success: true, message: 'Wishlist item updated successfully', wishlist, summary: wishlist.summary });
  } catch (error) {
    console.error('Update wishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to update wishlist item', error: error.message });
  }
});

// DELETE /remove/:itemId - remove item (model)
router.delete('/remove/:itemId', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const { itemId } = req.params;
    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) return res.status(404).json({ success: false, message: 'Wishlist not found' });

    wishlist.removeItem(itemId);
    await wishlist.save();
    await wishlist.populate(populateSelection);

    res.json({ success: true, message: 'Item removed from wishlist successfully', wishlist, summary: wishlist.summary });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove item from wishlist', error: error.message });
  }
});

// DELETE / - clear wishlist (user document) - keep for compatibility
router.delete('/', auth, requireRole(['end_user']), async (req, res) => {
  try {
    // prefer clearing the user's wishlist array if present
    if (req.user && Array.isArray(req.user.wishlist)) {
      req.user.wishlist = [];
      await req.user.save();
      return res.json({ success: true, message: 'Wishlist cleared' });
    }

    // fallback: clear model-backed wishlist
    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (wishlist) {
      wishlist.items = [];
      await wishlist.save();
      return res.json({ success: true, message: 'Wishlist cleared' });
    }

    res.json({ success: true, message: 'Wishlist already empty' });
  } catch (err) {
    console.error('Clear wishlist error:', err);
    res.status(500).json({ success: false, message: 'Failed to clear wishlist', error: err.message });
  }
});

// POST /like/:itemId - like an item
router.post('/like/:itemId', auth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { wishlistUserId } = req.body;
    const wishlist = await Wishlist.findOne({ user: wishlistUserId || req.user._id });
    if (!wishlist) return res.status(404).json({ success: false, message: 'Wishlist not found' });

    const item = wishlist.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Wishlist item not found' });

    const existingLike = item.likes.find(like => like.user.toString() === req.user._id.toString());
    if (existingLike) return res.status(400).json({ success: false, message: 'You have already liked this item' });

    wishlist.likeItem(itemId, req.user._id);
    await wishlist.save();

    res.json({ success: true, message: 'Item liked successfully', likesCount: item.likesCount + 1 });
  } catch (error) {
    console.error('Like wishlist item error:', error);
    res.status(500).json({ success: false, message: 'Failed to like item', error: error.message });
  }
});

// DELETE /unlike/:itemId - unlike an item
router.delete('/unlike/:itemId', auth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { wishlistUserId } = req.body;
    const wishlist = await Wishlist.findOne({ user: wishlistUserId || req.user._id });
    if (!wishlist) return res.status(404).json({ success: false, message: 'Wishlist not found' });

    const item = wishlist.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Wishlist item not found' });

    wishlist.unlikeItem(itemId, req.user._id);
    await wishlist.save();

    res.json({ success: true, message: 'Item unliked successfully', likesCount: item.likesCount });
  } catch (error) {
    console.error('Unlike wishlist item error:', error);
    res.status(500).json({ success: false, message: 'Failed to unlike item', error: error.message });
  }
});

// POST /comment/:itemId - add comment
router.post('/comment/:itemId', auth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { text, wishlistUserId } = req.body;
    if (!text || text.trim().length === 0) return res.status(400).json({ success: false, message: 'Comment text is required' });

    const wishlist = await Wishlist.findOne({ user: wishlistUserId || req.user._id });
    if (!wishlist) return res.status(404).json({ success: false, message: 'Wishlist not found' });

    const item = wishlist.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Wishlist item not found' });

    wishlist.addComment(itemId, req.user._id, text.trim());
    await wishlist.save();

    await wishlist.populate({ path: 'items.comments.user', select: 'username fullName avatar' });
    const updatedItem = wishlist.items.id(itemId);
    const newComment = updatedItem.comments[updatedItem.comments.length - 1];

    res.json({ success: true, message: 'Comment added successfully', comment: newComment, commentsCount: updatedItem.commentsCount });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ success: false, message: 'Failed to add comment', error: error.message });
  }
});

// POST /move-to-cart/:itemId - move item to cart
router.post('/move-to-cart/:itemId', auth, requireRole(['end_user']), async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity = 1 } = req.body;
    const Cart = require('../models/Cart');

    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) return res.status(404).json({ success: false, message: 'Wishlist not found' });

    const item = wishlist.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found in wishlist' });

    const cart = await Cart.findOrCreateForUser(req.user._id, false);

    cart.addItem({ product: item.product, quantity: parseInt(quantity), size: item.size, color: item.color, price: item.price, originalPrice: item.originalPrice, addedFrom: 'wishlist', notes: item.notes, vendor: item.vendor });

    wishlist.removeItem(itemId);
    await Promise.all([cart.save(), wishlist.save()]);

    res.json({ success: true, message: 'Item moved to cart successfully' });
  } catch (error) {
    console.error('Move to cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to move item to cart', error: error.message });
  }
});

module.exports = router;

// --- User-prefixed endpoints (backward compatible) ---
// These routes mirror the old `/api/user/*` endpoints and delegate to
// the same logic where possible. Keeping them here removes duplicate files.

// GET /user/wishlist - return user's embedded wishlist (compat)
router.get('/user/wishlist', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('wishlist.product', 'name price originalPrice images brand category')
      .select('wishlist');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, wishlist: user.wishlist, count: user.wishlist.length });
  } catch (error) {
    console.error('Get /user/wishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to get wishlist', error: error.message });
  }
});

// GET /user/cart - return user's embedded cart (compat)
router.get('/user/cart', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('cart.product', 'name price originalPrice images brand category')
      .select('cart');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let totalAmount = 0;
    let totalItems = 0;
    user.cart.forEach(item => {
      if (item.product) {
        totalAmount += item.product.price * item.quantity;
        totalItems += item.quantity;
      }
    });

    res.json({ success: true, cart: user.cart, summary: { totalItems, totalAmount, itemCount: user.cart.length } });
  } catch (error) {
    console.error('Get /user/cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to get cart', error: error.message });
  }
});

// POST /user/wishlist/add (compat)
router.post('/user/wishlist/add', auth, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'Product ID is required' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const existingItem = user.wishlist.find(item => item.product.toString() === productId);
    if (existingItem) return res.status(400).json({ success: false, message: 'Product already in wishlist' });

    user.wishlist.push({ product: productId, addedAt: new Date() });
    await user.save();

    res.json({ success: true, message: 'Product added to wishlist', wishlistCount: user.wishlist.length });
  } catch (error) {
    console.error('POST /user/wishlist/add error:', error);
    res.status(500).json({ success: false, message: 'Failed to add to wishlist', error: error.message });
  }
});

// POST /user/cart/add (compat)
router.post('/user/cart/add', auth, async (req, res) => {
  try {
    const { productId, quantity = 1, size, color } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'Product ID is required' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const existingItemIndex = user.cart.findIndex(item => item.product.toString() === productId && item.size === size && item.color === color);
    if (existingItemIndex > -1) {
      user.cart[existingItemIndex].quantity += quantity;
    } else {
      user.cart.push({ product: productId, quantity, size, color, addedAt: new Date() });
    }

    await user.save();
    const cartCount = user.cart.reduce((total, item) => total + item.quantity, 0);
    res.json({ success: true, message: 'Product added to cart', cartCount });
  } catch (error) {
    console.error('POST /user/cart/add error:', error);
    res.status(500).json({ success: false, message: 'Failed to add to cart', error: error.message });
  }
});

// DELETE /user/wishlist/:productId (compat)
router.delete('/user/wishlist/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.wishlist = user.wishlist.filter(item => item.product.toString() !== productId);
    await user.save();
    res.json({ success: true, message: 'Product removed from wishlist', wishlistCount: user.wishlist.length });
  } catch (error) {
    console.error('DELETE /user/wishlist/:productId error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove from wishlist', error: error.message });
  }
});

// DELETE /user/cart/:productId (compat)
router.delete('/user/cart/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { size, color } = req.query;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.cart = user.cart.filter(item => !(item.product.toString() === productId && item.size === size && item.color === color));
    await user.save();
    const cartCount = user.cart.reduce((total, item) => total + item.quantity, 0);
    res.json({ success: true, message: 'Product removed from cart', cartCount });
  } catch (error) {
    console.error('DELETE /user/cart/:productId error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove from cart', error: error.message });
  }
});
