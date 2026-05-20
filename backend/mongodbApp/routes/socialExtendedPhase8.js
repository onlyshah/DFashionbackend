/**
 * Social Extended Features Routes - Phase 8
 * Routes: /api/v1/social
 */

const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialExtendedControllerPhase8');
const { verifyToken } = require('../middleware/auth');

/**
 * Public Routes
 */

// GET - Get user profile
router.get('/users/:userId', socialController.getUserProfile);

// GET - Get user posts
router.get('/users/:userId/posts', socialController.getUserPosts);

// GET - Get followers
router.get('/users/:userId/followers', socialController.getFollowers);

// GET - Get following
router.get('/users/:userId/following', socialController.getFollowing);

/**
 * Protected Routes (User)
 */

router.use(verifyToken);

// PATCH - Update user profile
router.patch('/profile', socialController.updateUserProfile);

// POST - Block user
router.post('/block', socialController.blockUser);

// DELETE - Unblock user
router.delete('/block/:blockedUserId', socialController.unblockUser);

// GET - Get blocked users
router.get('/blocked/list', socialController.getBlockedUsers);

// POST - Report user
router.post('/report/user', socialController.reportUser);

// POST - Report post
router.post('/report/post', socialController.reportPost);

// GET - Follow recommendations
router.get('/recommendations/follow', socialController.getFollowRecommendations);

module.exports = router;
