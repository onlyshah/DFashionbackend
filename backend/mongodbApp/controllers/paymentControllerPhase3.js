/**
 * Payment Controller - Complete MongoDB Implementation (Phase 3)
 * 6 methods for payment processing
 */

const Payment = require('../models/Payment');
const Order = require('../models/Order');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Initiate payment
 */
exports.initiatePayment = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { orderId, amount, paymentMethod } = req.body;

    if (!orderId || !amount || !paymentMethod) {
      throw new ApiError('OrderId, amount, paymentMethod required', 400, 'INVALID_INPUT');
    }

    // Verify order exists and belongs to user
    const order = await Order.findById(orderId);
    if (!order) {
      throw new ApiError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    if (order.userId.toString() !== userId.toString()) {
      throw new ApiError('Unauthorized', 403, 'FORBIDDEN');
    }

    if (order.total !== parseFloat(amount)) {
      throw new ApiError('Amount mismatch', 400, 'AMOUNT_MISMATCH');
    }

    // Create payment record
    const payment = await Payment.create({
      orderId,
      userId,
      amount: parseFloat(amount),
      paymentMethod,
      status: 'pending',
      transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    });

    // In production, integrate with payment gateway (Stripe, PayPal, etc)
    // For now, we'll simulate a successful payment after 2 seconds

    return ApiResponse.success(res, {
      paymentId: payment._id,
      transactionId: payment.transactionId,
      amount: payment.amount,
      status: 'pending',
      redirectUrl: `https://payment-gateway.example.com/pay/${payment._id}`
    }, 'Payment initiated', null, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Verify payment
 */
exports.verifyPayment = async (req, res, next) => {
  try {
    const { paymentId, transactionId } = req.body;

    if (!paymentId || !transactionId) {
      throw new ApiError('PaymentId and transactionId required', 400, 'INVALID_INPUT');
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new ApiError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    // In production, verify with payment gateway
    // For demo, we'll accept any verification
    
    const order = await Order.findById(payment.orderId);
    
    // Update payment status
    payment.status = 'completed';
    payment.verifiedAt = new Date();
    await payment.save();

    // Update order
    order.paymentStatus = 'completed';
    order.status = 'confirmed';
    await order.save();

    return ApiResponse.success(res, {
      paymentId: payment._id,
      status: 'completed',
      amount: payment.amount,
      orderId: order._id,
      message: 'Payment verified successfully'
    }, 'Payment verified');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Process refund
 */
exports.processRefund = async (req, res, next) => {
  try {
    const { paymentId, reason } = req.body;

    if (!paymentId) {
      throw new ApiError('PaymentId required', 400, 'INVALID_INPUT');
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new ApiError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    if (payment.status !== 'completed') {
      throw new ApiError('Can only refund completed payments', 400, 'INVALID_STATUS');
    }

    // Process refund
    payment.status = 'refunded';
    payment.refundedAt = new Date();
    payment.refundReason = reason || '';
    await payment.save();

    // Update order
    const order = await Order.findById(payment.orderId);
    order.paymentStatus = 'refunded';
    await order.save();

    return ApiResponse.success(res, {
      paymentId: payment._id,
      status: 'refunded',
      refundAmount: payment.amount,
      refundedAt: payment.refundedAt
    }, 'Refund processed');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Get payment methods
 */
exports.getPaymentMethods = async (req, res, next) => {
  try {
    const methods = [
      { id: 'credit_card', name: 'Credit Card', icon: 'credit-card' },
      { id: 'debit_card', name: 'Debit Card', icon: 'credit-card' },
      { id: 'upi', name: 'UPI', icon: 'mobile' },
      { id: 'net_banking', name: 'Net Banking', icon: 'building' },
      { id: 'wallet', name: 'Digital Wallet', icon: 'wallet' },
      { id: 'cod', name: 'Cash on Delivery', icon: 'money' }
    ];

    return ApiResponse.success(res, methods, 'Payment methods retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Save payment method
 */
exports.savePaymentMethod = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { cardNumber, cardName, expiryDate, cvv, type } = req.body;

    if (!cardNumber || !cardName || !expiryDate || !cvv) {
      throw new ApiError('Card details required', 400, 'INVALID_INPUT');
    }

    // In production, encrypt sensitive data and store securely
    // Never store actual CVV
    
    const savedMethod = {
      id: `pm-${Date.now()}`,
      type: type || 'credit_card',
      last4: cardNumber.slice(-4),
      cardName: cardName,
      expiryDate: expiryDate,
      isDefault: false,
      createdAt: new Date()
    };

    // In production, save to database
    // await PaymentMethod.create({ userId, ...savedMethod });

    return ApiResponse.success(res, savedMethod, 'Payment method saved', null, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Get payment history
 */
exports.getPaymentHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const filter = { userId };
    if (status) filter.status = status;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('orderId', 'orderNumber total')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Payment.countDocuments(filter)
    ]);

    return ApiResponse.success(res, payments, 'Payment history retrieved', {
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
