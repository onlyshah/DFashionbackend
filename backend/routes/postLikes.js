/**
 * 👍 Post Like Routes
 * Handles routes for liking posts
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const postLikeController = require('../../controllers/postLikeController');
const { protect } = require('../../middleware/auth');

// All routes require authentication
router.use(protect);

// @route   POST /api/posts/:postId/like
// @desc    Like a post
// @access  Private
router.post('/like', postLikeController.likePost);

// @route   DELETE /api/posts/:postId/unlike
// @desc    Unlike a post
// @access  Private
router.delete('/unlike', postLikeController.unlikePost);

// @route   GET /api/posts/:postId/likes/count
// @desc    Get total likes count for a post
// @access  Public
router.get('/count', postLikeController.getLikeCount);

// @route   GET /api/posts/:postId/likes/check
// @desc    Check if current user liked the post
// @access  Private
router.get('/check', postLikeController.checkUserLiked);

// @route   GET /api/posts/:postId/likers
// @desc    Get all users who liked the post
// @access  Public
router.get('/likers', postLikeController.getPostLikers);

module.exports = router;
