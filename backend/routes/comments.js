/**
 * 💬 Comment Routes
 * Handles routes for post comments
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const commentController = require('../../controllers/commentController');
const { protect, optionalAuth } = require('../../middleware/auth');

// @route   POST /api/posts/:postId/comments
// @desc    Create a comment on a post
// @access  Private
router.post('/', protect, commentController.createComment);

// @route   GET /api/posts/:postId/comments
// @desc    Get all comments for a post
// @access  Public
router.get('/', optionalAuth, commentController.getPostComments);

// @route   PUT /api/comments/:commentId
// @desc    Update a comment
// @access  Private
router.put('/:commentId', protect, commentController.updateComment);

// @route   DELETE /api/comments/:commentId
// @desc    Delete a comment
// @access  Private
router.delete('/:commentId', protect, commentController.deleteComment);

// @route   POST /api/comments/:commentId/reply
// @desc    Reply to a comment
// @access  Private
router.post('/:commentId/reply', protect, commentController.replyToComment);

// @route   GET /api/comments/:commentId/replies
// @desc    Get replies to a comment
// @access  Public
router.get('/:commentId/replies', commentController.getReplies);

// @route   POST /api/comments/:commentId/like
// @desc    Like a comment
// @access  Private
router.post('/:commentId/like', protect, commentController.likeComment);

// @route   DELETE /api/comments/:commentId/like
// @desc    Unlike a comment
// @access  Private
router.delete('/:commentId/like', protect, commentController.unlikeComment);

module.exports = router;
