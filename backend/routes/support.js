const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');

// Check if Ticket model exists, if not create a simple in-memory store for now
let Ticket;
try {
  Ticket = require('../models/Ticket');
} catch (err) {
  // Ticket model doesn't exist yet - will create it
  console.warn('⚠️ Ticket model not found. Using in-memory storage for now.');
  let ticketStore = [];
  let ticketIdCounter = 1;
  
  Ticket = {
    find: async (query) => ticketStore.filter(t => {
      for (let key in query) {
        if (t[key] !== query[key]) return false;
      }
      return true;
    }),
    findById: async (id) => ticketStore.find(t => t._id === id),
    findByIdAndUpdate: async (id, data, options) => {
      const ticket = ticketStore.find(t => t._id === id);
      if (!ticket) return null;
      Object.assign(ticket, data);
      return ticket;
    },
    findByIdAndDelete: async (id) => {
      const index = ticketStore.findIndex(t => t._id === id);
      if (index === -1) return null;
      return ticketStore.splice(index, 1)[0];
    },
    countDocuments: async (query) => (await Ticket.find(query)).length,
    create: async (data) => {
      const ticket = { _id: `ticket-${ticketIdCounter++}`, ...data, createdAt: new Date() };
      ticketStore.push(ticket);
      return ticket;
    }
  };
}

// GET /api/support/tickets - Get all tickets
router.get('/tickets', auth, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '', priority = '', userId = '' } = req.query;
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (userId) query.userId = userId;

    const tickets = await Ticket.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Ticket.countDocuments(query);

    res.json({
      success: true,
      data: tickets,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/support/tickets/:ticketId - Get single ticket
router.get('/tickets/:ticketId', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/support/tickets - Create new support ticket
router.post('/tickets', auth, async (req, res) => {
  try {
    const { subject, description, priority = 'medium', attachments = [] } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ success: false, message: 'Subject and description are required' });
    }

    const newTicket = {
      subject,
      description,
      priority,
      attachments,
      userId: req.user.id,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      replies: []
    };

    const ticket = await Ticket.create(newTicket);

    res.status(201).json({
      success: true,
      data: ticket,
      message: 'Support ticket created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/support/tickets/:ticketId - Update ticket status
router.put('/tickets/:ticketId', [auth, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { status, priority, notes } = req.body;
    const updateData = { updatedAt: new Date() };

    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (notes) updateData.adminNotes = notes;

    const ticket = await Ticket.findByIdAndUpdate(req.params.ticketId, updateData, { new: true });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.json({
      success: true,
      data: ticket,
      message: 'Ticket updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/support/tickets/:ticketId/reply - Add reply to ticket
router.post('/tickets/:ticketId/reply', auth, async (req, res) => {
  try {
    const { message, attachments = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const ticket = await Ticket.findById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const reply = {
      userId: req.user.id,
      message,
      attachments,
      createdAt: new Date()
    };

    ticket.replies = ticket.replies || [];
    ticket.replies.push(reply);
    ticket.updatedAt = new Date();

    await Ticket.findByIdAndUpdate(req.params.ticketId, ticket, { new: true });

    res.json({
      success: true,
      data: reply,
      message: 'Reply added successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/support/tickets/:ticketId - Close/Delete ticket
router.delete('/tickets/:ticketId', [auth, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.json({
      success: true,
      message: 'Ticket deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/support/stats - Get support statistics
router.get('/stats', auth, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const totalTickets = await Ticket.countDocuments({});
    const openTickets = await Ticket.countDocuments({ status: 'open' });
    const closedTickets = await Ticket.countDocuments({ status: 'closed' });
    const highPriorityTickets = await Ticket.countDocuments({ priority: 'high', status: 'open' });

    res.json({
      success: true,
      data: {
        totalTickets,
        openTickets,
        closedTickets,
        highPriorityTickets,
        resolutionRate: totalTickets > 0 ? ((closedTickets / totalTickets) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
