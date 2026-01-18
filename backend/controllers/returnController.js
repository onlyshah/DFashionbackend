/**
 * Return Controller
 * Handles product returns and refund management
 * Model → Controller → Routes pattern
 */

const dbType = (process.env.DB_TYPE || '').toLowerCase();
const models = dbType === 'postgres' ? require('../models_sql') : require('../models')();
const { Return, Order, Product } = models;

// ==================== RETURN OPERATIONS ====================

/**
 * Get user's returns
 */
exports.getUserReturns = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { customerId: req.user.userId };
    if (status) filter.status = status;

    const returns = await Return.find(filter)
      .populate('orderId', 'orderNumber items status')
      .populate('items.productId', 'name price images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Return.countDocuments(filter);

    res.json({
      success: true,
      data: returns,
      pagination: {
        currentPage: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get user returns error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch returns',
      error: error.message
    });
  }
};

/**
 * Create return request
 */
exports.createReturnRequest = async (req, res) => {
  try {
    const { orderId, items, reason, comment } = req.body;

    // Validate inputs
    if (!orderId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and items are required'
      });
    }

    // Verify order exists and belongs to user
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.customer.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check order status
    if (!['delivered', 'completed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only delivered orders can be returned'
      });
    }

    // Create return request
    const returnRequest = new Return({
      orderId,
      customerId: req.user.userId,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      })),
      reason,
      comment,
      status: 'pending',
      timeline: [{
        status: 'pending',
        timestamp: Date.now(),
        note: 'Return request created'
      }]
    });

    await returnRequest.save();
    await returnRequest.populate([
      'orderId',
      'items.productId'
    ]);

    res.status(201).json({
      success: true,
      message: 'Return request created',
      data: { return: returnRequest }
    });
  } catch (error) {
    console.error('Create return request error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create return request',
      error: error.message
    });
  }
};

/**
 * Get return request details
 */
exports.getReturnRequest = async (req, res) => {
  try {
    const returnRequest = await Return.findById(req.params.id)
      .populate('orderId')
      .populate('items.productId', 'name price images');

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    // Check access
    if (returnRequest.customerId.toString() !== req.user.userId &&
        !['admin', 'return_manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { return: returnRequest }
    });
  } catch (error) {
    console.error('Get return request error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch return request',
      error: error.message
    });
  }
};

/**
 * Update return request status
 */
exports.updateReturnStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    const validStatuses = ['pending', 'approved', 'rejected', 'refunded', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid return status'
      });
    }

    const returnRequest = await Return.findByIdAndUpdate(
      req.params.id,
      {
        status,
        $push: {
          timeline: {
            status,
            timestamp: Date.now(),
            updatedBy: req.user.userId,
            note: note || `Status changed to ${status}`
          }
        }
      },
      { new: true }
    ).populate('items.productId', 'name price');

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    res.json({
      success: true,
      message: 'Return status updated',
      data: { return: returnRequest }
    });
  } catch (error) {
    console.error('Update return status error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to update return status',
      error: error.message
    });
  }
};

/**
 * Approve return request
 */
exports.approveReturn = async (req, res) => {
  try {
    const { returnShippingLabel } = req.body;

    const returnRequest = await Return.findByIdAndUpdate(
      req.params.id,
      {
        status: 'approved',
        approvedAt: Date.now(),
        approvedBy: req.user.userId,
        returnShippingLabel,
        $push: {
          timeline: {
            status: 'approved',
            timestamp: Date.now(),
            updatedBy: req.user.userId,
            note: 'Return approved'
          }
        }
      },
      { new: true }
    ).populate('items.productId', 'name price');

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    res.json({
      success: true,
      message: 'Return approved',
      data: { return: returnRequest }
    });
  } catch (error) {
    console.error('Approve return error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to approve return',
      error: error.message
    });
  }
};

/**
 * Reject return request
 */
exports.rejectReturn = async (req, res) => {
  try {
    const { reason } = req.body;

    const returnRequest = await Return.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        rejectedAt: Date.now(),
        rejectedBy: req.user.userId,
        rejectionReason: reason,
        $push: {
          timeline: {
            status: 'rejected',
            timestamp: Date.now(),
            updatedBy: req.user.userId,
            note: `Return rejected: ${reason}`
          }
        }
      },
      { new: true }
    ).populate('items.productId', 'name price');

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    res.json({
      success: true,
      message: 'Return rejected',
      data: { return: returnRequest }
    });
  } catch (error) {
    console.error('Reject return error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to reject return',
      error: error.message
    });
  }
};

/**
 * Get all returns (admin)
 */
exports.getAllReturns = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (status) filter.status = status;

    const returns = await Return.find(filter)
      .populate('customerId', 'fullName email')
      .populate('orderId', 'orderNumber')
      .populate('items.productId', 'name price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Return.countDocuments(filter);

    res.json({
      success: true,
      data: returns,
      pagination: {
        currentPage: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all returns error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch returns',
      error: error.message
    });
  }
};
