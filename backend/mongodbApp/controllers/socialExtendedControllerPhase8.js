/**
 * Social Extended Features Controller - Complete MongoDB Implementation (Phase 8)
 * 11 methods for extended social features
 */

const User = require('../models/User');
const Follow = require('../models/Follow');
const Post = require('../models/Post');
const UserReport = require('../models/UserReport');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Get user profile
 */
exports.getUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid user ID', 400, 'INVALID_ID');
    }

    const user = await User.findById(userId)
      .select('-password')
      .lean();

    if (!user) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }

    const [followers, following, posts] = await Promise.all([
      Follow.countDocuments({ following: userId }),
      Follow.countDocuments({ follower: userId }),
      Post.countDocuments({ userId })
    ]);

    return ApiResponse.success(res, {
      ...user,
      stats: { followers, following, posts }
    }, 'User profile retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Update user profile
 */
exports.updateUserProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { bio, profilePic, coverPhoto, username } = req.body;

    const updates = {};
    if (bio) updates.bio = bio;
    if (profilePic) updates.profilePic = profilePic;
    if (coverPhoto) updates.coverPhoto = coverPhoto;
    if (username) updates.username = username;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    ).select('-password');

    return ApiResponse.success(res, user, 'Profile updated');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get following
 */
exports.getFollowing = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid user ID', 400, 'INVALID_ID');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [followings, total] = await Promise.all([
      Follow.find({ follower: userId })
        .populate('following', 'name profilePic')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Follow.countDocuments({ follower: userId })
    ]);

    return ApiResponse.paginated(res, followings, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Following retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Get followers
 */
exports.getFollowers = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid user ID', 400, 'INVALID_ID');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [followers, total] = await Promise.all([
      Follow.find({ following: userId })
        .populate('follower', 'name profilePic')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Follow.countDocuments({ following: userId })
    ]);

    return ApiResponse.paginated(res, followers, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Followers retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Get user posts
 */
exports.getUserPosts = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid user ID', 400, 'INVALID_ID');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [posts, total] = await Promise.all([
      Post.find({ userId })
        .populate('userId', 'name profilePic')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Post.countDocuments({ userId })
    ]);

    return ApiResponse.paginated(res, posts, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'User posts retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Block user
 */
exports.blockUser = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { blockedUserId } = req.body;

    if (!blockedUserId || !blockedUserId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Valid blocked user ID is required', 400, 'VALIDATION_ERROR');
    }

    const BlockedUser = require('../models/BlockedUser');

    const existing = await BlockedUser.findOne({
      userId: req.user._id,
      blockedUserId
    });

    if (existing) {
      throw new ApiError('User already blocked', 400, 'ALREADY_BLOCKED');
    }

    const block = await BlockedUser.create({
      userId: req.user._id,
      blockedUserId
    });

    return ApiResponse.created(res, block, 'User blocked');
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Unblock user
 */
exports.unblockUser = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { blockedUserId } = req.params;

    if (!blockedUserId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid user ID', 400, 'INVALID_ID');
    }

    const BlockedUser = require('../models/BlockedUser');

    await BlockedUser.findOneAndDelete({
      userId: req.user._id,
      blockedUserId
    });

    return ApiResponse.success(res, { id: blockedUserId }, 'User unblocked');
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Get blocked users
 */
exports.getBlockedUsers = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const BlockedUser = require('../models/BlockedUser');

    const [blocked, total] = await Promise.all([
      BlockedUser.find({ userId: req.user._id })
        .populate('blockedUserId', 'name profilePic')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      BlockedUser.countDocuments({ userId: req.user._id })
    ]);

    return ApiResponse.paginated(res, blocked, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Blocked users retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 9. Report user
 */
exports.reportUser = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { reportedUserId, reason, description } = req.body;

    if (!reportedUserId || !reason) {
      throw new ApiError('Reported user ID and reason are required', 400, 'VALIDATION_ERROR');
    }

    const report = await UserReport.create({
      reportedBy: req.user._id,
      reportedUser: reportedUserId,
      reason,
      description,
      status: 'pending'
    });

    return ApiResponse.created(res, report, 'Report submitted');
  } catch (error) {
    next(error);
  }
};

/**
 * 10. Report post
 */
exports.reportPost = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { postId, reason, description } = req.body;

    if (!postId || !reason) {
      throw new ApiError('Post ID and reason are required', 400, 'VALIDATION_ERROR');
    }

    const PostReport = require('../models/PostReport');

    const report = await PostReport.create({
      reportedBy: req.user._id,
      postId,
      reason,
      description,
      status: 'pending'
    });

    return ApiResponse.created(res, report, 'Post report submitted');
  } catch (error) {
    next(error);
  }
};

/**
 * 11. Get follow recommendations
 */
exports.getFollowRecommendations = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    // Get users that friends of current user follow but they don't
    const userFollowing = await Follow.find({ follower: req.user._id }).select('following');
    const followingIds = userFollowing.map(f => f.following);

    const recommendations = await User.find({
      _id: { $nin: [...followingIds, req.user._id] }
    })
      .select('-password')
      .sort('-followers')
      .skip(skip)
      .limit(limitNum)
      .lean();

    return ApiResponse.paginated(res, recommendations, {
      page: pageNum,
      limit: limitNum
    }, 'Follow recommendations retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
