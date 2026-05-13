/**
 * ============================================================================
 * ORDER CONTROLLER - PostgreSQL/Sequelize Implementation
 * ============================================================================
 * Purpose: Order management, tracking, status updates, refunds
 * Database: PostgreSQL via Sequelize ORM
 * 
 * Methods:
 * 1. createOrder() - Create order from cart with stock management
 * 2. getUserOrders() / getOrders() - Retrieve user's paginated orders
 * 3. getOrderById() - Fetch single order with all relationships
 * 4. updateOrderStatus() - Update order status (admin)
 * 5. cancelOrder() - Cancel order and restore stock
 * 6. trackOrder() - Get order tracking information
 * 7. getOrderStats() - Get order statistics (admin only)
 * 8. getTotalItemsPurchased() - Get user's purchase statistics
 * 9. generateInvoice() - Generate invoice for order
 */

const { Op } = require('sequelize');
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');
const { formatPaginatedResponse, formatSingleResponse, validateMultipleFK, buildIncludeClause } = require('../utils/fkResponseFormatter');

/**
 * METHOD 1: Create new order from cart
 */
exports.createOrder = async (req, res) => {
  try {
    const { shipping_address_id, billing_address_id, payment_method, notes } = req.body;

    // Validate FKs exist
    const validation = await validateMultipleFK([
      { model: 'User', id: req.user.id },
      { model: 'Address', id: shipping_address_id },
      { model: 'Address', id: billing_address_id }
    ]);

    if (!validation.isValid) {
      return ApiResponse.error(res, validation.errors.join('; '), 400);
    }

    // Validate addresses
    const shipping_addr = await models.Address.findByPk(shipping_address_id);
    const billing_addr = await models.Address.findByPk(billing_address_id);

    if (!shipping_addr || shipping_addr.userId !== req.user.id) {
      return ApiResponse.notFound(res, 'Shipping address');
    }

    if (!billing_addr || billing_addr.userId !== req.user.id) {
      return ApiResponse.notFound(res, 'Billing address');
    }

    // Get cart
    const cart = await models.Cart.findOne({
      where: { userId: req.user.id },
      include: [
        {
          model: models.CartItem,
          as: 'items',
          include: [
            {
              model: models.Product,
              attributes: ['id', 'name', 'price', 'stock']
            }
          ]
        }
      ]
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return ApiResponse.error(res, 'Cart is empty', 422);
    }

    // Verify stock and calculate total
    let subtotal = 0;
    for (const item of cart.items) {
      const product = item.Product;
      if (product.stock < item.quantity) {
        return ApiResponse.error(res, `Insufficient stock for ${product.name}`, 409);
      }
      subtotal += product.price * item.quantity;
    }

    const TAX_RATE = 0.18;
    const tax_amount = subtotal * TAX_RATE;
    const shipping_cost = subtotal > 500 ? 0 : 100;
    const total_amount = subtotal + tax_amount + shipping_cost;

    // Create order with transaction
    const t = await models.sequelize.transaction();
    try {
      const order = await models.Order.create({
        userId: req.user.id,
        orderNumber: `ORD-${Date.now()}`,
        status: 'pending',
        subtotal,
        taxAmount: tax_amount,
        shippingCost: shipping_cost,
        totalAmount: total_amount,
        shippingAddressId: shipping_address_id,
        billingAddressId: billing_address_id,
        paymentMethod: payment_method,
        notes
      }, { transaction: t });

      // Create order items and reduce stock
      for (const cart_item of cart.items) {
        const product = cart_item.Product;
        await models.OrderItem.create({
          orderId: order.id,
          productId: cart_item.productId,
          quantity: cart_item.quantity,
          unitPrice: product.price
        }, { transaction: t });

        await product.decrement('stock', { by: cart_item.quantity, transaction: t });
      }

      // Clear cart
      await models.CartItem.destroy({ where: { cartId: cart.id }, transaction: t });
      await cart.destroy({ transaction: t });

      await t.commit();

      // Get complete order with includes
      const completeOrder = await models.Order.findByPk(order.id, { include: buildIncludeClause('Order') });

      return ApiResponse.created(res, formatSingleResponse(completeOrder), 'Order created successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ [Postgres] createOrder error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 2: Get user's orders
 */
exports.getUserOrders = exports.getOrders = async (req, res) => {
  try {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const { status } = req.query;
    const offset = (page - 1) * limit;

    const where = { userId: req.user.id };
    if (status) where.status = status;

    const result = await models.Order.findAndCountAll({
      where,
      include: buildIncludeClause('Order'),
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    const pagination = { page, limit, total: result.count, totalPages: Math.ceil(result.count / limit) };
    const response = formatPaginatedResponse(result.rows, pagination);

    return ApiResponse.paginated(res, response.data, response.pagination, 'Orders retrieved successfully');
  } catch (error) {
    console.error('❌ [Postgres] getOrders error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 3: Get order by ID
 */
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await models.Order.findByPk(id, {
      include: buildIncludeClause('Order')
    });

    if (!order) {
      return ApiResponse.notFound(res, 'Order');
    }

    // Verify ownership or admin
    if (order.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'You can only view your own orders');
    }

    // Format response
    const response = formatSingleResponse(order);

    // Parse JSON fields if present
    if (response.shipping_address && typeof response.shipping_address === 'string') {
      try {
        response.shipping_address = JSON.parse(response.shipping_address);
      } catch (e) {
        // Keep as is
      }
    }

    return ApiResponse.success(res, response, 'Order retrieved successfully');
  } catch (error) {
    console.error('❌ [Postgres] getOrderById error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 4: Update order status (admin only)
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

    // Return with all relationships
    const updated = await models.Order.findByPk(id, {
      include: buildIncludeClause('Order')
    });

    return ApiResponse.success(res, formatSingleResponse(updated), 'Order status updated successfully');
  } catch (error) {
    console.error('❌ [Postgres] updateOrderStatus error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 5: Cancel order
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
    if (order.userId !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.forbidden(res, 'You can only cancel your own orders');
    }

    // Can only cancel pending or processing orders
    if (!['pending', 'processing'].includes(order.status)) {
      return ApiResponse.error(res, 'Order cannot be cancelled at current status', 409);
    }

    // Handle with transaction
    const t = await models.sequelize.transaction();
    try {
      // Restore stock
      const items = await models.OrderItem.findAll({ where: { orderId: id }, transaction: t });
      for (const item of items) {
        await models.Product.increment('stock', { by: item.quantity, where: { id: item.productId }, transaction: t });
      }

      // Update order status
      await order.update({ status: 'cancelled', cancellationReason: reason }, { transaction: t });

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }

    // Return updated order
    const updated = await models.Order.findByPk(id, {
      include: buildIncludeClause('Order')
    });

    return ApiResponse.success(res, formatSingleResponse(updated), 'Order cancelled successfully');
  } catch (error) {
    console.error('❌ [Postgres] cancelOrder error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 6: Track order
 */
exports.trackOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await models.Order.findByPk(id, {
      attributes: ['id', 'orderNumber', 'status', 'createdAt', 'updatedAt', 'shippingCost'],
      include: [
        {
          model: models.Address,
          as: 'shippingAddress',
          attributes: ['street', 'city', 'state', 'postalCode', 'country']
        }
      ]
    });

    if (!order) {
      return ApiResponse.notFound(res, 'Order');
    }

    // Verify ownership
    if (order.userId !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.forbidden(res, 'You can only track your own orders');
    }

    return ApiResponse.success(res, {
      order_number: order.orderNumber,
      status: order.status,
      shipping_address: order.shippingAddress,
      timeline: {
        ordered_at: order.createdAt,
        last_update: order.updatedAt
      }
    }, 'Order tracking information retrieved successfully');
  } catch (error) {
    console.error('❌ [Postgres] trackOrder error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 7: Get order statistics (admin only) - POSTGRES ONLY
 */
exports.getOrderStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const date = new Date();
    date.setDate(date.getDate() - parseInt(days));

    const total_orders = await models.Order.count({
      where: { createdAt: { [Op.gte]: date } }
    });

    const total_revenue = await models.Order.sum('totalAmount', {
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
    console.error('❌ [Postgres] getOrderStats error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 8: Get total items purchased by user
 */
exports.getTotalItemsPurchased = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    if (!userId) {
      return ApiResponse.error(res, 'User not authenticated', 401);
    }

    const result = await models.sequelize.query(
      `SELECT 
        COALESCE(SUM(oi.quantity), 0) as total_quantity,
        COALESCE(SUM(DISTINCT o.total_amount), 0) as total_spent,
        COUNT(DISTINCT o.id) as order_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = :userId AND o.status != 'cancelled'`,
      {
        replacements: { userId },
        type: models.sequelize.QueryTypes.SELECT
      }
    );

    let totalQuantity = 0;
    let totalSpent = 0;
    let orderCount = 0;

    if (result && result.length > 0) {
      totalQuantity = parseInt(result[0].total_quantity || 0);
      totalSpent = parseFloat(result[0].total_spent || 0);
      orderCount = parseInt(result[0].order_count || 0);
    }

    return ApiResponse.success(res, {
      totalItemsPurchased: totalQuantity,
      totalSpent,
      totalOrders: orderCount
    }, 'User purchase statistics retrieved successfully');
  } catch (error) {
    console.error('❌ [Postgres] getTotalItemsPurchased error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * METHOD 9: Generate invoice for order
 */
exports.generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await models.Order.findByPk(orderId, {
      include: buildIncludeClause('Order')
    });

    if (!order) {
      return ApiResponse.notFound(res, 'Order');
    }

    // Verify ownership
    if (order.userId !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.forbidden(res, 'You can only view your own invoice');
    }

    // Format response
    const formattedOrder = formatSingleResponse(order);

    // Generate invoice data with nested objects
    const invoice = {
      invoice_number: `INV-${formattedOrder.orderNumber}`,
      order_id: formattedOrder.id,
      order_number: formattedOrder.orderNumber,
      date: formattedOrder.createdAt,
      customer: formattedOrder.customer,
      items: formattedOrder.items,
      subtotal: formattedOrder.subtotal,
      tax: formattedOrder.taxAmount,
      shipping: formattedOrder.shippingCost,
      total: formattedOrder.totalAmount,
      shipping_address: formattedOrder.shippingAddress
    };

    return ApiResponse.success(res, invoice, 'Invoice generated successfully');
  } catch (error) {
    console.error('❌ [Postgres] generateInvoice error:', error);
    return ApiResponse.serverError(res, error);
  }
};


