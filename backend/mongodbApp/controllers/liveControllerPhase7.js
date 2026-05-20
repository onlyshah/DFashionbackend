/**
 * Live Shopping Controller - Complete MongoDB Implementation (Phase 7)
 * 5 methods for real-time live shopping sessions
 */

const LiveSession = require('../models/LiveSession');
const LiveSessionMessage = require('../models/LiveSessionMessage');
const User = require('../models/User');
const Product = require('../models/Product');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Start live shopping session
 */
exports.startLiveSession = async (req, res, next) => {
  try {
    if (!req.user || !['vendor', 'admin'].includes(req.user.role)) {
      throw new ApiError('Vendor or admin access required', 403, 'FORBIDDEN');
    }

    const { title, description, products = [] } = req.body;

    if (!title) {
      throw new ApiError('Title is required', 400, 'VALIDATION_ERROR');
    }

    // Validate products exist
    if (products.length > 0) {
      const productIds = products.map(p => typeof p === 'string' ? p : p.productId);
      const foundProducts = await Product.find({ _id: { $in: productIds } });

      if (foundProducts.length !== products.length) {
        throw new ApiError('Some products not found', 404, 'PRODUCT_NOT_FOUND');
      }
    }

    const session = await LiveSession.create({
      hostId: req.user._id,
      title,
      description,
      products: products.map(p => typeof p === 'string' ? { productId: p } : p),
      status: 'live',
      startedAt: new Date(),
      viewerCount: 0
    });

    return ApiResponse.created(res, session, 'Live session started');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. End live shopping session
 */
exports.endLiveSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid session ID', 400, 'INVALID_ID');
    }

    const session = await LiveSession.findById(sessionId);

    if (!session) {
      throw new ApiError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    // Verify ownership
    if (session.hostId.toString() !== req.user._id.toString()) {
      throw new ApiError('Not authorized to end this session', 403, 'FORBIDDEN');
    }

    session.status = 'ended';
    session.endedAt = new Date();
    session.duration = (session.endedAt - session.startedAt) / 1000 / 60; // in minutes

    await session.save();

    return ApiResponse.success(res, session, 'Live session ended');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get live shopping sessions
 */
exports.getLiveSessions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status = 'live' } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status) filter.status = status;

    const [sessions, total] = await Promise.all([
      LiveSession.find(filter)
        .populate('hostId', 'name shopName')
        .populate('products.productId', 'name price images')
        .sort(status === 'live' ? '-startedAt' : '-endedAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      LiveSession.countDocuments(filter)
    ]);

    return ApiResponse.paginated(res, sessions, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Live sessions retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Join live session
 */
exports.joinLiveSession = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { sessionId } = req.params;

    if (!sessionId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid session ID', 400, 'INVALID_ID');
    }

    const session = await LiveSession.findById(sessionId)
      .populate('hostId', 'name shopName')
      .populate('products.productId', 'name price images');

    if (!session) {
      throw new ApiError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    if (session.status !== 'live') {
      throw new ApiError('This session is no longer live', 400, 'SESSION_ENDED');
    }

    // Increment viewer count
    if (!session.viewers) {
      session.viewers = [];
    }

    if (!session.viewers.includes(req.user._id)) {
      session.viewers.push(req.user._id);
      session.viewerCount = session.viewers.length;
      await session.save();
    }

    return ApiResponse.success(res, {
      sessionId: session._id,
      host: session.hostId,
      title: session.title,
      description: session.description,
      products: session.products,
      viewerCount: session.viewerCount,
      startedAt: session.startedAt
    }, 'Joined live session');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Get session chat messages
 */
exports.getSessionChat = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    if (!sessionId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid session ID', 400, 'INVALID_ID');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 50);
    const skip = (pageNum - 1) * limitNum;

    const [messages, total] = await Promise.all([
      LiveSessionMessage.find({ sessionId })
        .populate('userId', 'name profilePic')
        .sort('createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      LiveSessionMessage.countDocuments({ sessionId })
    ]);

    return ApiResponse.paginated(res, messages, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Session chat retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
