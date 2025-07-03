const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/user/wishlist
// @desc    Get user's wishlist (embedded in user document)
// @access  Private
router.get('/wishlist', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('wishlist.product', 'name price originalPrice images brand category')
      .select('wishlist');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      wishlist: user.wishlist,
      count: user.wishlist.length
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wishlist',
      error: error.message
    });
  }
});

// @route   GET /api/user/cart
// @desc    Get user's cart (embedded in user document)
// @access  Private
router.get('/cart', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('cart.product', 'name price originalPrice images brand category')
      .select('cart');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate cart totals
    let totalAmount = 0;
    let totalItems = 0;

    user.cart.forEach(item => {
      if (item.product) {
        totalAmount += item.product.price * item.quantity;
        totalItems += item.quantity;
      }
    });

    res.json({
      success: true,
      cart: user.cart,
      summary: {
        totalItems,
        totalAmount,
        itemCount: user.cart.length
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cart',
      error: error.message
    });
  }
});

// @route   POST /api/user/wishlist/add
// @desc    Add item to wishlist
// @access  Private
router.post('/wishlist/add', auth, async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if product already in wishlist
    const existingItem = user.wishlist.find(item => 
      item.product.toString() === productId
    );

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    // Add to wishlist
    user.wishlist.push({
      product: productId,
      addedAt: new Date()
    });

    await user.save();

    res.json({
      success: true,
      message: 'Product added to wishlist',
      wishlistCount: user.wishlist.length
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add to wishlist',
      error: error.message
    });
  }
});

// @route   POST /api/user/cart/add
// @desc    Add item to cart
// @access  Private
router.post('/cart/add', auth, async (req, res) => {
  try {
    const { productId, quantity = 1, size, color } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if product already in cart
    const existingItemIndex = user.cart.findIndex(item => 
      item.product.toString() === productId && 
      item.size === size && 
      item.color === color
    );

    if (existingItemIndex > -1) {
      // Update quantity
      user.cart[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      user.cart.push({
        product: productId,
        quantity,
        size,
        color,
        addedAt: new Date()
      });
    }

    await user.save();

    res.json({
      success: true,
      message: 'Product added to cart',
      cartCount: user.cart.reduce((total, item) => total + item.quantity, 0)
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add to cart',
      error: error.message
    });
  }
});

// @route   DELETE /api/user/wishlist/:productId
// @desc    Remove item from wishlist
// @access  Private
router.delete('/wishlist/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove from wishlist
    user.wishlist = user.wishlist.filter(item => 
      item.product.toString() !== productId
    );

    await user.save();

    res.json({
      success: true,
      message: 'Product removed from wishlist',
      wishlistCount: user.wishlist.length
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove from wishlist',
      error: error.message
    });
  }
});

// @route   DELETE /api/user/cart/:productId
// @desc    Remove item from cart
// @access  Private
router.delete('/cart/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { size, color } = req.query;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove from cart
    user.cart = user.cart.filter(item => 
      !(item.product.toString() === productId && 
        item.size === size && 
        item.color === color)
    );

    await user.save();

    res.json({
      success: true,
      message: 'Product removed from cart',
      cartCount: user.cart.reduce((total, item) => total + item.quantity, 0)
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove from cart',
      error: error.message
    });
  }
});

module.exports = router;
