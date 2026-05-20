/**
 * Returns Management Controller - Complete MongoDB Implementation (Phase 7)
 * 5 methods for handling product returns
 */

const Return = require('../models/Return');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Refund = require('../models/Refund');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Create return request
 */
exports.createReturnRequest = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { orderId, reason, description, images } = req.body;

    if (!orderId || !orderId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Valid order ID is required', 400, 'VALIDATION_ERROR');
    }

    const order = await Order.findById(orderId);

    if (!order) {
      throw new ApiError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      throw new ApiError('Not authorized to return this order', 403, 'FORBIDDEN');
    }

    if (order.status === 'returned' || order.status === 'cancelled') {
      throw new ApiError('Order cannot be returned', 400, 'INVALID_STATUS');
    }

    const returnRequest = await Return.create({
      userId: req.user._id,
      orderId,
      reason: reason || 'Other',
      description,
      images: images || [],
      status: 'initiated',
      requestDate: new Date()
    });

    return ApiResponse.created(res, returnRequest, 'Return request created');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get return requests
 */
exports.getReturnRequests = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    let filter = {};

    // User can see their own returns, admin can see all
    if (req.user && req.user.role !== 'admin') {
      filter.userId = req.user._id;
    }

    if (status) filter.status = status;

    const [returns, total] = await Promise.all([
      Return.find(filter)
        .populate('orderId', 'orderNumber totalAmount')
        .populate('userId', 'name email')
        .sort('-requestDate')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Return.countDocuments(filter)
    ]);

    return ApiResponse.paginated(res, returns, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Return requests retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Update return status
 */
exports.updateReturnStatus = async (req, res, next) => {
  try {
    const { returnId } = req.params;
    const { status, notes } = req.body;

    if (!returnId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid return ID', 400, 'INVALID_ID');
    }

    const validStatuses = ['initiated', 'approved', 'rejected', 'received', 'processed'];

    if (!validStatuses.includes(status)) {
      throw new ApiError('Invalid status', 400, 'INVALID_STATUS');
    }

    const returnRequest = await Return.findByIdAndUpdate(
      returnId,
      {
        $set: {
          status,
          processedAt: new Date(),
          adminNotes: notes
        }
      },
      { new: true }
    );

    if (!returnRequest) {
      throw new ApiError('Return request not found', 404, 'RETURN_NOT_FOUND');
    }

    // Update associated order status if return is approved
    if (status === 'approved') {
      await Order.findByIdAndUpdate(
        returnRequest.orderId,
        { $set: { status: 'pending_return' } }
      );
    }

    return ApiResponse.success(res, returnRequest, 'Return status updated');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Process refund
 */
exports.processRefund = async (req, res, next) => {
  try {
    const { returnId } = req.params;
    const { refundAmount, method = 'original_payment' } = req.body;

    if (!returnId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid return ID', 400, 'INVALID_ID');
    }

    const returnRequest = await Return.findById(returnId);

    if (!returnRequest) {
      throw new ApiError('Return request not found', 404, 'RETURN_NOT_FOUND');
    }

    const order = await Order.findById(returnRequest.orderId);

    if (!order) {
      throw new ApiError('Associated order not found', 404, 'ORDER_NOT_FOUND');
    }

    const finalRefundAmount = refundAmount || order.totalAmount;

    if (finalRefundAmount > order.totalAmount) {
      throw new ApiError('Refund amount cannot exceed order total', 400, 'INVALID_AMOUNT');
    }

    const refund = await Refund.create({
      userId: returnRequest.userId,
      orderId: returnRequest.orderId,
      returnId,
      amount: finalRefundAmount,
      method,
      status: 'processed',
      processedDate: new Date()
    });

    // Update return status
    returnRequest.status = 'processed';
    await returnRequest.save();

    // Update order status
    await Order.findByIdAndUpdate(
      returnRequest.orderId,
      { $set: { status: 'returned' } }
    );

    return ApiResponse.created(res, refund, 'Refund processed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Get return analytics
 */
exports.getReturnAnalytics = async (req, res, next) => {
  try {
    const [totalReturns, returnsByStatus, totalRefunded] = await Promise.all([
      Return.countDocuments(),
      Return.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Refund.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const statusBreakdown = {};
    returnsByStatus.forEach(item => {
      statusBreakdown[item._id] = item.count;
    });

    return ApiResponse.success(res, {
      totalReturns,
      statusBreakdown,
      totalRefunded: totalRefunded[0]?.total || 0
    }, 'Return analytics retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
