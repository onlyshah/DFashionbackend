/**
 * Order Repository
 * Handles all order-related database operations
 * Database-agnostic: works with MongoDB, PostgreSQL, and MySQL
 * Implements eager loading with JOINs for relational data
 */

const RepositoryFactory = require('./repositoryFactory');

class OrderRepository {
  constructor(orderModel) {
    this.repository = RepositoryFactory.getRepository('Order', orderModel);
    this.orderModel = orderModel;
    this.dbFactory = require('../config/dbFactory');
  }

  /**
   * Get all orders with filters and pagination + RELATIONAL DATA
   * Returns complete order info with customer, payments, shipment data
   */
  async getAllOrders(filters = {}, page = 1, limit = 20) {
    try {
      const isRelational = this.dbFactory.getDatabase().type === 'postgres' || this.dbFactory.getDatabase().type === 'mysql';
      
      if (isRelational) {
        return await this.getAllOrdersRelational(filters, page, limit);
      } else {
        return await this.getAllOrdersMongo(filters, page, limit);
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error fetching orders',
        error: error.message
      };
    }
  }

  /**
   * Get all orders from PostgreSQL/MySQL with JOINs
   */
  async getAllOrdersRelational(filters = {}, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const Order = this.orderModel._sequelize;
      const User = require('../models_sql').User._sequelize;
      const Payment = require('../models_sql').Payment._sequelize;
      const Shipment = require('../models_sql').Shipment._sequelize;
      const Courier = require('../models_sql').Courier._sequelize;

      // Build where clause from filters
      const where = {};
      if (filters.status && filters.status !== 'all') where.status = filters.status;
      if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;

      const orders = await Order.findAll({
        where,
        include: [
          {
            model: User,
            as: 'customer',
            attributes: ['id', 'fullName', 'email', 'username'],
            required: false
          },
          {
            model: Payment,
            as: 'payments',
            attributes: ['id', 'amount', 'status', 'paymentMethod', 'createdAt'],
            required: false
          },
          {
            model: Shipment,
            as: 'shipment',
            attributes: ['id', 'trackingNumber', 'status', 'estimatedDelivery'],
            include: [
              {
                model: Courier,
                as: 'courier',
                attributes: ['id', 'name', 'contactNumber'],
                required: false
              }
            ],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        raw: false
      });

      const total = await Order.count({ where });

      return {
        success: true,
        data: {
          orders: orders.map(o => o.toJSON ? o.toJSON() : o),
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all orders from MongoDB with population
   */
  async getAllOrdersMongo(filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const where = {};
      if (filters.status && filters.status !== 'all') where.status = filters.status;
      if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;

      const orders = await this.orderModel
        .find(where)
        .populate('customer', 'fullName email username')
        .populate('payments')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await this.orderModel.countDocuments(where);

      return {
        success: true,
        data: {
          orders,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get order by ID with COMPLETE relational data (customer, payments, shipment, courier)
   * SQL: SELECT * FROM orders o
   *      LEFT JOIN users u ON o.customer_id = u.id
   *      LEFT JOIN payments p ON o.id = p.order_id
   *      LEFT JOIN shipments s ON o.id = s.order_id
   *      LEFT JOIN couriers c ON s.courier_id = c.id
   *      WHERE o.id = ?
   */
  async getOrderById(orderId) {
    try {
      const isRelational = this.dbFactory.getDatabase().type === 'postgres' || this.dbFactory.getDatabase().type === 'mysql';
      
      if (isRelational) {
        const Order = this.orderModel._sequelize;
        const User = require('../models_sql').User._sequelize;
        const Payment = require('../models_sql').Payment._sequelize;
        const Shipment = require('../models_sql').Shipment._sequelize;
        const Courier = require('../models_sql').Courier._sequelize;
        const Return = require('../models_sql').Return._sequelize;

        const order = await Order.findByPk(orderId, {
          include: [
            {
              model: User,
              as: 'customer',
              attributes: ['id', 'fullName', 'email', 'username', 'phone', 'address']
            },
            {
              model: Payment,
              as: 'payments',
              attributes: ['id', 'amount', 'status', 'paymentMethod', 'transactionId', 'createdAt']
            },
            {
              model: Shipment,
              as: 'shipment',
              attributes: ['id', 'trackingNumber', 'status', 'estimatedDelivery', 'actualDelivery', 'weight'],
              include: [
                {
                  model: Courier,
                  as: 'courier',
                  attributes: ['id', 'name', 'contactNumber', 'email']
                }
              ]
            },
            {
              model: Return,
              as: 'return',
              attributes: ['id', 'reason', 'status', 'refundAmount']
            }
          ]
        });

        if (!order) {
          return { success: false, message: 'Order not found' };
        }

        return {
          success: true,
          data: { order: order.toJSON ? order.toJSON() : order }
        };
      } else {
        // MongoDB with populate
        const order = await this.orderModel
          .findById(orderId)
          .populate('customer', 'fullName email username phone address')
          .populate('payments')
          .populate({
            path: 'shipment',
            populate: {
              path: 'courier',
              select: 'name contactNumber email'
            }
          })
          .populate('return')
          .lean();

        if (!order) {
          return { success: false, message: 'Order not found' };
        }

        return {
          success: true,
          data: { order }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error fetching order',
        error: error.message
      };
    }
  }

  /**
   * Get recent orders (for dashboard) with relational data
   */
  async getRecentOrders(limit = 10) {
    try {
      const isRelational = this.dbFactory.getDatabase().type === 'postgres' || this.dbFactory.getDatabase().type === 'mysql';

      if (isRelational) {
        // Get the raw Sequelize model - handle both wrapped and direct models
        const Order = this.orderModel._sequelize || this.orderModel;
        
        // Safely attempt to get related models with fallback
        let User, Payment;
        try {
          const models = require('../models_sql');
          User = models._raw?.User || models.User;
          Payment = models._raw?.Payment || models.Payment;
        } catch (e) {
          console.warn('[OrderRepository.getRecentOrders] Could not load relational models:', e.message);
          User = null;
          Payment = null;
        }

        // Build includes only for available models
        const includes = [];
        if (User) {
          includes.push({
            model: User,
            as: 'customer',
            attributes: ['id', 'fullName', 'email']
          });
        }
        if (Payment) {
          includes.push({
            model: Payment,
            as: 'payments',
            attributes: ['id', 'amount', 'status'],
            required: false
          });
        }

        const orders = await Order.findAll({
          include: includes.length > 0 ? includes : undefined,
          order: [['createdAt', 'DESC']],
          limit,
          raw: false
        });

        return {
          success: true,
          data: {
            orders: orders.map(o => o.toJSON ? o.toJSON() : o),
            total: orders.length
          }
        };
      } else {
        // MongoDB fallback
        const orders = await this.orderModel
          .find()
          .populate('customer', 'fullName email')
          .populate('payments')
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean();

        return {
          success: true,
          data: {
            orders,
            total: orders.length
          }
        };
      }
    } catch (error) {
      console.error('[OrderRepository.getRecentOrders] Error:', error.message);
      return {
        success: false,
        message: 'Error fetching recent orders',
        error: error.message
      };
    }
  }

  /**
   * Get orders by status
   */
  async getOrdersByStatus(status, page = 1, limit = 20) {
    try {
      const filter = { status };
      
      const result = await this.repository.findAll({
        filter,
        page,
        limit,
        sort: { createdAt: 'DESC' }
      });

      return {
        success: true,
        data: {
          orders: result.data,
          pagination: result.pagination
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error fetching orders by status',
        error: error.message
      };
    }
  }

  /**
   * Create new order
   */
  async createOrder(orderData) {
    try {
      const order = await this.repository.create(orderData);
      return {
        success: true,
        data: { order }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error creating order',
        error: error.message
      };
    }
  }

  /**
   * Update order
   */
  async updateOrder(orderId, updateData) {
    try {
      const order = await this.repository.update(orderId, updateData);
      return {
        success: true,
        data: { order },
        message: 'Order updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error updating order',
        error: error.message
      };
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status) {
    try {
      const order = await this.repository.update(orderId, { status });
      return {
        success: true,
        data: { order },
        message: `Order status updated to ${status}`
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error updating order status',
        error: error.message
      };
    }
  }

  /**
   * Delete order
   */
  async deleteOrder(orderId) {
    try {
      const success = await this.repository.delete(orderId);
      return {
        success: success,
        message: success ? 'Order deleted successfully' : 'Order not found'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error deleting order',
        error: error.message
      };
    }
  }

  /**
   * Get order analytics/statistics
   * Works with any database
   */
  async getOrderAnalytics() {
    try {
      const isRelational = RepositoryFactory.isRelational();
      
      if (isRelational) {
        // For PostgreSQL/MySQL - use aggregation queries
        return await this.getRelationalAnalytics();
      } else {
        // For MongoDB - use aggregation pipeline
        return await this.getMongoAnalytics();
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error fetching analytics',
        error: error.message
      };
    }
  }

  /**
   * Analytics for PostgreSQL/MySQL
   */
  async getRelationalAnalytics() {
    try {
      const totalOrders = await this.repository.count({});
      
      // Get orders by status
      const pending = await this.repository.count({ status: 'pending' });
      const confirmed = await this.repository.count({ status: 'confirmed' });
      const delivered = await this.repository.count({ status: 'delivered' });
      const cancelled = await this.repository.count({ status: 'cancelled' });

      // Total revenue (sum of all order amounts)
      const revenueQuery = 'SELECT SUM(totalAmount) as total FROM orders';
      const revenueResult = await this.repository.executeQuery(revenueQuery);
      const totalRevenue = revenueResult[0]?.total || 0;

      return {
        success: true,
        data: {
          totalOrders,
          totalRevenue,
          byStatus: { pending, confirmed, delivered, cancelled }
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Analytics for MongoDB
   */
  async getMongoAnalytics() {
    try {
      const pipeline = [
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' }
          }
        }
      ];

      const results = await this.repository.executeQuery(pipeline);
      const analytics = results[0] || { totalOrders: 0, totalRevenue: 0 };

      // Get counts by status
      const statusPipeline = [
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ];

      const statusResults = await this.repository.executeQuery(statusPipeline);
      const byStatus = {};
      statusResults.forEach(item => {
        byStatus[item._id] = item.count;
      });

      return {
        success: true,
        data: {
          totalOrders: analytics.totalOrders,
          totalRevenue: analytics.totalRevenue,
          byStatus
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Build filter object from request filters
   * Normalizes filter format across databases
   */
  buildOrderFilter(filters = {}) {
    const filter = {};

    if (filters.status && filters.status !== 'all') {
      filter.status = filters.status;
    }

    if (filters.paymentStatus) {
      filter.paymentStatus = filters.paymentStatus;
    }

    if (filters.customerId) {
      const idField = RepositoryFactory.isRelational() ? 'userId' : 'customer';
      filter[idField] = filters.customerId;
    }

    if (filters.dateFrom || filters.dateTo) {
      filter.createdAt = {};
      if (filters.dateFrom) {
        filter.createdAt['$gte'] = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        filter.createdAt['$lte'] = new Date(filters.dateTo);
      }
    }

    return filter;
  }
}

module.exports = OrderRepository;
