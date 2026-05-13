const express = require('express');
const router = express.Router();
const { auth, requireCustomer, allowResourceOwnerOrRoles } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

// All routes require authentication
router.use(auth);

// @route   POST /api/payments/initiate
// @desc    Initiate payment for an order
// @access  Private
router.post('/initiate', requireCustomer, paymentController.initiatePayment);

// @route   GET /api/payments/:paymentId
// @desc    Get payment details
// @access  Private
router.get('/:paymentId', paymentController.getPaymentDetails);

// @route   GET /api/payments
// @desc    Get user's payment history
// @access  Private
router.get('/', paymentController.getPaymentHistory);

// @route   POST /api/payments/:paymentId/refund
// @desc    Request payment refund
// @access  Private
router.post('/:paymentId/refund', paymentController.processRefund);

// @route   POST /api/payments/verify
// @desc    Verify payment after successful payment
// @access  Private
router.post('/verify', requireCustomer, paymentController.verifyPayment);

// @route   POST /api/payments/webhook
// @desc    Handle Razorpay webhooks
// @access  Public (but verified)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

module.exports = router;