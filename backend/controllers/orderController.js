/**
 * Order Controller
 * Handles all business logic for order management
 * Model → Controller → Routes pattern
 */

const dbType = (process.env.DB_TYPE || '').toLowerCase();
const models = dbType === 'postgres' ? require('../models_sql') : require('../models')();
const { Order, Product, User } = models;

// ==================== ORDER OPERATIONS ====================

/**
 * Get user's orders with pagination and filtering
 */
exports.getUserOrders = async (req, res) => {
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
    console.error('Get orders error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

/**
 * Get single order by ID
 */
exports.getOrderById = async (req, res) => {
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
    console.error('Get order error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
};

/**
 * Create new order
 */
exports.createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      billingAddress,
      paymentMethod,
      couponCode
    } = req.body;

    // Validate required fields
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must have at least one item'
      });
    }

    // Verify product availability and calculate total
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.productId} not found`
        });
      }

      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`
        });
      }

      orderItems.push({
        product: item.productId,
        quantity: item.quantity,
        price: product.price,
        discount: item.discount || 0,
        total: (product.price * item.quantity) - (item.discount || 0)
      });

      subtotal += (product.price * item.quantity) - (item.discount || 0);
    }

    // Create order
    const order = new Order({
      customer: req.user.userId,
      items: orderItems,
      subtotal,
      tax: subtotal * 0.18, // 18% GST
      shipping: 100, // Default shipping charge
      total: subtotal + (subtotal * 0.18) + 100,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod,
      couponCode,
      status: 'pending',
      timeline: [{
        status: 'pending',
        timestamp: Date.now(),
        note: 'Order created'
      }]
    });

    await order.save();
    await order.populate('items.product', 'name images price');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Create order error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

/**
 * Update order status
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status,
        $push: {
          timeline: {
            status,
            timestamp: Date.now(),
            updatedBy: req.user.userId,
            note: note || `Order ${status}`
          }
        }
      },
      { new: true }
    ).populate('items.product', 'name images price');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated',
      data: { order }
    });
  } catch (error) {
    console.error('Update order status error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

/**
 * Cancel order
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be cancelled
    if (['delivered', 'returned', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel ${order.status} order`
      });
    }

    order.status = 'cancelled';
    order.cancellationReason = reason;
    order.cancelledAt = Date.now();
    order.timeline.push({
      status: 'cancelled',
      timestamp: Date.now(),
      updatedBy: req.user.userId,
      note: `Order cancelled: ${reason}`
    });

    await order.save();
    await order.populate('items.product', 'name images price');

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Cancel order error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message
    });
  }
};

/**
 * Get all orders (admin only)
 */
exports.getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      customer,
      startDate,
      endDate
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (customer) filter.customer = customer;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(filter)
      .populate('customer', 'fullName email username')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: orders,
      pagination: {
        currentPage: parseInt(page),
        limit: parseInt(limit),
        totalOrders: total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};
