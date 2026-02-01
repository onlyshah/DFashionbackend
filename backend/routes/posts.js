const express = require('express');
const { auth, optionalAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const postsController = require('../controllers/postsController');

const router = express.Router();

// @route   GET /api/posts
// @desc    Get all posts (feed)
// @access  Public
router.get('/', optionalAuth, postsController.getPostsFeed);

// @route   GET /api/posts/:id
// @desc    Get single post by ID
// @access  Public
router.get('/:id', postsController.getPostById);

// @route   POST /api/posts
// @desc    Create new post
// @access  Private
router.post('/', [
  auth,
  body('caption').notEmpty().withMessage('Caption is required'),
  body('media').isArray({ min: 1 }).withMessage('At least one media item is required')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}, postsController.createPost);

// @route   POST /api/posts/:id/like
// @desc    Like/unlike post
// @access  Private
router.post('/:id/like', auth, postsController.toggleLikePost);

// @route   POST /api/posts/:id/save
// @desc    Save/unsave post
// @access  Private
router.post('/:id/save', auth, postsController.toggleSavePost);

// @route   POST /api/posts/:id/comment
// @desc    Add comment to post
// @access  Private
router.post('/:id/comment', [
  auth,
  body('text').notEmpty().withMessage('Comment text is required')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}, postsController.addComment);

// @route   POST /api/posts/:id/share
// @desc    Share post
// @access  Private
router.post('/:id/share', auth, postsController.sharePost);

// @route   GET /api/posts/:id/comments
// @desc    Get post comments
// @access  Public
router.get('/:id/comments', postsController.getPostComments);

// @route   POST /api/posts/:postId/analytics/product-click
// @desc    Track product click analytics
// @access  Private
router.post('/:postId/analytics/product-click', auth, postsController.trackProductClick);

// @route   GET /api/posts/user/:userId
// @desc    Get posts by user
// @access  Public
router.get('/user/:userId', postsController.getUserPosts);

module.exports = router;