/**
 * 👥 Follow Controller
 * Handles follow/unfollow operations and follower/following lists
 */

const Follow = require('../../models/Follow');
const User = require('../../models/User');

exports.followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user?._id || req.user?.id;

    if (!followerId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        statusCode: 401
      });
    }

    if (!userId || userId === followerId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID or cannot follow yourself',
        statusCode: 400
      });
    }

    // Verify target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        statusCode: 404
      });
    }

    const follow = await Follow.followUser(followerId, userId);

    res.status(201).json({
      success: true,
      message: 'User followed successfully',
      data: follow,
      statusCode: 201
    });
  } catch (error) {
    console.error('❌ Follow User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to follow user',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user?._id || req.user?.id;

    if (!followerId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        statusCode: 401
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        statusCode: 400
      });
    }

    await Follow.unfollowUser(followerId, userId);

    res.status(200).json({
      success: true,
      message: 'User unfollowed successfully',
      statusCode: 200
    });
  } catch (error) {
    console.error('❌ Unfollow User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unfollow user',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.checkFollowStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user?._id || req.user?.id;

    if (!followerId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and authentication required',
        statusCode: 400
      });
    }

    const isFollowing = await Follow.isFollowing(followerId, userId);

    res.status(200).json({
      success: true,
      message: 'Follow status retrieved',
      data: { isFollowing },
      statusCode: 200
    });
  } catch (error) {
    console.error('❌ Check Follow Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check follow status',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        statusCode: 400
      });
    }

    const result = await Follow.getFollowers(userId, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Followers retrieved successfully',
      data: result,
      statusCode: 200
    });
  } catch (error) {
    console.error('❌ Get Followers Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get followers',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        statusCode: 400
      });
    }

    const result = await Follow.getFollowing(userId, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Following list retrieved successfully',
      data: result,
      statusCode: 200
    });
  } catch (error) {
    console.error('❌ Get Following Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get following list',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.getFollowStats = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        statusCode: 400
      });
    }

    const followerCount = await Follow.getFollowersCount(userId);
    const followingCount = await Follow.getFollowingCount(userId);

    res.status(200).json({
      success: true,
      message: 'Follow statistics retrieved',
      data: {
        userId,
        followers: followerCount,
        following: followingCount
      },
      statusCode: 200
    });
  } catch (error) {
    console.error('❌ Get Follow Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get follow statistics',
      errors: [error.message],
      statusCode: 500
    });
  }
};
