const express = require('express');
const ProductComment = require('../models/ProductComment');
const Product = require('../models/Product');
const { auth, optionalAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// @route   GET /api/product-comments/:productId
// @desc    Get comments for a product
// @access  Public
router.get('/:productId', optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt'; // createdAt, rating, likes
    const order = req.query.order === 'asc' ? 1 : -1;

    const comments = await ProductComment.find({
      product: productId,
      isActive: true,
      moderationStatus: 'approved'
    })
    .populate('user', 'username fullName avatar isVerified')
    .populate('replies.user', 'username fullName avatar')
    .sort({ [sortBy]: order })
    .skip(skip)
    .limit(limit);

    const total = await ProductComment.countDocuments({
      product: productId,
      isActive: true,
      moderationStatus: 'approved'
    });

    // Get rating statistics
    const ratingStats = await ProductComment.getAverageRating(productId);
    const ratingDistribution = await ProductComment.getRatingDistribution(productId);

    res.json({
      success: true,
      comments,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      },
      ratingStats,
      ratingDistribution
    });
  } catch (error) {
    console.error('Get product comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: error.message
    });
  }
});

// @route   POST /api/product-comments/:productId
// @desc    Add comment to product
// @access  Private (Customer only)
router.post('/:productId', [
  auth,
  body('text').notEmpty().withMessage('Comment text is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
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
    const { text, rating, images } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user already commented on this product
    const existingComment = await ProductComment.findOne({
      product: productId,
      user: req.user._id,
      isActive: true
    });

    if (existingComment) {
      return res.status(400).json({
        success: false,
        message: 'You have already commented on this product'
      });
    }

    const comment = new ProductComment({
      product: productId,
      user: req.user._id,
      text,
      rating,
      images: images || [],
      metadata: {
        deviceType: req.headers['device-type'],
        platform: req.headers['platform']
      }
    });

    await comment.save();
    await comment.populate('user', 'username fullName avatar isVerified');

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    console.error('Add product comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message
    });
  }
});

// @route   PUT /api/product-comments/:commentId
// @desc    Update comment
// @access  Private (Own comment only)
router.put('/:commentId', [
  auth,
  body('text').optional().notEmpty().withMessage('Comment text cannot be empty'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { commentId } = req.params;
    const { text, rating, images } = req.body;

    const comment = await ProductComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check ownership
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this comment'
      });
    }

    // Save edit history
    comment.editHistory.push({
      text: comment.text,
      rating: comment.rating,
      editedAt: new Date()
    });

    // Update comment
    if (text) comment.text = text;
    if (rating) comment.rating = rating;
    if (images) comment.images = images;
    comment.isEdited = true;

    await comment.save();
    await comment.populate('user', 'username fullName avatar isVerified');

    res.json({
      success: true,
      message: 'Comment updated successfully',
      comment
    });
  } catch (error) {
    console.error('Update product comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update comment',
      error: error.message
    });
  }
});

// @route   DELETE /api/product-comments/:commentId
// @desc    Delete comment
// @access  Private (Own comment or Super Admin)
router.delete('/:commentId', auth, async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await ProductComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check permissions
    const isOwner = comment.user.toString() === req.user._id.toString();
    const isSuperAdmin = req.user.role === 'super_admin';

    if (!isOwner && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    comment.isActive = false;
    await comment.save();

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete product comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
      error: error.message
    });
  }
});

// @route   POST /api/product-comments/:commentId/like
// @desc    Like/unlike comment
// @access  Private
router.post('/:commentId/like', auth, async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await ProductComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const isLiked = comment.isLikedBy(req.user._id);

    if (isLiked) {
      comment.removeLike(req.user._id);
    } else {
      comment.addLike(req.user._id);
    }

    await comment.save();

    res.json({
      success: true,
      message: isLiked ? 'Comment unliked' : 'Comment liked',
      isLiked: !isLiked,
      likesCount: comment.likes.length
    });
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like comment',
      error: error.message
    });
  }
});

// @route   POST /api/product-comments/:commentId/reply
// @desc    Reply to comment
// @access  Private
router.post('/:commentId/reply', [
  auth,
  body('text').notEmpty().withMessage('Reply text is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { commentId } = req.params;
    const { text } = req.body;

    const comment = await ProductComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    comment.addReply(req.user._id, text);
    await comment.save();
    await comment.populate('replies.user', 'username fullName avatar');

    const newReply = comment.replies[comment.replies.length - 1];

    res.status(201).json({
      success: true,
      message: 'Reply added successfully',
      reply: newReply
    });
  } catch (error) {
    console.error('Add reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add reply',
      error: error.message
    });
  }
});

module.exports = router;
