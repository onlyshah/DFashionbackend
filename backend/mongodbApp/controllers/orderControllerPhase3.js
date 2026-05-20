/**
 * Order Controller - Complete MongoDB Implementation (Phase 3)
 * 7 methods for order management
 */

const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');
const Product = require('../models/Product');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Create order from cart
 */
exports.createOrder = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { shippingAddressId, paymentMethodId } = req.body;

    if (!shippingAddressId || !paymentMethodId) {
      throw new ApiError('Shipping and payment method required', 400, 'INVALID_INPUT');
    }

    // Get cart
    const cart = await Cart.findOne({ userId }).populate('items');
    if (!cart || cart.items.length === 0) {
      throw new ApiError('Cart is empty', 400, 'EMPTY_CART');
    }

    // Calculate order total
    let subtotal = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new ApiError('Product not found', 404, 'PRODUCT_NOT_FOUND');
      }

      subtotal += item.quantity * item.price;

      orderItems.push({
        productId: product._id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.quantity * item.price
      });

      // Update product sales
      product.sales = (product.sales || 0) + item.quantity;
      product.stock -= item.quantity;
      await product.save();
    }

    const tax = subtotal * 0.18;
    const shippingCost = 0;
    const total = subtotal + tax + shippingCost;

    // Create order
    const order = await Order.create({
      userId,
      shippingAddressId,
      paymentMethodId,
      items: orderItems,
      subtotal,
      tax,
      shippingCost,
      total,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date()
    });

    // Clear cart
    await CartItem.deleteMany({ _id: { $in: cart.items } });
    cart.items = [];
    await cart.save();

    return ApiResponse.success(res, order, 'Order created', null, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get user's orders
 */
exports.getOrders = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, status, sort = '-createdAt' } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const filter = { userId };
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('items.productId', 'name images price')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter)
    ]);

    return ApiResponse.success(res, orders, 'Orders retrieved', {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get order by ID
 */
exports.getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid order ID', 400, 'INVALID_ID');
    }

    const order = await Order.findById(id)
      .populate('userId', 'email username')
      .populate('items.productId', 'name images price')
      .lean();

    if (!order) {
      throw new ApiError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    return ApiResponse.success(res, order, 'Order retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Update order status (Admin only)
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid order ID', 400, 'INVALID_ID');
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new ApiError('Invalid status', 400, 'INVALID_STATUS');
    }

    const order = await Order.findByIdAndUpdate(id, { status }, { new: true })
      .populate('items.productId', 'name');

    if (!order) {
      throw new ApiError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    return ApiResponse.success(res, order, 'Order status updated');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Cancel order
 */
exports.cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid order ID', 400, 'INVALID_ID');
    }

    const order = await Order.findById(id);
    if (!order) {
      throw new ApiError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // Check if user owns order or is admin
    if (order.userId.toString() !== userId.toString() && req.user.role !== 'admin') {
      throw new ApiError('Unauthorized', 403, 'FORBIDDEN');
    }

    // Can only cancel pending or confirmed orders
    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new ApiError('Cannot cancel order in current status', 400, 'CANNOT_CANCEL');
    }

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity, sales: -item.quantity }
      });
    }

    order.status = 'cancelled';
    await order.save();

    return ApiResponse.success(res, order, 'Order cancelled');
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Track order
 */
exports.trackOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid order ID', 400, 'INVALID_ID');
    }

    const order = await Order.findById(id)
      .select('status paymentStatus createdAt updatedAt trackingNumber shippingCost')
      .lean();

    if (!order) {
      throw new ApiError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    return ApiResponse.success(res, order, 'Order tracking info');
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Get invoice
 */
exports.getInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid order ID', 400, 'INVALID_ID');
    }

    const order = await Order.findById(id)
      .populate('userId', 'email username firstName lastName')
      .populate('items.productId', 'name price sku')
      .lean();

    if (!order) {
      throw new ApiError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // Format invoice data
    const invoice = {
      invoiceNumber: `INV-${order._id}`,
      date: new Date(order.createdAt).toLocaleDateString(),
      customer: {
        email: order.userId.email,
        username: order.userId.username,
        name: `${order.userId.firstName} ${order.userId.lastName}`
      },
      items: order.items.map(item => ({
        name: item.productId.name,
        sku: item.productId.sku,
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.quantity * item.price
      })),
      subtotal: order.subtotal,
      tax: order.tax,
      shipping: order.shippingCost,
      total: order.total,
      status: order.status
    };

    return ApiResponse.success(res, invoice, 'Invoice retrieved');
  } catch (error) {
    next(error);
  }
};
