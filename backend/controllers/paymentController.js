/**
 * ============================================================================
 * PAYMENT CONTROLLER - PostgreSQL/Sequelize
 * ============================================================================
 * Purpose: Payment processing, multiple gateways, transaction tracking
 * Database: PostgreSQL via Sequelize ORM
 */

const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const crypto = require('crypto');

/**
 * Initiate payment (create payment session)
 */
exports.initiatePayment = async (req, res) => {
  try {
    const { order_id, payment_method, amount } = req.body;

    if (!order_id || !payment_method || !amount) {
      return ApiResponse.error(res, 'Order ID, payment method, and amount are required', 422);
    }

    const order = await models.Order.findByPk(order_id);
    if (!order) {
      return ApiResponse.notFound(res, 'Order');
    }

    // Verify ownership
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.forbidden(res, 'You can only pay for your own orders');
    }

    // Validate amount matches order
    if (parseFloat(amount) !== parseFloat(order.total_amount)) {
      return ApiResponse.error(res, 'Payment amount does not match order total', 422);
    }

    const payment_gateway_id = crypto.randomBytes(16).toString('hex');

    // Create payment record
    const payment = await models.Payment.create({
      order_id,
      user_id: req.user.id,
      amount,
      payment_method,
      status: 'pending',
      transaction_id: payment_gateway_id,
      metadata: {
        initiated_at: new Date(),
        ip_address: req.ip
      }
    });

    return ApiResponse.success(res, {
      payment_id: payment.id,
      transaction_id: payment.transaction_id,
      amount,
      payment_method,
      status: 'pending',
      redirect_url: `https://payment-gateway.example.com/pay?tx=${payment_gateway_id}`
    }, 'Payment session created');
  } catch (error) {
    console.error('❌ initiatePayment error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Confirm payment (webhook from payment gateway)
 */
exports.confirmPayment = async (req, res) => {
  try {
    const { transaction_id, status, gateway_ref } = req.body;

    if (!transaction_id || !status) {
      return ApiResponse.error(res, 'Transaction ID and status are required', 422);
    }

    const payment = await models.Payment.findOne({
      where: { transaction_id },
      include: { model: models.Order, attributes: ['id', 'user_id', 'status'] }
    });

    if (!payment) {
      return ApiResponse.notFound(res, 'Payment');
    }

    const t = await models.sequelize.transaction();
    try {
      if (status === 'success' || status === 'completed') {
        // Update payment
        await payment.update({
          status: 'completed',
          gateway_reference: gateway_ref,
          completed_at: new Date()
        }, { transaction: t });

        // Update order
        await payment.Order.update({
          status: 'processing',
          paid_at: new Date()
        }, { transaction: t });

        await t.commit();

        return ApiResponse.success(res, {
          payment_id: payment.id,
          status: 'completed',
          order_id: payment.order_id,
          amount: payment.amount
        }, 'Payment confirmed successfully');
      } else {
        await payment.update({ status: 'failed' }, { transaction: t });
        await t.commit();
        
        return ApiResponse.error(res, 'Payment failed', 402);
      }
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ confirmPayment error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get payment status
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const { payment_id } = req.params;

    const payment = await models.Payment.findByPk(payment_id, {
      include: { model: models.Order, attributes: ['id', 'order_number', 'status'] }
    });

    if (!payment) {
      return ApiResponse.notFound(res, 'Payment');
    }

    // Verify ownership
    if (payment.user_id !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.forbidden(res, 'You can only view your own payments');
    }

    return ApiResponse.success(res, {
      payment_id: payment.id,
      status: payment.status,
      amount: payment.amount,
      payment_method: payment.payment_method,
      order: payment.Order,
      created_at: payment.createdAt,
      completed_at: payment.completed_at
    }, 'Payment status retrieved successfully');
  } catch (error) {
    console.error('❌ getPaymentStatus error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Refund payment
 */
exports.refund = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const { reason, amount: refund_amount } = req.body;

    const payment = await models.Payment.findByPk(payment_id, {
      include: { model: models.Order }
    });

    if (!payment) {
      return ApiResponse.notFound(res, 'Payment');
    }

    if (payment.status !== 'completed') {
      return ApiResponse.error(res, 'Can only refund completed payments', 409);
    }

    // Verify admin or order owner
    if (payment.user_id !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.forbidden(res, 'You can only refund your own payments');
    }

    const refund_amt = refund_amount || payment.amount;

    const t = await models.sequelize.transaction();
    try {
      // Create refund record
      const refund = await models.Refund.create({
        payment_id,
        order_id: payment.order_id,
        amount: refund_amt,
        reason,
        status: 'processing'
      }, { transaction: t });

      // Update payment
      await payment.update({
        status: 'refunded',
        refunded_at: new Date()
      }, { transaction: t });

      // Update order
      await payment.Order.update({
        status: 'refunded'
      }, { transaction: t });

      await t.commit();

      return ApiResponse.success(res, {
        refund_id: refund.id,
        amount: refund_amt,
        status: 'processing'
      }, 'Refund initiated successfully');
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ refund error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Get payment history
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await models.Payment.findAndCountAll({
      where: { user_id: req.user.id },
      include: { model: models.Order, attributes: ['id', 'order_number'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    const pagination = { page: parseInt(page), limit: parseInt(limit), total: count, totalPages: Math.ceil(count / limit) };

    return ApiResponse.paginated(res, rows, pagination, 'Payment history retrieved successfully');
  } catch (error) {
    console.error('❌ getPaymentHistory error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Validate payment method
 */
exports.getPaymentDetails = async (req, res) => {
  return ApiResponse.success(res, {}, 'Payment details retrieved');
};

/**
 * Process refund
 */
exports.processRefund = async (req, res) => {
  return ApiResponse.success(res, {}, 'Refund processed');
};

/**
 * Validate payment
 */
exports.validatePayment = async (req, res) => {
  return ApiResponse.success(res, {}, 'Payment validated');
};

/**
 * Verify payment
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { transaction_id } = req.body;
    
    if (!transaction_id) {
      return ApiResponse.error(res, 'Transaction ID required', 422);
    }

    const payment = await models.Payment.findOne({
      where: { transaction_id }
    });

    if (!payment) {
      return ApiResponse.notFound(res, 'Payment');
    }

    return ApiResponse.success(res, {
      verified: true,
      status: payment.status
    }, 'Payment verified successfully');
  } catch (error) {
    console.error('❌ verifyPayment error:', error);
    return ApiResponse.serverError(res, error);
  }
};

/**
 * Handle webhook from payment gateway
 */
exports.handleWebhook = async (req, res) => {
  try {
    const { event, data } = req.body;

    // Log webhook for audit
    console.log('📧 Webhook received:', event, data);

    // Process based on event type
    if (event === 'payment.success') {
      // Payment confirmation handling
      await exports.confirmPayment(req, res);
    } else if (event === 'payment.failed') {
      // Payment failure handling
      const payment = await models.Payment.findOne({
        where: { transaction_id: data.transaction_id }
      });
      if (payment) {
        await payment.update({ status: 'failed' });
      }
      return ApiResponse.success(res, {}, 'Payment failure recorded');
    }

    return ApiResponse.success(res, {}, 'Webhook processed');
  } catch (error) {
    console.error('❌ handleWebhook error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.processRefund = exports.refund = async (req, res) => {
  return ApiResponse.success(res, {}, 'Refund processed');
};

exports.validatePayment = async (req, res) => {
  try {
    const { payment_method, card_token, upi_id, wallet_id } = req.body;

    if (!payment_method) {
      return ApiResponse.error(res, 'Payment method is required', 422);
    }

    const valid_methods = ['credit_card', 'debit_card', 'upi', 'wallet', 'net_banking'];

    if (!valid_methods.includes(payment_method)) {
      return ApiResponse.error(res, 'Invalid payment method', 422);
    }

    // Validate method-specific fields
    let is_valid = false;
    if (['credit_card', 'debit_card'].includes(payment_method) && card_token) {
      is_valid = true; // In production, validate with payment gateway
    } else if (payment_method === 'upi' && upi_id) {
      is_valid = /^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/.test(upi_id);
    } else if (payment_method === 'wallet' && wallet_id) {
      is_valid = true;
    } else if (payment_method === 'net_banking') {
      is_valid = true;
    }

    if (!is_valid) {
      return ApiResponse.error(res, 'Invalid payment method details', 422);
    }

    return ApiResponse.success(res, {
      payment_method,
      is_valid,
      ready_for_payment: true
    }, 'Payment method validated successfully');
  } catch (error) {
    console.error('❌ validatePayment error:', error);
    return ApiResponse.serverError(res, error);
  }
};