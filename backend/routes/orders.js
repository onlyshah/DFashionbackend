const express = require('express');
const router = express.Router();
const { auth, requireCustomer } = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');

// All routes require authentication
router.use(auth);

// Get user's orders
router.get('/my-orders', requireCustomer, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = { customer: req.user.userId };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const orders = await Order.find(filter)
      .populate('items.product', 'name images price brand')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const totalOrders = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalOrders / parseInt(limit)),
          totalOrders
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// Get single order
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'fullName email username avatar')
      .populate('items.product', 'name images price brand category')
      .populate('timeline.updatedBy', 'fullName role');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check access permissions
    const hasAccess = order.customer._id.toString() === req.user.userId ||
                     ['admin', 'sales_manager', 'support_manager'].includes(req.user.role);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { order }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
});

// Create new order
router.post('/', requireCustomer, async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      billingAddress,
      paymentMethod,
      couponCode
    } = req.body;

    // Validate required fields
    if (!items || !items.length || !shippingAddress || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Items, shipping address, and payment method are required'
      });
    }

    // Calculate order totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive || !product.isApproved) {
        return res.status(400).json({
          success: false,
          message: `Product ${product?.name || 'unknown'} is not available`
        });
      }

      // Check inventory
      if (product.inventory.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`
        });
      }

      const itemPrice = product.discountPrice || product.price;
      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: itemPrice,
        size: item.size,
        color: item.color,
        vendor: product.vendor
      });
    }

    // Calculate additional charges
    const taxRate = 0.18; // 18% GST
    const taxAmount = subtotal * taxRate;
    const shippingAmount = subtotal > 500 ? 0 : 50; // Free shipping above ₹500

    // Apply coupon discount
    let discountAmount = 0;
    if (couponCode === 'WELCOME10') {
      discountAmount = subtotal * 0.1;
    }

    const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount;

    // Create order
    const order = new Order({
      customer: req.user.userId,
      items: orderItems,
      pricing: {
        subtotal,
        discountAmount,
        shippingAmount,
        taxAmount,
        totalAmount
      },
      paymentMethod,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      coupon: couponCode ? {
        code: couponCode,
        discountType: 'percentage',
        discountValue: 10
      } : undefined
    });

    await order.save();

    // Update product inventory
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: {
          'inventory.quantity': -item.quantity,
          'analytics.purchases': item.quantity
        }
      });
    }

    // Populate order for response
    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'fullName email')
      .populate('items.product', 'name images price');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order: populatedOrder }
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
});

module.exports = router;
