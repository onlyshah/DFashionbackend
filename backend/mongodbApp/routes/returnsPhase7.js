/**
 * Returns Management Routes - Phase 7
 * Routes: /api/v1/returns
 */

const express = require('express');
const router = express.Router();
const returnsController = require('../controllers/returnsControllerPhase7');
const { verifyToken, verifyRole } = require('../middleware/auth');

/**
 * Protected Routes (User)
 */

router.use(verifyToken);

// POST - Create return request
router.post('/', returnsController.createReturnRequest);

// GET - Get return requests
router.get('/', returnsController.getReturnRequests);

/**
 * Protected Routes (Admin)
 */

// PATCH - Update return status
router.patch('/:returnId', verifyRole(['admin', 'super_admin']), returnsController.updateReturnStatus);

// POST - Process refund
router.post('/:returnId/refund', verifyRole(['admin', 'super_admin']), returnsController.processRefund);

// GET - Get return analytics
router.get('/analytics/summary', verifyRole(['admin', 'super_admin']), returnsController.getReturnAnalytics);

module.exports = router;
