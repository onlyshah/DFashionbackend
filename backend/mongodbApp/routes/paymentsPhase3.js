/**
 * Payment Routes - Phase 3
 * 6 endpoints for payment processing
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentControllerPhase3');
const { verifyToken } = require('../middleware/auth');

// Public endpoints
router.get('/methods', paymentController.getPaymentMethods);

// Protected endpoints (User/Admin)
router.post('/initiate', verifyToken, paymentController.initiatePayment);
router.post('/verify', verifyToken, paymentController.verifyPayment);
router.post('/refund', verifyToken, paymentController.processRefund);
router.post('/save-method', verifyToken, paymentController.savePaymentMethod);
router.get('/history', verifyToken, paymentController.getPaymentHistory);

module.exports = router;
