const express = require('express');
const router = express.Router();
const returnsController = require('../controllers/returnsController');
const { auth } = require('../middleware/auth');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuth');

// Customer routes
router.post('/', auth, returnsController.createReturn);
router.get('/my-returns', auth, returnsController.getMyReturns);
router.get('/:id', auth, returnsController.getReturnDetails);

// Admin routes
router.get('/', verifyAdminToken, requirePermission('returns', 'view'), returnsController.getAllReturns);
router.post('/:id/approve', verifyAdminToken, requirePermission('returns', 'manage'), returnsController.approveReturn);
router.post('/:id/reject', verifyAdminToken, requirePermission('returns', 'manage'), returnsController.rejectReturn);
router.post('/:id/ship', verifyAdminToken, requirePermission('returns', 'manage'), returnsController.shipReturn);
router.post('/:id/receive', verifyAdminToken, requirePermission('returns', 'manage'), returnsController.receiveReturn);
router.put('/:id', verifyAdminToken, requirePermission('returns', 'manage'), returnsController.updateReturn);

module.exports = router;