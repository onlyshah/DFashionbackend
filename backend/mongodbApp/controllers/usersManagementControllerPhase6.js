/**
 * Users Management Controller - Complete MongoDB Implementation (Phase 6)
 * 8 methods for admin user management
 */

const User = require('../models/User');
const Order = require('../models/Order');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Get all users (Admin only)
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, status, search, sort = '-createdAt' } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    
    if (role) filter.role = role;
    if (status === 'active') filter.isBlocked = false;
    if (status === 'blocked') filter.isBlocked = true;
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter)
    ]);

    return ApiResponse.paginated(res, users, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Users retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get user details
 */
exports.getUserDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid user ID', 400, 'INVALID_ID');
    }

    const user = await User.findById(userId)
      .select('-password')
      .populate('addresses', 'street city state zipCode country isDefault');

    if (!user) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Get user's order stats
    const orderStats = await Order.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
        }
      }
    ]);

    return ApiResponse.success(res, {
      ...user.toObject(),
      orderStats: orderStats[0] || {}
    }, 'User details retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Update user role
 */
exports.updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid user ID', 400, 'INVALID_ID');
    }

    const validRoles = ['customer', 'vendor', 'admin', 'super_admin', 'influencer', 'support_agent'];
    if (!validRoles.includes(role)) {
      throw new ApiError(`Invalid role. Must be one of: ${validRoles.join(', ')}`, 400, 'INVALID_ROLE');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }

    return ApiResponse.success(res, user, 'User role updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Block user
 */
exports.blockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid user ID', 400, 'INVALID_ID');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isBlocked: true,
        blockReason: reason || 'No reason provided',
        blockedAt: new Date()
      },
      { new: true }
    ).select('-password');

    if (!user) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }

    return ApiResponse.success(res, user, 'User blocked successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Unblock user
 */
exports.unblockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid user ID', 400, 'INVALID_ID');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isBlocked: false,
        blockReason: null,
        blockedAt: null
      },
      { new: true }
    ).select('-password');

    if (!user) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }

    return ApiResponse.success(res, user, 'User unblocked successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Verify user (Mark email as verified)
 */
exports.verifyUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid user ID', 400, 'INVALID_ID');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        'emailVerified': true,
        'emailVerifiedAt': new Date()
      },
      { new: true }
    ).select('-password');

    if (!user) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }

    return ApiResponse.success(res, user, 'User verified successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Delete user
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { hardDelete } = req.query;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid user ID', 400, 'INVALID_ID');
    }

    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (hardDelete === 'true') {
      // Hard delete - remove all user data
      await User.findByIdAndDelete(userId);
      // Delete related orders, posts, etc.
      await Order.deleteMany({ userId });
    } else {
      // Soft delete - mark as inactive
      await User.findByIdAndUpdate(userId, { isActive: false, deletedAt: new Date() });
    }

    return ApiResponse.success(res, { id: userId, deleted: true }, 'User deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Get user activity
 */
exports.getUserActivity = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid user ID', 400, 'INVALID_ID');
    }

    const user = await User.findById(userId).select('_id createdAt lastLogin');

    if (!user) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }

    const [orderCount, orderActivity, recentOrders] = await Promise.all([
      Order.countDocuments({ userId }),
      Order.aggregate([
        { $match: { userId: user._id } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 30 }
      ]),
      Order.find({ userId })
        .sort('-createdAt')
        .limit(10)
        .lean()
    ]);

    return ApiResponse.success(res, {
      userId,
      accountCreatedAt: user.createdAt,
      lastLogin: user.lastLogin,
      totalOrders: orderCount,
      orderActivity,
      recentOrders
    }, 'User activity retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
