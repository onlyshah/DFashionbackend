/**
 * Follows Controller - Complete MongoDB Implementation (Phase 4)
 * 8 methods for user follow/follower management
 */

const Follow = require('../models/Follow');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Follow a user
 */
exports.followUser = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { userId } = req.params;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid user ID', 400, 'INVALID_ID');
    }

    if (userId === req.user._id.toString()) {
      throw new ApiError('Cannot follow yourself', 400, 'CANNOT_FOLLOW_SELF');
    }

    // Check if user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
      follower: req.user._id,
      following: userId
    });

    if (existingFollow) {
      if (existingFollow.status === 'active') {
        throw new ApiError('Already following this user', 400, 'ALREADY_FOLLOWING');
      }
      // Re-activate if was blocked
      if (existingFollow.status === 'blocked') {
        throw new ApiError('You have blocked this user', 400, 'USER_BLOCKED');
      }
    }

    const follow = await Follow.create({
      follower: req.user._id,
      following: userId,
      status: 'active'
    });

    // Create notification
    await Notification.create({
      user: userId,
      type: 'follow',
      title: `${req.user.name || 'Someone'} started following you`,
      message: `${req.user.name || 'Someone'} is now following you`,
      relatedUser: req.user._id
    }).catch(() => {}); // Best effort

    // Increment follower count
    await User.findByIdAndUpdate(
      userId,
      { $inc: { 'profile.followers': 1 } },
      { new: true }
    );

    // Increment following count
    await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { 'profile.following': 1 } },
      { new: true }
    );

    const populatedFollow = await follow.populate('following', 'name email avatar profile');

    return ApiResponse.created(res, populatedFollow, 'User followed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Unfollow a user
 */
exports.unfollowUser = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { userId } = req.params;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid user ID', 400, 'INVALID_ID');
    }

    const follow = await Follow.findOne({
      follower: req.user._id,
      following: userId,
      status: 'active'
    });

    if (!follow) {
      throw new ApiError('Not following this user', 400, 'NOT_FOLLOWING');
    }

    await Follow.findByIdAndDelete(follow._id);

    // Decrement follower count
    await User.findByIdAndUpdate(
      userId,
      { $inc: { 'profile.followers': -1 } },
      { new: true }
    );

    // Decrement following count
    await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { 'profile.following': -1 } },
      { new: true }
    );

    return ApiResponse.success(res, { userId }, 'User unfollowed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get followers of a user
 */
exports.getFollowers = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid user ID', 400, 'INVALID_ID');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const [followers, total] = await Promise.all([
      Follow.find({ following: userId, status: 'active' })
        .populate('follower', 'name email avatar profile')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Follow.countDocuments({ following: userId, status: 'active' })
    ]);

    return ApiResponse.paginated(res, followers, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Followers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Get users that a user is following
 */
exports.getFollowing = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid user ID', 400, 'INVALID_ID');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const [following, total] = await Promise.all([
      Follow.find({ follower: userId, status: 'active' })
        .populate('following', 'name email avatar profile')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Follow.countDocuments({ follower: userId, status: 'active' })
    ]);

    return ApiResponse.paginated(res, following, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Following list retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Check if user is following another user
 */
exports.isFollowing = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { userId } = req.params;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid user ID', 400, 'INVALID_ID');
    }

    const follow = await Follow.findOne({
      follower: req.user._id,
      following: userId,
      status: 'active'
    }).lean();

    return ApiResponse.success(res, {
      isFollowing: !!follow,
      userId
    }, 'Follow status retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Block a user
 */
exports.blockUser = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { userId } = req.params;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid user ID', 400, 'INVALID_ID');
    }

    // Check if user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Remove existing follow relationship
    await Follow.deleteMany({
      $or: [
        { follower: req.user._id, following: userId },
        { follower: userId, following: req.user._id }
      ]
    });

    // Create block relationship
    const block = await Follow.create({
      follower: req.user._id,
      following: userId,
      status: 'blocked'
    });

    return ApiResponse.created(res, block, 'User blocked successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Unblock a user
 */
exports.unblockUser = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { userId } = req.params;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid user ID', 400, 'INVALID_ID');
    }

    const block = await Follow.findOne({
      follower: req.user._id,
      following: userId,
      status: 'blocked'
    });

    if (!block) {
      throw new ApiError('User not blocked', 400, 'NOT_BLOCKED');
    }

    await Follow.findByIdAndDelete(block._id);

    return ApiResponse.success(res, { userId }, 'User unblocked successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Get blocked users list
 */
exports.getBlockedUsers = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const [blockedUsers, total] = await Promise.all([
      Follow.find({ follower: req.user._id, status: 'blocked' })
        .populate('following', 'name email avatar profile')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Follow.countDocuments({ follower: req.user._id, status: 'blocked' })
    ]);

    return ApiResponse.paginated(res, blockedUsers, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Blocked users retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
