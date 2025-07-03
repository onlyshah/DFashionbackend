const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const Product = require('../models/Product');

// @route   GET /wishlist
// @desc    Get user's wishlist
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const wishlistItems = req.user.wishlist || [];
    
    // Get total count
    const totalItems = wishlistItems.length;
    
    // Get paginated items
    const paginatedItems = wishlistItems.slice(skip, skip + parseInt(limit));
    
    // Populate product details
    const populatedWishlist = await Promise.all(
      paginatedItems.map(async (item) => {
        const product = await Product.findById(item.product)
          .select('name price images brand discount originalPrice rating analytics');
        
        if (!product) return null;
        
        return {
          _id: item._id,
          product,
          addedAt: item.addedAt
        };
      })
    );

    // Filter out null items (deleted products)
    const validWishlistItems = populatedWishlist.filter(item => item !== null);

    res.json({
      success: true,
      data: {
        items: validWishlistItems,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalItems / parseInt(limit)),
          totalItems,
          hasNextPage: skip + parseInt(limit) < totalItems,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wishlist'
    });
  }
});

// @route   POST /wishlist
// @desc    Add item to wishlist
// @access  Private
router.post('/', [
  auth,
  body('productId').notEmpty().withMessage('Product ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { productId } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if item already exists in wishlist
    const existingItem = req.user.wishlist.find(item => 
      item.product.toString() === productId
    );

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    // Add to wishlist
    req.user.wishlist.push({
      product: productId,
      addedAt: new Date()
    });

    await req.user.save();

    res.json({
      success: true,
      message: 'Item added to wishlist successfully'
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to wishlist'
    });
  }
});

// @route   DELETE /wishlist/:productId
// @desc    Remove item from wishlist
// @access  Private
router.delete('/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;

    // Find and remove the item
    const itemIndex = req.user.wishlist.findIndex(item => 
      item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in wishlist'
      });
    }

    req.user.wishlist.splice(itemIndex, 1);
    await req.user.save();

    res.json({
      success: true,
      message: 'Item removed from wishlist successfully'
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from wishlist'
    });
  }
});

// @route   DELETE /wishlist
// @desc    Clear wishlist
// @access  Private
router.delete('/', auth, async (req, res) => {
  try {
    req.user.wishlist = [];
    await req.user.save();

    res.json({
      success: true,
      message: 'Wishlist cleared successfully'
    });
  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear wishlist'
    });
  }
});

// @route   POST /wishlist/move-to-cart/:productId
// @desc    Move item from wishlist to cart
// @access  Private
router.post('/move-to-cart/:productId', [
  auth,
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
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

    const { productId } = req.params;
    const { quantity = 1, size, color } = req.body;

    // Check if item exists in wishlist
    const wishlistItemIndex = req.user.wishlist.findIndex(item => 
      item.product.toString() === productId
    );

    if (wishlistItemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in wishlist'
      });
    }

    // Check if item already exists in cart
    const existingCartItemIndex = req.user.cart.findIndex(item => 
      item.product.toString() === productId && 
      item.size === size && 
      item.color === color
    );

    if (existingCartItemIndex > -1) {
      // Update quantity in cart
      req.user.cart[existingCartItemIndex].quantity += quantity;
    } else {
      // Add new item to cart
      req.user.cart.push({
        product: productId,
        quantity,
        size,
        color,
        addedAt: new Date()
      });
    }

    // Remove from wishlist
    req.user.wishlist.splice(wishlistItemIndex, 1);
    
    await req.user.save();

    res.json({
      success: true,
      message: 'Item moved to cart successfully'
    });
  } catch (error) {
    console.error('Move to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to move item to cart'
    });
  }
});

module.exports = router;
