/**
 * ============================================================================
 * ORDER SERVICE - Business Logic Layer
 * ============================================================================
 * Purpose: Handle all order-related business logic with transaction safety
 * - Order creation with inventory locking
 * - Payment processing
 * - Fulfillment tracking
 * - Refund handling
 */

const crypto = require('crypto');

class OrderService {
  constructor(models, sequelize) {
    this.Order = models.Order;
    this.OrderItem = models.OrderItem;
    this.Payment = models.Payment;
    this.Refund = models.Refund;
    this.Product = models.Product;
    this.ShoppingCart = models.ShoppingCart;
    this.User = models.User;
    this.sequelize = sequelize;
  }

  /**
   * Create order (with transaction for atomicity)
   */
  async createOrder(userId, orderData) {
    const transaction = await this.sequelize.transaction();

    try {
      const { items, shippingAddress, billingAddress, notes } = orderData;

      if (!items || items.length === 0) {
        throw {
          code: 'NO_ITEMS',
          message: 'Order must contain at least one item'
        };
      }

      if (!shippingAddress) {
        throw {
          code: 'NO_ADDRESS',
          message: 'Shipping address required'
        };
      }

      // Validate and lock inventory for all items
      let subtotal = 0;
      let taxAmount = 0;
      const processedItems = [];

      for (const item of items) {
        const product = await this.Product.findByPk(item.productId, { transaction });

        if (!product) {
          throw {
            code: 'PRODUCT_NOT_FOUND',
            message: `Product ${item.productId} not found`
          };
        }

        if (product.quantity_available < item.quantity) {
          throw {
            code: 'INSUFFICIENT_INVENTORY',
            message: `Only ${product.quantity_available} of "${product.name}" available`,
            productId: product.id,
            productName: product.name,
            available: product.quantity_available,
            requested: item.quantity
          };
        }

        // Calculate amounts
        const itemSubtotal = product.selling_price * item.quantity;
        const itemTax = (itemSubtotal * (product.tax_rate || 0) / 100);

        processedItems.push({
          product,
          quantity: item.quantity,
          unitPrice: product.selling_price,
          subtotal: itemSubtotal,
          tax: itemTax
        });

        subtotal += itemSubtotal;
        taxAmount += itemTax;

        // Lock inventory (reserve quantity)
        product.quantity_available -= item.quantity;
        product.quantity_sold += item.quantity;
        await product.save({ transaction });
      }

      // Calculate totals
      const discountAmount = orderData.discountAmount || 0;
      const shippingCost = orderData.shippingCost || 0;
      const totalAmount = subtotal + taxAmount + shippingCost - discountAmount;

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      // Create order
      const order = await this.Order.create(
        {
          order_number: orderNumber,
          user_id: userId,
          seller_id: orderData.sellerId || processedItems[0].product.seller_id,
          subtotal,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          shipping_cost: shippingCost,
          total_amount: totalAmount,
          status: 'pending',
          payment_status: 'pending',
          shipping_address: shippingAddress,
          billing_address: billingAddress || shippingAddress,
          customer_notes: notes
        },
        { transaction }
      );

      // Create order items
      for (const item of processedItems) {
        await this.OrderItem.create(
          {
            order_id: order.id,
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            subtotal: item.subtotal,
            tax_per_unit: item.tax / item.quantity,
            fulfillment_status: 'pending'
          },
          { transaction }
        );
      }

      // Clear cart items
      if (this.ShoppingCart) {
        await this.ShoppingCart.destroy(
          { where: { user_id: userId } },
          { transaction }
        );
      }

      await transaction.commit();

      return {
        orderId: order.id,
        orderNumber: order.order_number,
        totalAmount: order.total_amount,
        status: order.status,
        createdAt: order.created_at
      };
    } catch (error) {
      await transaction.rollback();
      console.error('OrderService.createOrder error:', error);
      throw error;
    }
  }

  /**
   * Get order details
   */
  async getOrder(orderId, userId = null) {
    try {
      const order = await this.Order.findByPk(orderId);

      if (!order) {
        throw {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        };
      }

      // Check ownership if userId provided
      if (userId && order.user_id !== userId) {
        throw {
          code: 'UNAUTHORIZED',
          message: 'You do not have access to this order'
        };
      }

      // Get items
      const items = await this.OrderItem.findAll({
        where: { order_id: orderId }
      });

      // Get payment if exists
      let payment = null;
      if (this.Payment) {
        payment = await this.Payment.findOne({
          where: { order_id: orderId }
        });
      }

      return {
        id: order.id,
        orderNumber: order.order_number,
        userId: order.user_id,
        status: order.status,
        paymentStatus: order.payment_status,
        subtotal: order.subtotal,
        taxAmount: order.tax_amount,
        discountAmount: order.discount_amount,
        shippingCost: order.shipping_cost,
        totalAmount: order.total_amount,
        items: items.map(item => ({
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          subtotal: item.subtotal,
          fulfillmentStatus: item.fulfillment_status
        })),
        shippingAddress: order.shipping_address,
        billingAddress: order.billing_address,
        trackingNumber: order.tracking_number,
        estimatedDeliveryDate: order.estimated_delivery_date,
        payment: payment ? {
          status: payment.status,
          method: payment.payment_method,
          amount: payment.amount
        } : null,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      };
    } catch (error) {
      console.error('OrderService.getOrder error:', error);
      throw error;
    }
  }

  /**
   * List user orders
   */
  async listUserOrders(userId, pagination = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      const { count, rows } = await this.Order.findAndCountAll({
        where: { user_id: userId },
        limit,
        offset,
        order: [['created_at', 'DESC']]
      });

      return {
        data: rows.map(order => ({
          id: order.id,
          orderNumber: order.order_number,
          status: order.status,
          totalAmount: order.total_amount,
          createdAt: order.created_at
        })),
        pagination: {
          total: count,
          page,
          limit,
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('OrderService.listUserOrders error:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status, adminNotes = null) {
    try {
      const order = await this.Order.findByPk(orderId);

      if (!order) {
        throw {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        };
      }

      // Validate status transition
      const validTransitions = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['processing', 'cancelled'],
        processing: ['shipped', 'cancelled'],
        shipped: ['delivered'],
        delivered: ['returned'],
        cancelled: [],
        returned: []
      };

      if (!validTransitions[order.status]?.includes(status)) {
        throw {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot transition from ${order.status} to ${status}`
        };
      }

      order.status = status;
      if (adminNotes) {
        order.admin_notes = adminNotes;
      }
      order.updated_at = new Date();

      await order.save();

      return { success: true, message: 'Order status updated' };
    } catch (error) {
      console.error('OrderService.updateOrderStatus error:', error);
      throw error;
    }
  }

  /**
   * Cancel order (with inventory restoration)
   */
  async cancelOrder(orderId, reason) {
    const transaction = await this.sequelize.transaction();

    try {
      const order = await this.Order.findByPk(orderId, { transaction });

      if (!order) {
        throw {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        };
      }

      if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
        throw {
          code: 'CANNOT_CANCEL',
          message: `Cannot cancel order with status: ${order.status}`
        };
      }

      // Get order items and restore inventory
      const items = await this.OrderItem.findAll({
        where: { order_id: orderId },
        transaction
      });

      for (const item of items) {
        const product = await this.Product.findByPk(item.product_id, { transaction });
        if (product) {
          product.quantity_available += item.quantity;
          product.quantity_sold = Math.max(0, product.quantity_sold - item.quantity);
          await product.save({ transaction });
        }
      }

      // Update order
      order.status = 'cancelled';
      order.updated_at = new Date();
      order.admin_notes = `Cancelled: ${reason}`;

      await order.save({ transaction });

      // TODO: Process refund if payment was made

      await transaction.commit();

      return { success: true, message: 'Order cancelled and inventory restored' };
    } catch (error) {
      await transaction.rollback();
      console.error('OrderService.cancelOrder error:', error);
      throw error;
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStats(filters = {}) {
    try {
      const where = {};

      if (filters.startDate || filters.endDate) {
        where.created_at = {};
        if (filters.startDate) where.created_at.$gte = new Date(filters.startDate);
        if (filters.endDate) where.created_at.$lte = new Date(filters.endDate);
      }

      const stats = {
        totalOrders: await this.Order.count({ where }),
        totalRevenue: 0,
        averageOrderValue: 0,
        ordersByStatus: {},
        ordersByPaymentStatus: {}
      };

      // Calculate totals
      const orders = await this.Order.findAll({
        attributes: [
          [this.sequelize.fn('SUM', this.sequelize.col('total_amount')), 'totalRevenue'],
          [this.sequelize.fn('AVG', this.sequelize.col('total_amount')), 'averageOrderValue'],
          'status',
          'payment_status'
        ],
        group: ['status', 'payment_status'],
        where
      });

      orders.forEach(order => {
        const data = order.dataValues;
        if (data.status) {
          stats.ordersByStatus[data.status] = (stats.ordersByStatus[data.status] || 0) + 1;
        }
        if (data.payment_status) {
          stats.ordersByPaymentStatus[data.payment_status] = (stats.ordersByPaymentStatus[data.payment_status] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('OrderService.getOrderStats error:', error);
      throw error;
    }
  }
}

module.exports = OrderService;
