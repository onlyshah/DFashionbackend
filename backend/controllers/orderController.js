/**
 * ============================================================================
 * ORDER CONTROLLER - PostgreSQL/Sequelize
 * ============================================================================
 * Purpose: Order management, tracking, status updates, refunds
 * Database: PostgreSQL via Sequelize ORM
 */

const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');
const { Op } = require('sequelize');

/**
 * Create new order from cart
 */
exports.createOrder = async (req, res) => {
  try {
    const { shipping_address_id, billing_address_id, payment_method, notes } = req.body;

    // Validate addresses
    const shipping_addr = await models.Address.findByPk(shipping_address_id);
    if (!shipping_addr || shipping_addr.user_id !== req.user.id) {
      return ApiResponse.notFound(res, 'Shipping address');
    }

    const billing_addr = await models.Address.findByPk(billing_address_id);
    if (!billing_addr || billing_addr.user_id !== req.user.id) {
      return ApiResponse.notFound(res, 'Billing address');
    }

    // Get cart
    const cart = await models.Cart.findOne({
      where: { user_id: req.user.id },
      include: {
        model: models.CartItem,
        as: 'items',
        include: { model: models.Product, attributes: ['id', 'name', 'price', 'stock'] }
      }
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return ApiResponse.error(res, 'Cart is empty', 422);
    }

    // Verify stock and calculate total
    let subtotal = 0;
    for (const item of cart.items) {
      if (item.Product.stock < item.quantity) {
        return ApiResponse.error(res, `Insufficient stock for ${item.Product.name}`, 409);
      }
      subtotal += item.Product.price * item.quantity;
    }

    const TAX_RATE = 0.18;
    const tax_amount = subtotal * TAX_RATE;
    const shipping_cost = subtotal > 500 ? 0 : 100;
    const total_amount = subtotal + tax_amount + shipping_cost;

    // Create order (transaction for consistency)
    const t = await models.sequelize.transaction();
    try {
      const order = await models.Order.create({
        user_id: req.user.id,
        order_number: `ORD-${Date.now()}`,
        status: 'pending',
        subtotal,
        tax_amount,
        shipping_cost,
        total_amount,
        shipping_address_id,
        billing_address_id,
        payment_method,
        notes
      }, { transaction: t });

      // Create order items and reduce stock
      for (const cart_item of cart.items) {
        await models.OrderItem.create({
          order_id: order.id,
          product_id: cart_item.product_id,
          quantity: cart_item.quantity,
          unit_price: cart_item.Product.price
        }, { transaction: t });

        await cart_item.Product.decrement('stock', { by: cart_item.quantity, transaction: t });
      }

      // Clear cart
      await models.CartItem.destroy({ where: { cart_id: cart.id }, transaction: t });

      await t.commit();

      const created_order = await models.Order.findByPk(order.id, {
        include: [
          { model: models.OrderItem, as: 'items' },
          { model: models.Address, as: 'shipping_address' }
        ]
      });

      return ApiResponse.created(res, created_order, 'Order created successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ createOrder error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get user's orders
 */
exports.getUserOrders = exports.getOrders = async (req, res) => {
  try {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const { status } = req.query;
    const offset = (page - 1) * limit;

    const where = { user_id: req.user.id };
    if (status) where.status = status;

    const { count, rows } = await models.Order.findAndCountAll({
      where,
      include: [
        { model: models.OrderItem, as: 'items', attributes: ['id', 'quantity', 'unit_price'] },
        { model: models.Address, as: 'shipping_address', attributes: ['street', 'city', 'state', 'postal_code'] }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    const pagination = { page, limit, total: count, totalPages: Math.ceil(count / limit) };

    return ApiResponse.paginated(res, rows, pagination, 'Orders retrieved successfully');
  } catch (error) {
    console.error('❌ getOrders error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get order by ID
 */
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await models.Order.findByPk(id, {
      include: [
        { model: models.OrderItem, as: 'items', include: { model: models.Product, attributes: ['name', 'images'] } },
        { model: models.Address, as: 'shipping_address' },
        { model: models.Address, as: 'billing_address' }
      ]
    });

    if (!order) {
      return ApiResponse.notFound(res, 'Order');
    }

    // Verify ownership or admin
    if (order.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'You can only view your own orders');
    }

    return ApiResponse.success(res, order, 'Order retrieved successfully');
  } catch (error) {
    console.error('❌ getOrderById error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Update order status (admin only)
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const valid_statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!valid_statuses.includes(status)) {
      return ApiResponse.error(res, 'Invalid status', 422);
    }

    const order = await models.Order.findByPk(id);
    if (!order) {
      return ApiResponse.notFound(res, 'Order');
    }

    await order.update({ status });

    return ApiResponse.success(res, order, 'Order status updated successfully');
  } catch (error) {
    console.error('❌ updateOrderStatus error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Cancel order
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await models.Order.findByPk(id);
    if (!order) {
      return ApiResponse.notFound(res, 'Order');
    }

    // Verify ownership
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.forbidden(res, 'You can only cancel your own orders');
    }

    // Can only cancel pending or processing orders
    if (!['pending', 'processing'].includes(order.status)) {
      return ApiResponse.error(res, 'Order cannot be cancelled at current status', 409);
    }

    const t = await models.sequelize.transaction();
    try {
      // Restore stock
      const items = await models.OrderItem.findAll({ where: { order_id: id }, transaction: t });
      for (const item of items) {
        await models.Product.increment('stock', { by: item.quantity, where: { id: item.product_id }, transaction: t });
      }

      // Update order status
      await order.update({ status: 'cancelled', cancellation_reason: reason }, { transaction: t });

      await t.commit();

      return ApiResponse.success(res, order, 'Order cancelled successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ cancelOrder error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Track order
 */
exports.trackOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await models.Order.findByPk(id, {
      attributes: ['id', 'order_number', 'status', 'createdAt', 'updatedAt', 'shipping_cost'],
      include: {
        model: models.Address,
        as: 'shipping_address',
        attributes: ['street', 'city', 'state', 'postal_code', 'country']
      }
    });

    if (!order) {
      return ApiResponse.notFound(res, 'Order');
    }

    // Verify ownership
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.forbidden(res, 'You can only track your own orders');
    }

    return ApiResponse.success(res, {
      order_number: order.order_number,
      status: order.status,
      shipping_address: order.shipping_address,
      timeline: {
        ordered_at: order.createdAt,
        last_update: order.updatedAt
      }
    }, 'Order tracking information retrieved successfully');
  } catch (error) {
    console.error('❌ trackOrder error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get order statistics (admin)
 */
exports.getOrderStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const date = new Date();
    date.setDate(date.getDate() - parseInt(days));

    const total_orders = await models.Order.count({
      where: { createdAt: { [Op.gte]: date } }
    });

    const total_revenue = await models.Order.sum('total_amount', {
      where: { createdAt: { [Op.gte]: date } }
    });

    const orders_by_status = await models.Order.findAll({
      attributes: ['status', [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']],
      where: { createdAt: { [Op.gte]: date } },
      group: ['status'],
      raw: true
    });

    return ApiResponse.success(res, {
      total_orders,
      total_revenue: total_revenue || 0,
      orders_by_status
    }, 'Order statistics retrieved successfully');
  } catch (error) {
    console.error('❌ getOrderStats error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Generate invoice for order
 */
exports.generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await models.Order.findByPk(orderId, {
      include: [
        { model: models.OrderItem, as: 'items', include: { model: models.Product } },
        { model: models.Address, as: 'shipping_address' }
      ]
    });

    if (!order) {
      return ApiResponse.notFound(res, 'Order');
    }

    // Verify ownership
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.forbidden(res, 'You can only view your own invoice');
    }

    // Generate invoice data
    const invoice = {
      invoice_number: `INV-${order.order_number}`,
      order_id: order.id,
      order_number: order.order_number,
      date: order.createdAt,
      items: order.items,
      subtotal: order.subtotal,
      tax: order.tax_amount,
      shipping: order.shipping_cost,
      total: order.total_amount,
      shipping_address: order.shipping_address
    };

    return ApiResponse.success(res, invoice, 'Invoice generated successfully');
  } catch (error) {
    console.error('❌ generateInvoice error:', error);
    return ApiResponse.serverError(res, error);
  }
};