/**
 * Support Tickets Routes - Phase 7
 * Routes: /api/v1/support
 */

const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportControllerPhase7');
const { verifyToken, verifyRole } = require('../middleware/auth');

/**
 * Protected Routes (User)
 */

router.use(verifyToken);

// POST - Create support ticket
router.post('/tickets', supportController.createTicket);

// GET - Get support tickets
router.get('/tickets', supportController.getTickets);

// PATCH - Update ticket
router.patch('/tickets/:ticketId', supportController.updateTicket);

// PATCH - Close ticket
router.patch('/tickets/:ticketId/close', supportController.closeTicket);

/**
 * Protected Routes (Admin)
 */

// GET - Get ticket analytics
router.get('/analytics/summary', verifyRole(['admin', 'super_admin']), supportController.getTicketAnalytics);

module.exports = router;
