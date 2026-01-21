/**
 * Payment Controller
 * Handles all payment processing and transaction logic
 * Model → Controller → Routes pattern
 */

const dbType = (process.env.DB_TYPE || '').toLowerCase();
const models = dbType === 'postgres' ? require('../models_sql') : require('../models')();
const { Payment, Order, User } = models;

// ==================== PAYMENT OPERATIONS ====================

/**
 * Initiate payment for an order
 */
exports.initiatePayment = async (req, res) => {
  try {
    const { orderId, amount, paymentMethod } = req.body;

    // Validate required fields
    if (!orderId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: orderId, amount, paymentMethod'
      });
    }

    // Verify order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if payment matches order total
    if (parseFloat(amount) !== order.total) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount does not match order total'
      });
    }

    // Create payment record
    const payment = new Payment({
      orderId,
      amount,
      paymentMethod,
      status: 'pending',
      userId: req.user.userId,
      transactionId: `TXN-${Date.now()}`,
      metadata: {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    await payment.save();

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Payment initiated',
      data: {
        payment,
        razorpayOrderId: payment._id || payment.id
      }
    });
  } catch (error) {
    console.error('Initiate payment error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.message
    });
  }
};

/**
 * Verify payment and update order status
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { paymentId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update payment status
    payment.status = 'completed';
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.completedAt = Date.now();

    await payment.save();

    // Update order status to confirmed
    const order = await Order.findByIdAndUpdate(
      payment.orderId,
      { status: 'confirmed', paymentStatus: 'paid' },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: { payment, order }
    });
  } catch (error) {
    console.error('Verify payment error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
};

/**
 * Get user's payment history
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { userId: req.user.userId };
    if (status) filter.status = status;

    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(filter);

    res.json({
      success: true,
      data: payments,
      pagination: {
        currentPage: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: error.message
    });
  }
};

/**
 * Get payment methods
 */
exports.getPaymentMethods = async (req, res) => {
  try {
    const methods = [
      { id: 'credit_card', name: 'Credit Card', isActive: true },
      { id: 'debit_card', name: 'Debit Card', isActive: true },
      { id: 'upi', name: 'UPI', isActive: true },
      { id: 'netbanking', name: 'Net Banking', isActive: true },
      { id: 'wallet', name: 'Digital Wallet', isActive: true }
    ];

    res.json({
      success: true,
      data: methods
    });
  } catch (error) {
    console.error('Get payment methods error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods',
      error: error.message
    });
  }
};

/**
 * Process refund for a payment
 */
exports.processRefund = async (req, res) => {
  try {
    const { paymentId, reason, amount } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Payment already refunded'
      });
    }

    // Update payment status
    payment.status = 'refunded';
    payment.refundAmount = amount || payment.amount;
    payment.refundReason = reason;
    payment.refundedAt = Date.now();

    await payment.save();

    // Update order status
    const order = await Order.findByIdAndUpdate(
      payment.orderId,
      { status: 'returned', paymentStatus: 'refunded' },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: { payment, order }
    });
  } catch (error) {
    console.error('Process refund error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  }
};

/**
 * Get all transactions (admin)
 */
exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const payments = await Payment.find(filter)
      .populate('userId', 'fullName email')
      .populate('orderId', 'orderNumber status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(filter);

    // Calculate metrics
    const totalAmount = await Payment.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      data: payments,
      metrics: {
        totalAmount: totalAmount[0]?.total || 0,
        totalTransactions: total
      },
      pagination: {
        currentPage: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
};
