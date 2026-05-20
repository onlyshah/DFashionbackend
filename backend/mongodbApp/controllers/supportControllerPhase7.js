/**
 * Support Tickets Controller - Complete MongoDB Implementation (Phase 7)
 * 5 methods for customer support management
 */

const SupportTicket = require('../models/SupportTicket');
const TicketReply = require('../models/TicketReply');
const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Create support ticket
 */
exports.createTicket = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { subject, category, description, priority = 'medium', attachments } = req.body;

    if (!subject || !category || !description) {
      throw new ApiError('Subject, category, and description are required', 400, 'VALIDATION_ERROR');
    }

    const validCategories = ['product_issue', 'delivery', 'payment', 'account', 'other'];
    if (!validCategories.includes(category)) {
      throw new ApiError('Invalid category', 400, 'INVALID_CATEGORY');
    }

    const ticket = await SupportTicket.create({
      userId: req.user._id,
      subject,
      category,
      description,
      priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
      status: 'open',
      attachments: attachments || [],
      createdAt: new Date()
    });

    return ApiResponse.created(res, ticket, 'Support ticket created');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get support tickets
 */
exports.getTickets = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, category } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    let filter = {};

    // User sees their tickets, admin sees all
    if (req.user && req.user.role !== 'admin') {
      filter.userId = req.user._id;
    }

    if (status) filter.status = status;
    if (category) filter.category = category;

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .populate('userId', 'name email')
        .populate('assignedTo', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SupportTicket.countDocuments(filter)
    ]);

    return ApiResponse.paginated(res, tickets, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Support tickets retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Update ticket
 */
exports.updateTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { status, priority, reply, assignedTo } = req.body;

    if (!ticketId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid ticket ID', 400, 'INVALID_ID');
    }

    const ticket = await SupportTicket.findById(ticketId);

    if (!ticket) {
      throw new ApiError('Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    // Check authorization
    if (req.user && req.user.role !== 'admin' && ticket.userId.toString() !== req.user._id.toString()) {
      throw new ApiError('Not authorized to update this ticket', 403, 'FORBIDDEN');
    }

    const updates = {};
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (assignedTo) updates.assignedTo = assignedTo;

    Object.assign(ticket, updates);

    // Add reply if provided
    if (reply && req.user) {
      const ticketReply = await TicketReply.create({
        ticketId,
        userId: req.user._id,
        message: reply,
        createdAt: new Date()
      });

      if (!ticket.replies) ticket.replies = [];
      ticket.replies.push(ticketReply._id);
    }

    await ticket.save();

    const updated = await SupportTicket.findById(ticketId)
      .populate('replies', '-__v');

    return ApiResponse.success(res, updated, 'Ticket updated');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Close support ticket
 */
exports.closeTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { resolution } = req.body;

    if (!ticketId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid ticket ID', 400, 'INVALID_ID');
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      ticketId,
      {
        $set: {
          status: 'closed',
          resolution: resolution || '',
          closedAt: new Date()
        }
      },
      { new: true }
    );

    if (!ticket) {
      throw new ApiError('Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    return ApiResponse.success(res, ticket, 'Support ticket closed');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Get ticket analytics
 */
exports.getTicketAnalytics = async (req, res, next) => {
  try {
    const [totalTickets, ticketsByStatus, ticketsByCategory, avgResolutionTime] = await Promise.all([
      SupportTicket.countDocuments(),
      SupportTicket.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      SupportTicket.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      SupportTicket.aggregate([
        { $match: { status: 'closed', closedAt: { $exists: true } } },
        {
          $group: {
            _id: null,
            avgTime: {
              $avg: {
                $subtract: ['$closedAt', '$createdAt']
              }
            }
          }
        }
      ])
    ]);

    const statusBreakdown = {};
    ticketsByStatus.forEach(item => {
      statusBreakdown[item._id] = item.count;
    });

    const categoryBreakdown = {};
    ticketsByCategory.forEach(item => {
      categoryBreakdown[item._id] = item.count;
    });

    return ApiResponse.success(res, {
      totalTickets,
      statusBreakdown,
      categoryBreakdown,
      avgResolutionTimeMs: avgResolutionTime[0]?.avgTime || 0
    }, 'Ticket analytics retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
