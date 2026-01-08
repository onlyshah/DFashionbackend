const express = require('express');
const router = express.Router();
const { auth, requireCustomer, allowResourceOwnerOrRoles } = require('../middleware/auth');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const crypto = require('crypto');
const razorpayService = require('../services/razorpayService');

// All routes require authentication
router.use(auth);

// @route   POST /api/payments/initiate
// @desc    Initiate payment for an order
// @access  Private
router.post('/initiate', requireCustomer, async (req, res) => {
  try {
    const { orderId, paymentMethod, returnUrl } = req.body;

    if (!orderId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and payment method are required'
      });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order
    if (order.customer.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if order is already paid
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid'
      });
    }

    // Create payment record
    const payment = new Payment({
      order: orderId,
      customer: req.user.userId,
      amount: order.totalAmount,
      paymentMethod,
      gatewayTransactionId: Payment.generatePaymentReference(),
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    // Handle different payment methods
    let paymentResponse = {};

    switch (paymentMethod) {
      case 'cod':
        payment.status = 'completed';
        order.paymentStatus = 'paid';
        order.status = 'confirmed';
        await order.save();
        paymentResponse = {
          paymentId: payment._id,
          status: 'completed',
          message: 'Cash on Delivery order confirmed'
        };
        break;

      case 'card':
      case 'upi':
      case 'netbanking':
      case 'wallet':
        // Create Razorpay order
        const razorpayOrderData = {
          amount: order.totalAmount,
          currency: 'INR',
          receipt: `receipt_${order.orderNumber}`,
          notes: {
            orderId: order._id.toString(),
            customerId: req.user.userId,
            orderNumber: order.orderNumber
          }
        };

        const razorpayOrderResult = await razorpayService.createOrder(razorpayOrderData);

        if (!razorpayOrderResult.success) {
          return res.status(500).json({
            success: false,
            message: 'Failed to create payment order'
          });
        }

        payment.paymentGateway = 'razorpay';
        payment.gatewayOrderId = razorpayOrderResult.data.id;
        payment.status = 'pending';

        paymentResponse = {
          paymentId: payment._id,
          razorpayOrderId: razorpayOrderResult.data.id,
          razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_your_key_id',
          amount: razorpayOrderResult.data.amount,
          currency: razorpayOrderResult.data.currency,
          status: 'pending',
          message: 'Payment order created successfully',
          orderId: order._id,
          orderNumber: order.orderNumber
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid payment method'
        });
    }

    await payment.save();

    res.json({
      success: true,
      data: paymentResponse
    });

  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment'
    });
  }
});

// @route   GET /api/payments/:paymentId
// @desc    Get payment details
// @access  Private
router.get('/:paymentId', auth, allowResourceOwnerOrRoles('Payment', 'paymentId', 'customer', ['admin', 'sales_manager', 'support_manager']), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId)
      .populate('order', 'orderNumber totalAmount status')
      .populate('customer', 'fullName email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Access validated by middleware

    res.json({
      success: true,
      data: { payment }
    });

  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment details'
    });
  }
});

// @route   GET /api/payments
// @desc    Get user's payment history
// @access  Private
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      paymentMethod,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = { customer: req.user.userId };
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const payments = await Payment.find(filter)
      .populate('order', 'orderNumber totalAmount status items')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const totalPayments = await Payment.countDocuments(filter);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPayments / parseInt(limit)),
          totalPayments
        }
      }
    });

  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
});

// @route   POST /api/payments/:paymentId/refund
// @desc    Request payment refund
// @access  Private
router.post('/:paymentId/refund', async (req, res) => {
  try {
    const { reason, amount } = req.body;
    const payment = await Payment.findById(req.params.paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if user owns the payment
    if (payment.customer.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if payment can be refunded
    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed payments can be refunded'
      });
    }

    // Check if already refunded
    if (payment.refund && payment.refund.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment is already refunded'
      });
    }

    const refundAmount = amount || payment.amount;

    payment.refund = {
      amount: refundAmount,
      reason,
      status: 'pending'
    };

    await payment.save();

    res.json({
      success: true,
      message: 'Refund request submitted successfully'
    });

  } catch (error) {
    console.error('Refund request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund request'
    });
  }
});

// @route   POST /api/payments/verify
// @desc    Verify payment after successful payment
// @access  Private
router.post('/verify', requireCustomer, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentId
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification data'
      });
    }

    // Find the payment record
    const payment = await Payment.findById(paymentId).populate('order');
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Check if user owns the payment
    if (payment.customer.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Verify payment signature
    const isValidSignature = razorpayService.verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    if (!isValidSignature) {
      payment.status = 'failed';
      payment.failureReason = 'Invalid payment signature';
      await payment.save();

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Fetch payment details from Razorpay
    const razorpayPaymentResult = await razorpayService.fetchPayment(razorpay_payment_id);

    if (!razorpayPaymentResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch payment details'
      });
    }

    const razorpayPayment = razorpayPaymentResult.data;

    // Update payment record
    payment.status = razorpayPayment.status === 'captured' ? 'completed' : 'processing';
    payment.gatewayPaymentId = razorpay_payment_id;
    payment.paymentDetails = {
      cardLast4: razorpayPayment.card?.last4,
      cardBrand: razorpayPayment.card?.network,
      upiId: razorpayPayment.vpa,
      bankName: razorpayPayment.bank,
      walletProvider: razorpayPayment.wallet
    };

    // Update order status
    const order = payment.order;
    if (payment.status === 'completed') {
      order.paymentStatus = 'paid';
      order.status = 'confirmed';
      await order.save();
    }

    await payment.save();

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        payment: {
          id: payment._id,
          status: payment.status,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          gatewayPaymentId: payment.gatewayPaymentId
        },
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus
        }
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment'
    });
  }
});

// @route   POST /api/payments/webhook
// @desc    Handle Razorpay webhooks
// @access  Public (but verified)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body;

    // Validate webhook signature
    const isValidSignature = razorpayService.validateWebhookSignature(body, signature);

    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    const event = JSON.parse(body);
    const { event: eventType, payload } = event;

    switch (eventType) {
      case 'payment.captured':
        await handlePaymentCaptured(payload.payment.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(payload.payment.entity);
        break;
      case 'refund.processed':
        await handleRefundProcessed(payload.refund.entity);
        break;
      default:
        console.log('Unhandled webhook event:', eventType);
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
});

// Helper functions for webhook handling
async function handlePaymentCaptured(paymentData) {
  try {
    const payment = await Payment.findOne({
      gatewayPaymentId: paymentData.id
    }).populate('order');

    if (payment) {
      payment.status = 'completed';
      const order = payment.order;
      order.paymentStatus = 'paid';
      order.status = 'confirmed';

      await payment.save();
      await order.save();

      console.log('Payment captured webhook processed:', paymentData.id);
    }
  } catch (error) {
    console.error('Error handling payment captured webhook:', error);
  }
}

async function handlePaymentFailed(paymentData) {
  try {
    const payment = await Payment.findOne({
      gatewayPaymentId: paymentData.id
    });

    if (payment) {
      payment.status = 'failed';
      payment.failureReason = paymentData.error_description || 'Payment failed';
      await payment.save();

      console.log('Payment failed webhook processed:', paymentData.id);
    }
  } catch (error) {
    console.error('Error handling payment failed webhook:', error);
  }
}

async function handleRefundProcessed(refundData) {
  try {
    const payment = await Payment.findOne({
      gatewayPaymentId: refundData.payment_id
    });

    if (payment && payment.refund) {
      payment.refund.status = 'completed';
      payment.refund.gatewayRefundId = refundData.id;
      payment.refund.processedAt = new Date();
      await payment.save();

      console.log('Refund processed webhook processed:', refundData.id);
    }
  } catch (error) {
    console.error('Error handling refund processed webhook:', error);
  }
}

module.exports = router;
