const express = require('express');
const router = express.Router();
const analyticsOverviewController = require('../controllers/analyticsOverviewController');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', analyticsOverviewController.getOverview);
router.post('/', auth, requireRole(['admin', 'super_admin']), analyticsOverviewController.createOverview);
router.put('/', auth, requireRole(['admin', 'super_admin']), analyticsOverviewController.updateOverview);
router.delete('/', auth, requireRole(['admin', 'super_admin']), analyticsOverviewController.deleteOverview);

module.exports = router;