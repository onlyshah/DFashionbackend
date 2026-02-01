const express = require('express');
const router = express.Router();
const productSharesController = require('../controllers/productSharesController');
const { auth, optionalAuth } = require('../middleware/auth');

router.get('/:productId', optionalAuth, productSharesController.getProductShares);
router.post('/:productId/share', auth, productSharesController.createShare);
router.get('/:productId/analytics', productSharesController.getShareAnalytics);
router.delete('/:shareId', auth, productSharesController.deleteShare);

module.exports = router;