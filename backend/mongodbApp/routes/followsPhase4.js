/**
 * Follows Routes - Phase 4
 * 8 endpoints for user follow/follower management
 */

const express = require('express');
const router = express.Router();
const followsController = require('../controllers/followsControllerPhase4');
const { verifyToken, optionalAuth } = require('../middleware/auth');

// Get followers of a user
router.get('/followers/:userId', optionalAuth, followsController.getFollowers);

// Get users that a user is following
router.get('/following/:userId', optionalAuth, followsController.getFollowing);

// Check if user is following another user
router.get('/check/:userId', verifyToken, followsController.isFollowing);

// Follow user
router.post('/:userId/follow', verifyToken, followsController.followUser);

// Unfollow user
router.delete('/:userId/follow', verifyToken, followsController.unfollowUser);

// Block user
router.post('/:userId/block', verifyToken, followsController.blockUser);

// Unblock user
router.delete('/:userId/block', verifyToken, followsController.unblockUser);

// Get blocked users
router.get('/blocked/list', verifyToken, followsController.getBlockedUsers);

module.exports = router;
