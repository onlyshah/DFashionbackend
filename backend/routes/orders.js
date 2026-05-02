const express = require('express');
const router = express.Router();
const { auth, requireCustomer } = require('../middleware/auth');
const orderController = require('../controllers/orderController');

// All routes require authentication
router.use(auth);

// Stats routes (must be before :id routes to avoid matching as id param)
router.get('/stats/total-items-purchased', requireCustomer, orderController.getTotalItemsPurchased);

// Get user's orders
router.get('/my-orders', requireCustomer, orderController.getUserOrders);

// Get single order (must be last)
router.get('/:id', orderController.getOrderById);

// Create new order
router.post('/', requireCustomer, orderController.createOrder);

// Generate invoice for existing order
router.post('/:orderId/invoice', requireCustomer, orderController.generateInvoice);

module.exports = router;