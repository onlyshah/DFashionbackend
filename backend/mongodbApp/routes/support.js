const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, supportController.getTickets);
router.post('/', auth, supportController.createTicket);
router.get('/:ticketId', auth, supportController.getTicketById);
router.put('/:ticketId', auth, supportController.updateTicket);
router.post('/:ticketId/reply', auth, supportController.addReply);
router.post('/:ticketId/close', auth, supportController.closeTicket);

module.exports = router;

module.exports = router;