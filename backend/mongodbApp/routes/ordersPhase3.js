/**
 * Order Routes - Phase 3
 * 7 endpoints for order management
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderControllerPhase3');
const { verifyToken, verifyRole } = require('../middleware/auth');

// Protected endpoints (User/Admin)
router.post('/', verifyToken, orderController.createOrder);
router.get('/', verifyToken, orderController.getOrders);
router.get('/:id', verifyToken, orderController.getOrderById);
router.put('/:id/status', verifyToken, verifyRole(['admin']), orderController.updateOrderStatus);
router.delete('/:id', verifyToken, orderController.cancelOrder);
router.get('/:id/track', verifyToken, orderController.trackOrder);
router.get('/:id/invoice', verifyToken, orderController.getInvoice);

module.exports = router;
