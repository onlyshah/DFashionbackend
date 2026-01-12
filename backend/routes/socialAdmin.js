const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const { auth } = require('../middleware/auth');
const { verifyAdminToken } = require('../middleware/adminAuth');

// @route   GET /api/admin/social/posts
// @desc    Get all posts for admin with approval status
// @access  Admin
router.get('/posts', verifyAdminToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate('user', 'username fullName email avatar')
      .populate('products.product', 'name')
      .populate('comments.user', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments();

    res.json({
      success: true,
      data: posts,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, message: 'Error fetching posts' });
  }
});

// @route   GET /api/admin/social/reels
// @desc    Get all reels for admin with approval status
// @access  Admin
router.get('/reels', verifyAdminToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    const reels = await Reel.find()
      .populate('user', 'username fullName email avatar')
      .populate('likes', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Reel.countDocuments();

    res.json({
      success: true,
      data: reels,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching reels:', error);
    res.status(500).json({ success: false, message: 'Error fetching reels' });
  }
});

// @route   GET /api/admin/social/stats
// @desc    Get social engagement statistics
// @access  Admin
router.get('/stats', verifyAdminToken, async (req, res) => {
  try {
    const totalPosts = await Post.countDocuments();
    const totalReels = await Reel.countDocuments();

    // Calculate total engagement (likes + comments)
    const postsWithEngagement = await Post.aggregate([
      {
        $group: {
          _id: null,
          totalLikes: { $sum: { $size: '$likes' } },
          totalComments: { $sum: { $size: '$comments' } }
        }
      }
    ]);

    const reelsWithEngagement = await Reel.aggregate([
      {
        $group: {
          _id: null,
          totalLikes: { $sum: { $size: '$likes' } }
        }
      }
    ]);

    const postEngagement = postsWithEngagement[0] || { totalLikes: 0, totalComments: 0 };
    const reelEngagement = reelsWithEngagement[0] || { totalLikes: 0 };

    const totalEngagement = 
      (postEngagement.totalLikes || 0) + 
      (postEngagement.totalComments || 0) + 
      (reelEngagement.totalLikes || 0);

    const avgEngagementRate = 
      totalPosts > 0 ? ((totalEngagement / totalPosts) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalPosts,
        totalReels,
        totalEngagement,
        avgEngagementRate: parseFloat(avgEngagementRate.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching stats' });
  }
});

// @route   DELETE /api/admin/social/posts/:id
// @desc    Delete a post
// @access  Admin
router.delete('/posts/:id', verifyAdminToken, async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, message: 'Error deleting post' });
  }
});

// @route   DELETE /api/admin/social/reels/:id
// @desc    Delete a reel
// @access  Admin
router.delete('/reels/:id', verifyAdminToken, async (req, res) => {
  try {
    const reel = await Reel.findByIdAndDelete(req.params.id);
    
    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }

    res.json({ success: true, message: 'Reel deleted successfully' });
  } catch (error) {
    console.error('Error deleting reel:', error);
    res.status(500).json({ success: false, message: 'Error deleting reel' });
  }
});

// @route   PATCH /api/admin/social/posts/:id
// @desc    Update post approval status
// @access  Admin
router.patch('/posts/:id', verifyAdminToken, async (req, res) => {
  try {
    const { approved } = req.body;
    
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { approved },
      { new: true }
    ).populate('user', 'username fullName email avatar');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    res.json({ success: true, data: post, message: 'Post updated successfully' });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ success: false, message: 'Error updating post' });
  }
});

// @route   PATCH /api/admin/social/reels/:id
// @desc    Update reel approval status
// @access  Admin
router.patch('/reels/:id', verifyAdminToken, async (req, res) => {
  try {
    const { approved } = req.body;
    
    const reel = await Reel.findByIdAndUpdate(
      req.params.id,
      { approved },
      { new: true }
    ).populate('user', 'username fullName email avatar');

    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }

    res.json({ success: true, data: reel, message: 'Reel updated successfully' });
  } catch (error) {
    console.error('Error updating reel:', error);
    res.status(500).json({ success: false, message: 'Error updating reel' });
  }
});

module.exports = router;
