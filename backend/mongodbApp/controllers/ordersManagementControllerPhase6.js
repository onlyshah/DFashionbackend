/**
 * Orders Management Controller - Complete MongoDB Implementation (Phase 6)
 * 7 methods for admin order management
 */

const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Get all orders (Admin only)
 */
exports.getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, userId, dateFrom, dateTo, sort = '-createdAt' } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (status) filter.status = status;
    if (userId) filter.userId = userId;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('userId', 'name email phone')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter)
    ]);

    return ApiResponse.paginated(res, orders, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Orders retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get order details
 */
exports.getOrderDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid order ID', 400, 'INVALID_ID');
    }

    const order = await Order.findById(orderId)
      .populate('userId', 'name email phone address')
      .populate('items.productId', 'name price images')
      .lean();

    if (!order) {
      throw new ApiError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    return ApiResponse.success(res, order, 'Order details retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Update order status
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, reason } = req.body;

    if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid order ID', 400, 'INVALID_ID');
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'returned'];
    if (!validStatuses.includes(status)) {
      throw new ApiError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400, 'INVALID_STATUS');
    }

    const order = await Order.findById(orderId);

    if (!order) {
      throw new ApiError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    order.status = status;
    if (reason) order.statusReason = reason;
    order.updatedAt = new Date();

    await order.save();

    // Send notification to user
    await Notification.create({
      user: order.userId,
      type: 'order_status',
      title: `Order status updated to ${status}`,
      message: `Your order #${order.orderNumber} status has been updated to ${status}`,
      relatedOrder: order._id
    }).catch(() => {});

    const updatedOrder = await Order.findById(orderId).populate('userId', 'name email');

    return ApiResponse.success(res, updatedOrder, 'Order status updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Generate invoice
 */
exports.generateInvoice = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid order ID', 400, 'INVALID_ID');
    }

    const order = await Order.findById(orderId)
      .populate('userId', 'name email phone address')
      .populate('items.productId', 'name price sku');

    if (!order) {
      throw new ApiError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // In a real app, this would generate a PDF
    const invoice = {
      invoiceNumber: `INV-${order.orderNumber}`,
      date: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt
      },
      customer: order.userId,
      items: order.items,
      subtotal: order.subtotalAmount,
      tax: order.taxAmount,
      shipping: order.shippingCost,
      total: order.totalAmount,
      paymentStatus: order.paymentStatus
    };

    return ApiResponse.success(res, invoice, 'Invoice generated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Send order reminder
 */
exports.sendOrderReminder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { message } = req.body;

    if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid order ID', 400, 'INVALID_ID');
    }

    const order = await Order.findById(orderId);

    if (!order) {
      throw new ApiError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // Create notification for user
    await Notification.create({
      user: order.userId,
      type: 'order_status',
      title: 'Order Reminder',
      message: message || `Reminder about your order #${order.orderNumber}`,
      relatedOrder: order._id
    });

    return ApiResponse.success(res, {
      orderId,
      reminderSent: true
    }, 'Reminder sent successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Get order analytics
 */
exports.getOrderAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [statusDistribution, paymentDistribution, avgOrderValue] = await Promise.all([
      Order.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: filter },
        { $group: { _id: '$paymentStatus', count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: filter },
        { $group: { _id: null, avgAmount: { $avg: '$totalAmount' } } }
      ])
    ]);

    return ApiResponse.success(res, {
      statusDistribution,
      paymentDistribution,
      avgOrderValue: avgOrderValue[0]?.avgAmount || 0
    }, 'Order analytics retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Export orders (CSV/JSON)
 */
exports.exportOrders = async (req, res, next) => {
  try {
    const { format = 'json', status, dateFrom, dateTo } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const orders = await Order.find(filter)
      .populate('userId', 'name email phone')
      .lean();

    if (format === 'csv') {
      // In a real app, this would generate CSV
      const csv = 'OrderNumber,Status,Total,Date\n' +
        orders.map(o => `${o.orderNumber},${o.status},${o.totalAmount},${o.createdAt}`).join('\n');

      return res.setHeader('Content-Type', 'text/csv')
        .setHeader('Content-Disposition', 'attachment; filename=orders.csv')
        .send(csv);
    }

    return ApiResponse.success(res, orders, 'Orders exported successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
