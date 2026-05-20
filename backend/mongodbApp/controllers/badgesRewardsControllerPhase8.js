/**
 * Badges & Rewards Controller - Complete MongoDB Implementation (Phase 8)
 * 8 methods for gamification and loyalty
 */

const Badge = require('../models/Badge');
const UserBadge = require('../models/UserBadge');
const Reward = require('../models/Reward');
const UserReward = require('../models/UserReward');
const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Get user badges
 */
exports.getUserBadges = async (req, res, next) => {
  try {
    const { userId } = req.params || { userId: req.user?._id };

    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Valid user ID is required', 400, 'VALIDATION_ERROR');
    }

    const badges = await UserBadge.find({ userId })
      .populate('badgeId', 'name description icon')
      .sort('-earnedAt')
      .lean();

    return ApiResponse.success(res, badges, 'User badges retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get all badges
 */
exports.getAllBadges = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [badges, total] = await Promise.all([
      Badge.find()
        .sort('name')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Badge.countDocuments()
    ]);

    return ApiResponse.paginated(res, badges, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Badges retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get badge details
 */
exports.getBadgeDetails = async (req, res, next) => {
  try {
    const { badgeId } = req.params;

    if (!badgeId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid badge ID', 400, 'INVALID_ID');
    }

    const badge = await Badge.findById(badgeId).lean();

    if (!badge) {
      throw new ApiError('Badge not found', 404, 'BADGE_NOT_FOUND');
    }

    const earnedCount = await UserBadge.countDocuments({ badgeId });

    return ApiResponse.success(res, {
      ...badge,
      earnedBy: earnedCount
    }, 'Badge details retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Get user rewards
 */
exports.getUserRewards = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { page = 1, limit = 20, status = 'earned' } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const filter = { userId: req.user._id };
    if (status) filter.status = status;

    const [rewards, total] = await Promise.all([
      UserReward.find(filter)
        .populate('rewardId', 'name points description')
        .sort('-earnedAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      UserReward.countDocuments(filter)
    ]);

    return ApiResponse.paginated(res, rewards, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'User rewards retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Redeem reward
 */
exports.redeemReward = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { rewardId } = req.body;

    if (!rewardId || !rewardId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Valid reward ID is required', 400, 'VALIDATION_ERROR');
    }

    const userReward = await UserReward.findOne({
      userId: req.user._id,
      rewardId,
      status: 'earned'
    });

    if (!userReward) {
      throw new ApiError('Reward not found or already redeemed', 404, 'REWARD_NOT_FOUND');
    }

    userReward.status = 'redeemed';
    userReward.redeemedAt = new Date();
    await userReward.save();

    return ApiResponse.success(res, userReward, 'Reward redeemed');
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Get reward catalog
 */
exports.getRewardCatalog = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const filter = { isActive: true };
    if (category) filter.category = category;

    const [rewards, total] = await Promise.all([
      Reward.find(filter)
        .sort('points')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Reward.countDocuments(filter)
    ]);

    return ApiResponse.paginated(res, rewards, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Reward catalog retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Check badge eligibility
 */
exports.checkBadgeEligibility = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const Order = require('../models/Order');
    const Post = require('../models/Post');
    const Follow = require('../models/Follow');

    const [orderCount, postCount, followerCount, userBadges] = await Promise.all([
      Order.countDocuments({ userId: req.user._id, status: 'completed' }),
      Post.countDocuments({ userId: req.user._id }),
      Follow.countDocuments({ following: req.user._id }),
      UserBadge.find({ userId: req.user._id }).select('badgeId')
    ]);

    const earnedBadgeIds = userBadges.map(b => b.badgeId);

    const eligibleBadges = [];

    // First Purchase Badge
    if (orderCount >= 1 && !earnedBadgeIds.includes('badge_first_purchase')) {
      eligibleBadges.push({ badge: 'First Purchase', reason: 'You made your first purchase!' });
    }

    // Influencer Badge
    if (followerCount >= 1000 && !earnedBadgeIds.includes('badge_influencer')) {
      eligibleBadges.push({ badge: 'Influencer', reason: 'You have 1000+ followers!' });
    }

    // Content Creator Badge
    if (postCount >= 10 && !earnedBadgeIds.includes('badge_content_creator')) {
      eligibleBadges.push({ badge: 'Content Creator', reason: 'You created 10+ posts!' });
    }

    return ApiResponse.success(res, eligibleBadges, 'Eligibility check completed');
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Award badge (Admin only)
 */
exports.awardBadge = async (req, res, next) => {
  try {
    const { userId, badgeId, reason } = req.body;

    if (!userId || !badgeId) {
      throw new ApiError('User ID and badge ID are required', 400, 'VALIDATION_ERROR');
    }

    const badge = await Badge.findById(badgeId);
    if (!badge) {
      throw new ApiError('Badge not found', 404, 'BADGE_NOT_FOUND');
    }

    const existing = await UserBadge.findOne({ userId, badgeId });
    if (existing) {
      throw new ApiError('User already has this badge', 400, 'ALREADY_EARNED');
    }

    const userBadge = await UserBadge.create({
      userId,
      badgeId,
      awardedBy: req.user._id,
      reason,
      earnedAt: new Date()
    });

    return ApiResponse.created(res, userBadge, 'Badge awarded');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
