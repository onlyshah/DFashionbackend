const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const Product = require('../models/Product');

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
