const express = require('express');
const router = express.Router();
const { auth, requireCustomer } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const models = require('../models');
const User = models.User;
const Product = require('../models/Product');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

// All routes require customer authentication
router.use(auth, requireCustomer);

// @route   GET /api/checkout/cart-summary
// @desc    Get cart summary for checkout
// @access  Private
router.get('/cart-summary', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'cart.product',
        select: 'name price originalPrice discount images brand sizes colors isActive stock',
        populate: {
          path: 'vendor',
          select: 'fullName businessName'
        }
      });

    if (!user || !user.cart.length) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Filter active products and check stock
    const validItems = [];
    const unavailableItems = [];

    for (const item of user.cart) {
      if (!item.product || !item.product.isActive) {
        unavailableItems.push({
          reason: 'Product no longer available',
          item: item
        });
        continue;
      }

      // Check stock for specific size
      if (item.size) {
        const sizeInfo = item.product.sizes.find(s => s.size === item.size);
        if (!sizeInfo || sizeInfo.stock < item.quantity) {
          unavailableItems.push({
            reason: 'Insufficient stock',
            item: item,
            availableStock: sizeInfo ? sizeInfo.stock : 0
          });
          continue;
        }
      } else if (item.product.stock < item.quantity) {
        unavailableItems.push({
          reason: 'Insufficient stock',
          item: item,
          availableStock: item.product.stock
        });
        continue;
      }

      validItems.push(item);
    }

    // Calculate totals
    let subtotal = 0;
    let totalDiscount = 0;

    const cartItems = validItems.map(item => {
      const price = item.product.price;
      const originalPrice = item.product.originalPrice || price;
      const itemSubtotal = originalPrice * item.quantity;
      const itemTotal = price * item.quantity;
      const itemDiscount = itemSubtotal - itemTotal;

      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;

      return {
        _id: item._id,
        product: item.product,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price: price,
        originalPrice: originalPrice,
        itemSubtotal,
        itemTotal,
        itemDiscount
      };
    });

    const taxRate = 0.18; // 18% GST
    const taxableAmount = subtotal - totalDiscount;
    const taxAmount = taxableAmount * taxRate;
    const shippingAmount = taxableAmount > 500 ? 0 : 50; // Free shipping above ₹500
    const totalAmount = taxableAmount + taxAmount + shippingAmount;

    res.json({
      success: true,
      data: {
        items: cartItems,
        unavailableItems,
        summary: {
          itemCount: cartItems.length,
          subtotal,
          discount: totalDiscount,
          taxableAmount,
          taxAmount,
          shippingAmount,
          totalAmount
        }
      }
    });

  } catch (error) {
    console.error('Get cart summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart summary'
    });
  }
});

// @route   POST /api/checkout/validate
// @desc    Validate checkout data
// @access  Private
router.post('/validate', [
  body('shippingAddress.fullName').notEmpty().withMessage('Full name is required'),
  body('shippingAddress.phone').notEmpty().withMessage('Phone number is required'),
  body('shippingAddress.addressLine1').notEmpty().withMessage('Address is required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.state').notEmpty().withMessage('State is required'),
  body('shippingAddress.pincode').isLength({ min: 6, max: 6 }).withMessage('Valid pincode is required'),
  body('paymentMethod').isIn(['card', 'upi', 'netbanking', 'wallet', 'cod']).withMessage('Invalid payment method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { shippingAddress, billingAddress, paymentMethod } = req.body;

    // Validate cart again
    const user = await User.findById(req.user._id).populate('cart.product');
    
    if (!user.cart.length) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Check if all products are still available
    for (const item of user.cart) {
      if (!item.product || !item.product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.product?.name || 'Unknown'} is no longer available`
        });
      }
    }

    res.json({
      success: true,
      message: 'Checkout data is valid',
      data: {
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        paymentMethod
      }
    });

  } catch (error) {
    console.error('Validate checkout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate checkout data'
    });
  }
});

// @route   POST /api/checkout/place-order
// @desc    Place order
// @access  Private
router.post('/place-order', [
  body('shippingAddress.fullName').notEmpty().withMessage('Full name is required'),
  body('shippingAddress.phone').notEmpty().withMessage('Phone number is required'),
  body('shippingAddress.addressLine1').notEmpty().withMessage('Address is required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.state').notEmpty().withMessage('State is required'),
  body('shippingAddress.pincode').isLength({ min: 6, max: 6 }).withMessage('Valid pincode is required'),
  body('paymentMethod').isIn(['card', 'upi', 'netbanking', 'wallet', 'cod']).withMessage('Invalid payment method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { shippingAddress, billingAddress, paymentMethod, notes } = req.body;

    const user = await User.findById(req.user._id).populate('cart.product');
    
    if (!user.cart.length) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Calculate order totals
    let subtotal = 0;
    let totalDiscount = 0;
    const orderItems = [];

    for (const item of user.cart) {
      if (!item.product || !item.product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.product?.name || 'Unknown'} is no longer available`
        });
      }

      const price = item.product.price;
      const originalPrice = item.product.originalPrice || price;
      const itemSubtotal = originalPrice * item.quantity;
      const itemTotal = price * item.quantity;
      const itemDiscount = itemSubtotal - itemTotal;

      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;

      orderItems.push({
        product: item.product._id,
        vendor: item.product.vendor,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price: price,
        originalPrice: originalPrice,
        discount: itemDiscount
      });
    }

    const taxRate = 0.18;
    const taxableAmount = subtotal - totalDiscount;
    const taxAmount = taxableAmount * taxRate;
    const shippingAmount = taxableAmount > 500 ? 0 : 50;
    const totalAmount = taxableAmount + taxAmount + shippingAmount;

    // Create order
    const order = new Order({
      orderNumber: `ORD${Date.now()}`,
      customer: req.user._id,
      items: orderItems,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod,
      subtotal,
      discount: totalDiscount,
      taxAmount,
      shippingAmount,
      totalAmount,
      notes,
      status: 'pending'
    });

    await order.save();

    // Clear cart
    user.cart = [];
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod
      }
    });

  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place order'
    });
  }
});

module.exports = router;
