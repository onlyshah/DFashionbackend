/**
 * Comments Routes - Phase 4
 * 5 endpoints for posts comments management
 */

const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/commentsControllerPhase4');
const { verifyToken, optionalAuth } = require('../middleware/auth');

// Get all comments on a post
router.get('/post/:postId', optionalAuth, commentsController.getComments);

// Create comment on post
router.post('/post/:postId', verifyToken, commentsController.createComment);

// Get replies to a comment
router.get('/replies/:commentId', optionalAuth, commentsController.getCommentReplies);

// Update comment
router.put('/:commentId', verifyToken, commentsController.updateComment);

// Delete comment
router.delete('/:commentId', verifyToken, commentsController.deleteComment);

module.exports = router;
