const express = require('express');
const ProductShare = require('../models/ProductShare');
const Product = require('../models/Product');
const { auth, optionalAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// @route   GET /api/product-shares/:productId
// @desc    Get shares for a product
// @access  Public
router.get('/:productId', optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const shares = await ProductShare.find({
      product: productId,
      'privacy.isPublic': true,
      isActive: true
    })
    .populate('sharedBy', 'username fullName avatar')
    .populate('comments.user', 'username fullName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await ProductShare.countDocuments({
      product: productId,
      'privacy.isPublic': true,
      isActive: true
    });

    // Get share analytics
    const analytics = await ProductShare.getProductShareAnalytics(productId);

    res.json({
      success: true,
      shares,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      },
      analytics
    });
  } catch (error) {
    console.error('Get product shares error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shares',
      error: error.message
    });
  }
});

// @route   POST /api/product-shares/:productId
// @desc    Share a product
// @access  Private
router.post('/:productId', [
  auth,
  body('sharedWith').isArray({ min: 1 }).withMessage('At least one recipient is required'),
  body('sharedWith.*.platform').isIn(['email', 'sms', 'whatsapp', 'facebook', 'twitter', 'instagram', 'telegram', 'copy_link', 'direct']).withMessage('Invalid platform')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { productId } = req.params;
    const { sharedWith, message, customNote, shareType, privacy } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Generate share URL and short URL
    const shareUrl = `${process.env.FRONTEND_URL}/product/${productId}`;
    const shortUrl = ProductShare.generateShortUrl();

    const share = new ProductShare({
      product: productId,
      sharedBy: req.user._id,
      sharedWith: sharedWith.map(recipient => ({
        ...recipient,
        sharedAt: new Date()
      })),
      shareType: shareType || 'private',
      message,
      customNote,
      shareUrl,
      shortUrl,
      privacy: {
        isPublic: privacy?.isPublic || false,
        allowComments: privacy?.allowComments !== false,
        allowLikes: privacy?.allowLikes !== false,
        showSharedBy: privacy?.showSharedBy !== false
      },
      metadata: {
        deviceType: req.headers['device-type'],
        platform: req.headers['platform'],
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });

    await share.save();
    await share.populate('sharedBy', 'username fullName avatar');

    res.status(201).json({
      success: true,
      message: 'Product shared successfully',
      share,
      shortUrl: `${process.env.FRONTEND_URL}/s/${shortUrl}`
    });
  } catch (error) {
    console.error('Share product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share product',
      error: error.message
    });
  }
});

// @route   GET /api/product-shares/link/:shortUrl
// @desc    Access shared product via short URL
// @access  Public
router.get('/link/:shortUrl', async (req, res) => {
  try {
    const { shortUrl } = req.params;
    const { platform, userId } = req.query;

    const share = await ProductShare.findOne({ shortUrl, isActive: true })
      .populate('product', 'name images price brand description')
      .populate('sharedBy', 'username fullName avatar');

    if (!share) {
      return res.status(404).json({
        success: false,
        message: 'Share not found or expired'
      });
    }

    // Track view
    if (platform) {
      share.trackView(platform, userId);
      await share.save();
    }

    res.json({
      success: true,
      share
    });
  } catch (error) {
    console.error('Access shared product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to access shared product',
      error: error.message
    });
  }
});

// @route   POST /api/product-shares/link/:shortUrl/click
// @desc    Track click on shared product
// @access  Public
router.post('/link/:shortUrl/click', async (req, res) => {
  try {
    const { shortUrl } = req.params;
    const { platform, userId } = req.body;

    const share = await ProductShare.findOne({ shortUrl, isActive: true });
    if (!share) {
      return res.status(404).json({
        success: false,
        message: 'Share not found'
      });
    }

    // Track click
    share.trackClick(platform, userId);
    await share.save();

    res.json({
      success: true,
      message: 'Click tracked successfully'
    });
  } catch (error) {
    console.error('Track click error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track click',
      error: error.message
    });
  }
});

// @route   PUT /api/product-shares/:shareId
// @desc    Update share
// @access  Private (Own share only)
router.put('/:shareId', [
  auth,
  body('message').optional().isLength({ max: 500 }).withMessage('Message too long'),
  body('customNote').optional().isLength({ max: 200 }).withMessage('Note too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { shareId } = req.params;
    const { message, customNote, privacy } = req.body;

    const share = await ProductShare.findById(shareId);
    if (!share) {
      return res.status(404).json({
        success: false,
        message: 'Share not found'
      });
    }

    // Check ownership
    if (share.sharedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this share'
      });
    }

    // Update share
    if (message !== undefined) share.message = message;
    if (customNote !== undefined) share.customNote = customNote;
    if (privacy) {
      Object.assign(share.privacy, privacy);
    }

    await share.save();

    res.json({
      success: true,
      message: 'Share updated successfully',
      share
    });
  } catch (error) {
    console.error('Update share error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update share',
      error: error.message
    });
  }
});

// @route   DELETE /api/product-shares/:shareId
// @desc    Delete share
// @access  Private (Own share or Super Admin)
router.delete('/:shareId', auth, async (req, res) => {
  try {
    const { shareId } = req.params;

    const share = await ProductShare.findById(shareId);
    if (!share) {
      return res.status(404).json({
        success: false,
        message: 'Share not found'
      });
    }

    // Check permissions
    const isOwner = share.sharedBy.toString() === req.user._id.toString();
    const isSuperAdmin = req.user.role === 'super_admin';

    if (!isOwner && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this share'
      });
    }

    share.isActive = false;
    await share.save();

    res.json({
      success: true,
      message: 'Share deleted successfully'
    });
  } catch (error) {
    console.error('Delete share error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete share',
      error: error.message
    });
  }
});

// @route   POST /api/product-shares/:shareId/like
// @desc    Like/unlike share
// @access  Private
router.post('/:shareId/like', auth, async (req, res) => {
  try {
    const { shareId } = req.params;

    const share = await ProductShare.findById(shareId);
    if (!share) {
      return res.status(404).json({
        success: false,
        message: 'Share not found'
      });
    }

    if (!share.privacy.allowLikes) {
      return res.status(403).json({
        success: false,
        message: 'Likes are not allowed on this share'
      });
    }

    const isLiked = share.isLikedBy(req.user._id);

    if (isLiked) {
      share.removeLike(req.user._id);
    } else {
      share.addLike(req.user._id);
    }

    await share.save();

    res.json({
      success: true,
      message: isLiked ? 'Share unliked' : 'Share liked',
      isLiked: !isLiked,
      likesCount: share.likes.length
    });
  } catch (error) {
    console.error('Like share error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like share',
      error: error.message
    });
  }
});

// @route   POST /api/product-shares/:shareId/comment
// @desc    Comment on share
// @access  Private
router.post('/:shareId/comment', [
  auth,
  body('text').notEmpty().withMessage('Comment text is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { shareId } = req.params;
    const { text } = req.body;

    const share = await ProductShare.findById(shareId);
    if (!share) {
      return res.status(404).json({
        success: false,
        message: 'Share not found'
      });
    }

    if (!share.privacy.allowComments) {
      return res.status(403).json({
        success: false,
        message: 'Comments are not allowed on this share'
      });
    }

    share.addComment(req.user._id, text);
    await share.save();
    await share.populate('comments.user', 'username fullName avatar');

    const newComment = share.comments[share.comments.length - 1];

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment: newComment
    });
  } catch (error) {
    console.error('Add comment to share error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message
    });
  }
});

module.exports = router;
