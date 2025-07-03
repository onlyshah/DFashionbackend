const express = require('express');
const Post = require('../models/Post');
const { auth, optionalAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// @route   GET /api/posts
// @desc    Get all posts (feed)
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ isActive: true, visibility: 'public' })
      .populate('user', 'username fullName avatar socialStats')
      .populate('products.product', 'name price images brand')
      .populate('comments.user', 'username fullName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments({ isActive: true, visibility: 'public' });

    res.json({
      success: true,
      posts,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/posts/:id
// @desc    Get single post by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id)
      .populate('user', 'username fullName avatar vendorInfo.businessName')
      .populate('products.product', 'name price originalPrice images brand category')
      .populate('likes.user', 'username fullName avatar')
      .populate('comments.user', 'username fullName avatar')
      .populate('saves.user', 'username fullName avatar');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.json({
      success: true,
      post: post
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post',
      error: error.message
    });
  }
});

// @route   POST /api/posts
// @desc    Create new post
// @access  Private
router.post('/', [
  auth,
  body('caption').notEmpty().withMessage('Caption is required'),
  body('media').isArray({ min: 1 }).withMessage('At least one media item is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const postData = {
      ...req.body,
      user: req.user._id
    };

    const post = new Post(postData);
    await post.save();

    await post.populate('user', 'username fullName avatar');
    await post.populate('products.product', 'name price images brand');

    res.status(201).json({
      message: 'Post created successfully',
      post
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/:id/like
// @desc    Like/unlike post
// @access  Private
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const likeIndex = post.likes.findIndex(
      like => like.user.toString() === req.user._id.toString()
    );

    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
      post.analytics.likes -= 1;
    } else {
      // Like
      post.likes.push({ user: req.user._id });
      post.analytics.likes += 1;
    }

    await post.save();

    res.json({ 
      message: likeIndex > -1 ? 'Post unliked' : 'Post liked',
      likesCount: post.likes.length
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/:id/like
// @desc    Like/unlike post
// @access  Private
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const likeIndex = post.likes.findIndex(
      like => like.user.toString() === req.user._id.toString()
    );

    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
      post.analytics.likes -= 1;
    } else {
      // Like
      post.likes.push({ user: req.user._id });
      post.analytics.likes += 1;
    }

    await post.save();

    res.json({
      success: true,
      message: likeIndex > -1 ? 'Post unliked' : 'Post liked',
      isLiked: likeIndex === -1,
      likesCount: post.likes.length
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/:id/save
// @desc    Save/unsave post
// @access  Private
router.post('/:id/save', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const saveIndex = post.saves.findIndex(
      save => save.user.toString() === req.user._id.toString()
    );

    if (saveIndex > -1) {
      // Unsave
      post.saves.splice(saveIndex, 1);
      post.analytics.saves -= 1;
    } else {
      // Save
      post.saves.push({ user: req.user._id });
      post.analytics.saves += 1;
    }

    await post.save();

    res.json({
      success: true,
      message: saveIndex > -1 ? 'Post unsaved' : 'Post saved',
      isSaved: saveIndex === -1,
      savesCount: post.saves.length
    });
  } catch (error) {
    console.error('Save post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/:id/comment
// @desc    Add comment to post
// @access  Private
router.post('/:id/comment', [
  auth,
  body('text').notEmpty().withMessage('Comment text is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.comments.push({
      user: req.user._id,
      text: req.body.text
    });

    post.analytics.comments += 1;
    await post.save();

    await post.populate('comments.user', 'username fullName avatar');

    res.json({
      success: true,
      message: 'Comment added successfully',
      comment: post.comments[post.comments.length - 1]
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/:id/share
// @desc    Share post
// @access  Private
router.post('/:id/share', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if already shared
    const shareIndex = post.shares.findIndex(
      share => share.user.toString() === req.user._id.toString()
    );

    if (shareIndex === -1) {
      post.shares.push({ user: req.user._id });
      post.analytics.shares += 1;
      await post.save();
    }

    res.json({
      success: true,
      message: 'Post shared successfully',
      sharesCount: post.shares.length
    });
  } catch (error) {
    console.error('Share post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/posts/:id/comments
// @desc    Get post comments
// @access  Public
router.get('/:id/comments', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const post = await Post.findById(req.params.id)
      .populate({
        path: 'comments.user',
        select: 'username fullName avatar'
      });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Sort comments by creation date (newest first)
    const sortedComments = post.comments
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit);

    res.json({
      success: true,
      comments: sortedComments,
      pagination: {
        current: page,
        pages: Math.ceil(post.comments.length / limit),
        total: post.comments.length
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/:postId/analytics/product-click
// @desc    Track product click analytics
// @access  Private
router.post('/:postId/analytics/product-click', auth, async (req, res) => {
  try {
    const { productId, action } = req.body;
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Update analytics
    post.analytics.productClicks += 1;

    if (action === 'purchase') {
      post.analytics.purchases += 1;
    }

    await post.save();

    res.json({
      success: true,
      message: 'Analytics tracked successfully'
    });
  } catch (error) {
    console.error('Track analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/posts/user/:userId
// @desc    Get posts by user
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      user: req.params.userId,
      isActive: true,
      visibility: { $in: ['public', 'followers'] }
    })
      .populate('user', 'username fullName avatar socialStats')
      .populate('products.product', 'name price images brand')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments({
      user: req.params.userId,
      isActive: true,
      visibility: { $in: ['public', 'followers'] }
    });

    res.json({
      success: true,
      posts,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
