const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const { auth, requireCustomer } = require('../middleware/auth');

router.use(auth, requireCustomer);

router.get('/cart-summary', checkoutController.getCartSummary);
router.post('/validate', checkoutController.validateCart);
router.post('/place-order', checkoutController.getCheckoutDetails);

module.exports = router;