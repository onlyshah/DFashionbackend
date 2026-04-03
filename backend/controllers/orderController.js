/**
 * ============================================================================
 * ORDER CONTROLLER - Unified Database Support
 * ============================================================================
 * Purpose: Order management, tracking, status updates, refunds
 * Database: PostgreSQL/MongoDB via unified models
 */

const dbType = process.env.DB_TYPE || 'mongodb';
const models = dbType.includes('postgres') ? require('../models_sql') : require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { validatePagination } = require('../utils/validation');
const { formatPaginatedResponse, formatSingleResponse, validateMultipleFK } = require('../utils/fkResponseFormatter');

/**
 * Create new order from cart
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
    let shipping_addr, billing_addr;
    if (models.isPostgres) {
      shipping_addr = await models.Address.findByPk(shipping_address_id);
      billing_addr = await models.Address.findByPk(billing_address_id);
    } else {
      shipping_addr = await models.Address.findById(shipping_address_id);
      billing_addr = await models.Address.findById(billing_address_id);
    }

    if (!shipping_addr || shipping_addr.userId !== req.user.id) {
      return ApiResponse.notFound(res, 'Shipping address');
    }

    if (!billing_addr || billing_addr.userId !== req.user.id) {
      return ApiResponse.notFound(res, 'Billing address');
    }

    // Get cart
    let cart;
    if (models.isPostgres) {
      cart = await models.Cart.findOne({
        where: { userId: req.user.id },
        include: {
          model: models.CartItem._model,
          as: 'items',
          include: { model: models.Product._model, attributes: ['id', 'name', 'price', 'stock'] }
        }
      });
    } else {
      cart = await models.Cart.findOne({ userId: req.user.id })
        .populate({
          path: 'items',
          populate: { path: 'product', select: 'id name price stock' }
        });
    }

    if (!cart || !cart.items || cart.items.length === 0) {
      return ApiResponse.error(res, 'Cart is empty', 422);
    }

    // Verify stock and calculate total
    let subtotal = 0;
    for (const item of cart.items) {
      const product = item.product || item.Product;
      if (product.stock < item.quantity) {
        return ApiResponse.error(res, `Insufficient stock for ${product.name}`, 409);
      }
      subtotal += product.price * item.quantity;
    }

    const TAX_RATE = 0.18;
    const tax_amount = subtotal * TAX_RATE;
    const shipping_cost = subtotal > 500 ? 0 : 100;
    const total_amount = subtotal + tax_amount + shipping_cost;

    // Create order (handle transactions differently for each DB)
    let order;
    if (models.isPostgres) {
      const t = await models.sequelize.transaction();
      try {
        order = await models.Order.create({
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
      } catch (error) {
        await t.rollback();
        throw error;
      }
    } else {
      // MongoDB - no transactions, handle sequentially
      order = await models.Order.create({
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
      });

      // Create order items and reduce stock
      for (const cart_item of cart.items) {
        const product = cart_item.product;
        await models.OrderItem.create({
          orderId: order._id,
          productId: cart_item.productId,
          quantity: cart_item.quantity,
          unitPrice: product.price
        });

        await models.Product.updateOne(
          { _id: cart_item.productId },
          { $inc: { stock: -cart_item.quantity } }
        );
      }

      // Clear cart
      await models.CartItem.deleteMany({ cartId: cart._id });
      await models.Cart.deleteOne({ _id: cart._id });
    }

    // Get complete order with includes
    let completeOrder;
    if (models.isPostgres) {
      completeOrder = await models.Order.findByPk(order.id, { include: buildIncludeClause('Order') });
    } else {
      completeOrder = await models.Order.findById(order._id)
        .populate('customer', 'id email firstName lastName phone')
        .populate('payments', 'id status amount paymentMethod')
        .populate('shipments', 'id status trackingNumber')
        .populate('returns', 'id status reason');
    }

    return ApiResponse.created(res, formatSingleResponse(completeOrder), 'Order created successfully');
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

    const where = { userId: req.user.id };
    if (status) where.status = status;

    let result;
    if (models.isPostgres) {
      result = await models.Order.findAndCountAll({
        where,
        include: buildIncludeClause('Order'),  // ← Auto-includes customer, payments, shipments, returns
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true
      });
    } else {
      const sortOptions = { createdAt: -1 };
      result = await models.Order.findAndCountAll({
        where,
        populate: [
          { path: 'customer', select: 'id email firstName lastName phone' },
          { path: 'payments', select: 'id status amount paymentMethod' },
          { path: 'shipments', select: 'id status trackingNumber' },
          { path: 'returns', select: 'id status reason' }
        ],
        sort: sortOptions,
        limit,
        offset
      });
    }

    const pagination = { page, limit, total: result.count, totalPages: Math.ceil(result.count / limit) };

    // Format response - removes raw FK IDs, includes nested objects
    const response = formatPaginatedResponse(result.rows, pagination);

    return ApiResponse.paginated(res, response.data, response.pagination, 'Orders retrieved successfully');
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

    let order;
    if (models.isPostgres) {
      order = await models.Order.findByPk(id, {
        include: buildIncludeClause('Order')  // ← Auto-includes all relationships
      });
    } else {
      order = await models.Order.findById(id)
        .populate('customer', 'id email firstName lastName phone')
        .populate('payments', 'id status amount paymentMethod')
        .populate('shipments', 'id status trackingNumber')
        .populate('returns', 'id status reason');
    }

    if (!order) {
      return ApiResponse.notFound(res, 'Order');
    }

    // Verify ownership or admin
    if (order.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return ApiResponse.forbidden(res, 'You can only view your own orders');
    }

    // Format response - removes raw FK IDs, includes nested objects
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

    let order;
    if (models.isPostgres) {
      order = await models.Order.findByPk(id);
    } else {
      order = await models.Order.findById(id);
    }

    if (!order) {
      return ApiResponse.notFound(res, 'Order');
    }

    if (models.isPostgres) {
      await order.update({ status });
    } else {
      await models.Order.updateOne({ _id: id }, { status });
    }

    // Return with all relationships
    let updated;
    if (models.isPostgres) {
      updated = await models.Order.findByPk(id, {
        include: buildIncludeClause('Order')
      });
    } else {
      updated = await models.Order.findById(id)
        .populate('customer', 'id email firstName lastName phone')
        .populate('payments', 'id status amount paymentMethod')
        .populate('shipments', 'id status trackingNumber')
        .populate('returns', 'id status reason');
    }

    return ApiResponse.success(res, formatSingleResponse(updated), 'Order status updated successfully');
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

    let order;
    if (models.isPostgres) {
      order = await models.Order.findByPk(id);
    } else {
      order = await models.Order.findById(id);
    }

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

    if (models.isPostgres) {
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
    } else {
      // MongoDB - no transactions, handle sequentially
      // Restore stock
      const items = await models.OrderItem.find({ orderId: id });
      for (const item of items) {
        await models.Product.updateOne(
          { _id: item.productId },
          { $inc: { stock: item.quantity } }
        );
      }

      // Update order status
      await models.Order.updateOne({ _id: id }, { status: 'cancelled', cancellationReason: reason });
    }

    // Return updated order
    let updated;
    if (models.isPostgres) {
      updated = await models.Order.findByPk(id, {
        include: buildIncludeClause('Order')
      });
    } else {
      updated = await models.Order.findById(id)
        .populate('customer', 'id email firstName lastName phone')
        .populate('payments', 'id status amount paymentMethod')
        .populate('shipments', 'id status trackingNumber')
        .populate('returns', 'id status reason');
    }

    return ApiResponse.success(res, formatSingleResponse(updated), 'Order cancelled successfully');
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

    let order;
    if (models.isPostgres) {
      order = await models.Order.findByPk(id, {
        attributes: ['id', 'orderNumber', 'status', 'createdAt', 'updatedAt', 'shippingCost'],
        include: {
          model: models.Address._model,
          as: 'shippingAddress',
          attributes: ['street', 'city', 'state', 'postalCode', 'country']
        }
      });
    } else {
      order = await models.Order.findById(id)
        .select('id orderNumber status createdAt updatedAt shippingCost')
        .populate('shippingAddress', 'street city state postalCode country');
    }

    if (!order) {
      return ApiResponse.notFound(res, 'Order');
    }

    // Verify ownership
    if (order.userId !== req.user.id && req.user.role !== 'admin') {
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
      include: buildIncludeClause('Order')  // ← Full relationships for invoice
    });

    if (!order) {
      return ApiResponse.notFound(res, 'Order');
    }

    // Verify ownership
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.forbidden(res, 'You can only view your own invoice');
    }

    // Format response
    const formattedOrder = formatSingleResponse(order);

    // Generate invoice data with nested objects
    const invoice = {
      invoice_number: `INV-${formattedOrder.order_number}`,
      order_id: formattedOrder.id,
      order_number: formattedOrder.order_number,
      date: formattedOrder.createdAt,
      customer: formattedOrder.customer,  // ← Full customer object, not just ID
      items: formattedOrder.items,  // ← Full product details in items
      subtotal: formattedOrder.subtotal,
      tax: formattedOrder.tax_amount,
      shipping: formattedOrder.shipping_cost,
      total: formattedOrder.total_amount,
      shipping_address: formattedOrder.shipping_address
    };

    return ApiResponse.success(res, invoice, 'Invoice generated successfully');
  } catch (error) {
    console.error('❌ generateInvoice error:', error);
    return ApiResponse.serverError(res, error);
  }
};