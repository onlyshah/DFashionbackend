/**
 * 👥 Follow Routes
 * Endpoints for follow/unfollow operations
 */

const express = require('express');
const router = express.Router();
const followController = require('../../controllers/followController');
const { authenticationMiddleware } = require('../../middleware/auth');

// All follow endpoints require authentication
router.use(authenticationMiddleware);

/**
 * POST /api/follows/:userId
 * Follow a user
 * @auth Required
 */
router.post('/:userId', followController.followUser);

/**
 * DELETE /api/follows/:userId
 * Unfollow a user
 * @auth Required
 */
router.delete('/:userId', followController.unfollowUser);

/**
 * GET /api/follows/:userId/status
 * Check if authenticated user is following this user
 * @auth Required
 */
router.get('/:userId/status', followController.checkFollowStatus);

/**
 * GET /api/follows/:userId/followers
 * Get list of users following this user
 * @auth Required
 * @query page, limit
 */
router.get('/:userId/followers', followController.getFollowers);

/**
 * GET /api/follows/:userId/following
 * Get list of users this user is following
 * @auth Required
 * @query page, limit
 */
router.get('/:userId/following', followController.getFollowing);

/**
 * GET /api/follows/:userId/stats
 * Get follower and following counts
 * @auth Required
 */
router.get('/:userId/stats', followController.getFollowStats);

module.exports = router;
