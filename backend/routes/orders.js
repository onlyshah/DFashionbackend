const express = require('express');
const router = express.Router();
const { auth, requireCustomer } = require('../middleware/auth');
const orderController = require('../controllers/orderController');

// All routes require authentication
router.use(auth);

// Get user's orders
router.get('/my-orders', requireCustomer, orderController.getUserOrders);

// Get single order
router.get('/:id', orderController.getOrderById);

// Create new order
router.post('/', requireCustomer, orderController.createOrder);

// Generate invoice for existing order
router.post('/:orderId/invoice', requireCustomer, orderController.generateInvoice);

module.exports = router;