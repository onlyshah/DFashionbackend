/**
 * PaymentRepository - Database-Agnostic Payment Data Access Layer
 * Supports both PostgreSQL (Sequelize) and MongoDB (Mongoose)
 * Provides transparent database switching with graceful fallback
 */

const { Op } = require('sequelize');

class PaymentRepository {
  constructor(models) {
    this.models = models;
    this.isSequelize = models._raw && models._raw.Payment ? true : false;
    this.isMongoDB = models.Payment && models.Payment.findById ? true : false;
  }

  /**
   * Get all payments with filtering and pagination
   * @param {Object} filters - Filter object {status, paymentMethod, period, search}
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Records per page
   * @returns {Promise<Object>} Payments with pagination metadata
   */
  async getAllPayments(filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const where = this._buildWhereClause(filters);

      if (this.isSequelize) {
        // PostgreSQL with Sequelize
        const Payment = this.models._raw.Payment;
        if (!Payment) {
          return {
            success: false,
            data: { payments: [], pagination: { currentPage: page, totalPages: 0, totalRecords: 0 } },
            message: 'Payment model not available'
          };
        }

        const { count, rows } = await Payment.findAndCountAll({
          where,
          include: [
            { model: this.models._raw.Order, as: 'order', attributes: ['id', 'totalAmount', 'status'], required: false },
            { model: this.models._raw.User, as: 'user', attributes: ['id', 'fullName', 'email'], required: false }
          ],
          order: [['createdAt', 'DESC']],
          limit,
          offset: skip,
          raw: true,
          subQuery: false
        });

        return {
          success: true,
          data: {
            payments: rows || [],
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(count / limit),
              totalRecords: count,
              hasNextPage: page < Math.ceil(count / limit),
              hasPrevPage: page > 1
            }
          }
        };
      } else if (this.isMongoDB) {
        // MongoDB with Mongoose
        const Payment = this.models.Payment;
        const mongoFilter = this._buildMongoFilter(filters);

        const payments = await Payment
          .find(mongoFilter)
          .populate('orderId', 'id totalAmount status')
          .populate('userId', 'id fullName email')
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .lean();

        const total = await Payment.countDocuments(mongoFilter);

        return {
          success: true,
          data: {
            payments: payments || [],
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(total / limit),
              totalRecords: total,
              hasNextPage: page < Math.ceil(total / limit),
              hasPrevPage: page > 1
            }
          }
        };
      }

      // Fallback - no database available
      return {
        success: false,
        data: { payments: [], pagination: { currentPage: page, totalPages: 0, totalRecords: 0 } },
        message: 'Database not available'
      };
    } catch (error) {
      console.error('[PaymentRepository] getAllPayments error:', error);
      return {
        success: false,
        data: { payments: [], pagination: { currentPage: page, totalPages: 0, totalRecords: 0 } },
        message: 'Failed to fetch payments',
        error: error.message
      };
    }
  }

  /**
   * Get payment statistics
   * @param {Object} filters - Filter object {period, paymentMethod}
   * @returns {Promise<Object>} Statistics data
   */
  async getPaymentStats(filters = {}) {
    try {
      const where = this._buildWhereClause(filters);

      if (this.isSequelize) {
        // PostgreSQL with Sequelize
        const Payment = this.models._raw.Payment;
        if (!Payment) {
          return {
            success: false,
            data: {
              stats: {
                totalTransactions: 0,
                successfulTransactions: 0,
                failedTransactions: 0,
                totalRevenue: 0,
                averageOrderValue: 0
              }
            }
          };
        }

        // Get all matching payments
        const payments = await Payment.findAll({
          where,
          attributes: ['id', 'status', 'amount', 'paymentMethod'],
          raw: true
        });

        const stats = this._calculateStats(payments);
        return {
          success: true,
          data: { stats }
        };
      } else if (this.isMongoDB) {
        // MongoDB with Mongoose
        const Payment = this.models.Payment;
        const mongoFilter = this._buildMongoFilter(filters);

        const payments = await Payment.find(mongoFilter).lean();
        const stats = this._calculateStats(payments);

        return {
          success: true,
          data: { stats }
        };
      }

      // Fallback
      return {
        success: false,
        data: { stats: {} },
        message: 'Database not available'
      };
    } catch (error) {
      console.error('[PaymentRepository] getPaymentStats error:', error);
      return {
        success: false,
        data: { stats: {} },
        message: 'Failed to calculate statistics',
        error: error.message
      };
    }
  }

  /**
   * Get payments filtered by status
   * @param {string} status - Payment status (pending, completed, failed, refunded)
   * @param {number} page - Page number
   * @param {number} limit - Records per page
   * @returns {Promise<Object>} Payments with given status
   */
  async getPaymentsByStatus(status, page = 1, limit = 20) {
    try {
      // Validate status
      const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
      if (!validStatuses.includes(status)) {
        return {
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        };
      }

      const skip = (page - 1) * limit;

      if (this.isSequelize) {
        // PostgreSQL with Sequelize
        const Payment = this.models._raw.Payment;
        if (!Payment) {
          return {
            success: false,
            data: { payments: [] },
            message: 'Payment model not available'
          };
        }

        const { count, rows } = await Payment.findAndCountAll({
          where: { status },
          order: [['createdAt', 'DESC']],
          limit,
          offset: skip,
          attributes: ['id', 'orderId', 'amount', 'status', 'createdAt', 'customerName', 'customerEmail']
        });

        return {
          success: true,
          data: {
            status,
            payments: rows || [],
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(count / limit),
              totalRecords: count
            }
          }
        };
      } else if (this.isMongoDB) {
        // MongoDB with Mongoose
        const Payment = this.models.Payment;
        const payments = await Payment
          .find({ status })
          .select('id orderId amount status createdAt customerName customerEmail')
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .lean();

        const total = await Payment.countDocuments({ status });

        return {
          success: true,
          data: {
            status,
            payments: payments || [],
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(total / limit),
              totalRecords: total
            }
          }
        };
      }

      // Fallback
      return {
        success: false,
        data: { payments: [] },
        message: 'Database not available'
      };
    } catch (error) {
      console.error('[PaymentRepository] getPaymentsByStatus error:', error);
      return {
        success: false,
        data: { payments: [] },
        message: 'Failed to fetch payments by status',
        error: error.message
      };
    }
  }

  /**
   * Get single payment by ID
   * @param {string} paymentId - Payment ID
   * @returns {Promise<Object>} Payment details
   */
  async getPaymentById(paymentId) {
    try {
      if (this.isSequelize) {
        // PostgreSQL with Sequelize
        const Payment = this.models._raw.Payment;
        if (!Payment) {
          return {
            success: false,
            data: null,
            message: 'Payment model not available'
          };
        }

        const payment = await Payment.findByPk(paymentId, {
          include: [
            { model: this.models._raw.Order, as: 'order', required: false },
            { model: this.models._raw.User, as: 'user', attributes: { exclude: ['password'] }, required: false }
          ]
        });

        if (!payment) {
          return {
            success: false,
            data: null,
            message: 'Payment not found'
          };
        }

        return {
          success: true,
          data: payment.get({ plain: true })
        };
      } else if (this.isMongoDB) {
        // MongoDB with Mongoose
        const Payment = this.models.Payment;
        const payment = await Payment
          .findById(paymentId)
          .populate('orderId')
          .populate('userId', '-password')
          .lean();

        if (!payment) {
          return {
            success: false,
            data: null,
            message: 'Payment not found'
          };
        }

        return {
          success: true,
          data: payment
        };
      }

      // Fallback
      return {
        success: false,
        data: null,
        message: 'Database not available'
      };
    } catch (error) {
      console.error('[PaymentRepository] getPaymentById error:', error);
      return {
        success: false,
        data: null,
        message: 'Failed to fetch payment',
        error: error.message
      };
    }
  }

  /**
   * Create a new payment
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Created payment
   */
  async createPayment(paymentData) {
    try {
      if (this.isSequelize) {
        // PostgreSQL with Sequelize
        const Payment = this.models._raw.Payment;
        if (!Payment) {
          return {
            success: false,
            data: null,
            message: 'Payment model not available'
          };
        }

        const payment = await Payment.create(paymentData);
        return {
          success: true,
          message: 'Payment created successfully',
          data: payment.get({ plain: true })
        };
      } else if (this.isMongoDB) {
        // MongoDB with Mongoose
        const Payment = this.models.Payment;
        const payment = new Payment(paymentData);
        await payment.save();

        return {
          success: true,
          message: 'Payment created successfully',
          data: payment.toObject()
        };
      }

      // Fallback
      return {
        success: false,
        data: null,
        message: 'Database not available'
      };
    } catch (error) {
      console.error('[PaymentRepository] createPayment error:', error);
      return {
        success: false,
        data: null,
        message: 'Failed to create payment',
        error: error.message
      };
    }
  }

  /**
   * Update payment
   * @param {string} paymentId - Payment ID
   * @param {Object} updates - Updates object
   * @returns {Promise<Object>} Updated payment
   */
  async updatePayment(paymentId, updates) {
    try {
      if (this.isSequelize) {
        // PostgreSQL with Sequelize
        const Payment = this.models._raw.Payment;
        if (!Payment) {
          return {
            success: false,
            data: null,
            message: 'Payment model not available'
          };
        }

        const [updated] = await Payment.update(updates, {
          where: { id: paymentId },
          returning: true
        });

        if (updated === 0) {
          return {
            success: false,
            data: null,
            message: 'Payment not found'
          };
        }

        const payment = await Payment.findByPk(paymentId);
        return {
          success: true,
          message: 'Payment updated successfully',
          data: payment.get({ plain: true })
        };
      } else if (this.isMongoDB) {
        // MongoDB with Mongoose
        const Payment = this.models.Payment;
        const payment = await Payment.findByIdAndUpdate(paymentId, updates, { new: true });

        if (!payment) {
          return {
            success: false,
            data: null,
            message: 'Payment not found'
          };
        }

        return {
          success: true,
          message: 'Payment updated successfully',
          data: payment.toObject()
        };
      }

      // Fallback
      return {
        success: false,
        data: null,
        message: 'Database not available'
      };
    } catch (error) {
      console.error('[PaymentRepository] updatePayment error:', error);
      return {
        success: false,
        data: null,
        message: 'Failed to update payment',
        error: error.message
      };
    }
  }

  /**
   * Process refund
   * @param {string} paymentId - Payment ID
   * @param {Object} refundData - Refund details {amount, reason}
   * @returns {Promise<Object>} Refund result
   */
  async processRefund(paymentId, refundData) {
    try {
      // Get original payment
      const paymentResult = await this.getPaymentById(paymentId);
      if (!paymentResult.success) {
        return paymentResult;
      }

      const payment = paymentResult.data;

      // Validate refund amount
      if (refundData.amount > payment.amount) {
        return {
          success: false,
          message: 'Refund amount cannot exceed payment amount'
        };
      }

      // Create refund record
      if (this.isSequelize) {
        const Payment = this.models._raw.Payment;
        const Refund = this.models._raw.Refund;

        if (Refund) {
          const refund = await Refund.create({
            paymentId,
            amount: refundData.amount,
            reason: refundData.reason,
            status: 'processed',
            processedAt: new Date()
          });

          // Update payment status if full refund
          if (refundData.amount === payment.amount) {
            await Payment.update({ status: 'refunded' }, { where: { id: paymentId } });
          }

          return {
            success: true,
            message: 'Refund processed successfully',
            data: {
              refundId: refund.id,
              originalPaymentId: paymentId,
              amount: refundData.amount,
              status: 'processed',
              processedAt: new Date()
            }
          };
        }
      } else if (this.isMongoDB) {
        const Refund = this.models.Refund;

        if (Refund) {
          const refund = new Refund({
            paymentId,
            amount: refundData.amount,
            reason: refundData.reason,
            status: 'processed',
            processedAt: new Date()
          });
          await refund.save();

          // Update payment status
          if (refundData.amount === payment.amount) {
            await this.models.Payment.findByIdAndUpdate(paymentId, { status: 'refunded' });
          }

          return {
            success: true,
            message: 'Refund processed successfully',
            data: {
              refundId: refund._id,
              originalPaymentId: paymentId,
              amount: refundData.amount,
              status: 'processed',
              processedAt: new Date()
            }
          };
        }
      }

      return {
        success: false,
        message: 'Refund model not available'
      };
    } catch (error) {
      console.error('[PaymentRepository] processRefund error:', error);
      return {
        success: false,
        message: 'Failed to process refund',
        error: error.message
      };
    }
  }

  /**
   * Build Sequelize WHERE clause from filters
   * @private
   */
  _buildWhereClause(filters) {
    const where = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters.period && filters.period !== 'all') {
      const days = parseInt(filters.period) || 30;
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
      where.createdAt = { [Op.gte]: dateFrom };
    }

    if (filters.search) {
      where[Op.or] = [
        { customerEmail: { [Op.iLike]: `%${filters.search}%` } },
        { customerName: { [Op.iLike]: `%${filters.search}%` } },
        { transactionId: { [Op.iLike]: `%${filters.search}%` } }
      ];
    }

    return where;
  }

  /**
   * Build MongoDB filter from filters
   * @private
   */
  _buildMongoFilter(filters) {
    const mongoFilter = {};

    if (filters.status) {
      mongoFilter.status = filters.status;
    }

    if (filters.paymentMethod) {
      mongoFilter.paymentMethod = filters.paymentMethod;
    }

    if (filters.period && filters.period !== 'all') {
      const days = parseInt(filters.period) || 30;
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
      mongoFilter.createdAt = { $gte: dateFrom };
    }

    if (filters.search) {
      mongoFilter.$or = [
        { customerEmail: new RegExp(filters.search, 'i') },
        { customerName: new RegExp(filters.search, 'i') },
        { transactionId: new RegExp(filters.search, 'i') }
      ];
    }

    return mongoFilter;
  }

  /**
   * Calculate payment statistics
   * @private
   */
  _calculateStats(payments) {
    if (!payments || payments.length === 0) {
      return {
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        successRate: 0,
        refundedAmount: 0,
        refundRate: 0
      };
    }

    const successful = payments.filter(p => p.status === 'completed').length;
    const failed = payments.filter(p => p.status === 'failed').length;
    const refunded = payments.filter(p => p.status === 'refunded').length;
    const totalRevenue = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const refundedAmount = payments
      .filter(p => p.status === 'refunded')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      totalTransactions: payments.length,
      successfulTransactions: successful,
      failedTransactions: failed,
      totalRevenue,
      averageOrderValue: successful > 0 ? totalRevenue / successful : 0,
      successRate: ((successful / payments.length) * 100).toFixed(2),
      refundedAmount,
      refundRate: ((refunded / payments.length) * 100).toFixed(2)
    };
  }
}

module.exports = PaymentRepository;
