const express = require('express');
const Story = require('../models/Story');
const { auth, optionalAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// @route   GET /api/stories
// @desc    Get all active stories
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get stories that haven't expired
    const stories = await Story.find({
      isActive: true,
      expiresAt: { $gt: new Date() }
    })
    .populate('user', 'username fullName avatar socialStats')
    .populate('products.product', 'name price images brand')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    // Group stories by user
    const groupedStories = {};
    stories.forEach(story => {
      const userId = story.user._id.toString();
      if (!groupedStories[userId]) {
        groupedStories[userId] = {
          user: story.user,
          stories: []
        };
      }
      groupedStories[userId].stories.push(story);
    });

    const result = Object.values(groupedStories);

    res.json({
      success: true,
      stories: stories,
      storyGroups: result
    });
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/stories/active
// @desc    Get all active stories (alias for main endpoint)
// @access  Public
router.get('/active', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get stories that haven't expired
    const stories = await Story.find({
      isActive: true,
      expiresAt: { $gt: new Date() }
    })
    .populate('user', 'username fullName avatar socialStats')
    .populate('products.product', 'name price images brand')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    // Group stories by user
    const groupedStories = {};
    stories.forEach(story => {
      const userId = story.user._id.toString();
      if (!groupedStories[userId]) {
        groupedStories[userId] = {
          user: story.user,
          stories: []
        };
      }
      groupedStories[userId].stories.push(story);
    });

    const result = Object.values(groupedStories);

    res.json({
      success: true,
      data: result, // Use 'data' key as expected by frontend
      stories: stories,
      storyGroups: result
    });
  } catch (error) {
    console.error('Get active stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/stories/user/:userId
// @desc    Get stories by user
// @access  Public
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const stories = await Story.find({
      user: req.params.userId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    })
    .populate('user', 'username fullName avatar')
    .populate('products.product', 'name price images brand')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      stories: stories
    });
  } catch (error) {
    console.error('Get user stories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Middleware to validate story creation
const validateStoryCreation = async (req, res, next) => {
  try {
    const { products } = req.body;

    // Ensure at least one product is tagged
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product must be tagged in the story'
      });
    }

    // If user is a vendor, check if they're verified
    if (req.user.role === 'vendor') {
      const User = require('../models/User');
      const vendor = await User.findById(req.user.userId);

      if (!vendor || vendor.vendorVerification.status !== 'approved') {
        return res.status(403).json({
          success: false,
          message: 'Vendor verification required to create stories'
        });
      }

      // Vendors can only create stories about their own products
      const Product = require('../models/Product');
      const productIds = products.map(p => p.product);
      const vendorProducts = await Product.find({
        _id: { $in: productIds },
        vendor: req.user.userId
      });

      if (vendorProducts.length !== productIds.length) {
        return res.status(403).json({
          success: false,
          message: 'Vendors can only create stories about their own products'
        });
      }
    }

    // Validate that all product IDs exist
    const Product = require('../models/Product');
    const productIds = products.map(p => p.product);
    const validProducts = await Product.find({ _id: { $in: productIds } });

    if (validProducts.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more invalid product IDs provided'
      });
    }

    next();
  } catch (error) {
    console.error('Story validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @route   POST /api/stories
// @desc    Create new story (must include product tags)
// @access  Private (Verified vendors for own products, end users for any products)
router.post('/', [
  auth,
  validateStoryCreation,
  body('media.type').isIn(['image', 'video']).withMessage('Invalid media type'),
  body('media.url').isURL().withMessage('Invalid media URL'),
  body('caption').optional().isLength({ max: 500 }).withMessage('Caption too long'),
  body('products').isArray({ min: 1 }).withMessage('At least one product must be tagged')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const storyData = {
      ...req.body,
      user: req.user._id
    };

    const story = new Story(storyData);
    await story.save();

    await story.populate('user', 'username fullName avatar');
    await story.populate('products.product', 'name price images brand');

    res.status(201).json({
      message: 'Story created successfully',
      story
    });
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/stories/:id/view
// @desc    Mark story as viewed
// @access  Private
router.post('/:id/view', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Check if user already viewed
    const alreadyViewed = story.viewers.some(
      viewer => viewer.user.toString() === req.user._id.toString()
    );

    if (!alreadyViewed) {
      story.viewers.push({ user: req.user._id });
      story.analytics.views += 1;
      await story.save();
    }

    res.json({ message: 'Story viewed' });
  } catch (error) {
    console.error('View story error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/stories/:id/like
// @desc    Like/unlike story
// @access  Private
router.post('/:id/like', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    const likeIndex = story.likes.findIndex(
      like => like.user.toString() === req.user._id.toString()
    );

    if (likeIndex > -1) {
      // Unlike
      story.likes.splice(likeIndex, 1);
      story.analytics.likes -= 1;
    } else {
      // Like
      story.likes.push({ user: req.user._id });
      story.analytics.likes += 1;
    }

    await story.save();

    res.json({
      success: true,
      message: likeIndex > -1 ? 'Story unliked' : 'Story liked',
      isLiked: likeIndex === -1,
      likesCount: story.likes.length
    });
  } catch (error) {
    console.error('Like story error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/stories/:id/share
// @desc    Share story
// @access  Private
router.post('/:id/share', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    if (!story.settings.allowSharing) {
      return res.status(403).json({ message: 'Sharing not allowed for this story' });
    }

    story.shares.push({ user: req.user._id });
    story.analytics.shares += 1;
    await story.save();

    res.json({
      success: true,
      message: 'Story shared successfully',
      sharesCount: story.shares.length
    });
  } catch (error) {
    console.error('Share story error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/stories/:id/comment
// @desc    Add comment to story
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

    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    if (!story.settings.allowComments) {
      return res.status(403).json({ message: 'Comments not allowed for this story' });
    }

    story.comments.push({
      user: req.user._id,
      text: req.body.text
    });

    story.analytics.comments += 1;
    await story.save();

    await story.populate('comments.user', 'username fullName avatar');

    res.json({
      success: true,
      message: 'Comment added successfully',
      comment: story.comments[story.comments.length - 1]
    });
  } catch (error) {
    console.error('Add comment to story error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/stories/:id/comments
// @desc    Get story comments
// @access  Public
router.get('/:id/comments', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const story = await Story.findById(req.params.id)
      .populate({
        path: 'comments.user',
        select: 'username fullName avatar'
      });

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Sort comments by creation date (newest first)
    const sortedComments = story.comments
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit);

    res.json({
      success: true,
      comments: sortedComments,
      pagination: {
        current: page,
        pages: Math.ceil(story.comments.length / limit),
        total: story.comments.length
      }
    });
  } catch (error) {
    console.error('Get story comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/stories/:id
// @desc    Delete story
// @access  Private (Own stories only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Check if user owns the story
    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this story' });
    }

    await Story.findByIdAndDelete(req.params.id);

    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
