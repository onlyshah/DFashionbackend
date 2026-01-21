const express = require('express');
const router = express.Router();
// NOTE: Post and Reel models are MongoDB-only and not available in PostgreSQL mode
// DB_TYPE=postgres is configured, so these endpoints return demo data only
const { auth } = require('../middleware/auth');
const { verifyAdminToken } = require('../middleware/adminAuth');

// @route   GET /api/admin/social/posts
// @desc    Get all posts (DEMO DATA - MongoDB not available in PostgreSQL mode)
// @access  Admin
router.get('/posts', verifyAdminToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    // Return demo data (Post model not available in PostgreSQL)
    const demoPosts = [
      {
        _id: '1',
        user: { username: 'user1', fullName: 'John Doe', email: 'john@example.com', avatar: '' },
        content: 'Check out this amazing fashion piece!',
        image: 'https://via.placeholder.com/400',
        likes: 12,
        comments: [{ user: { username: 'user2' }, text: 'Love it!' }],
        products: { product: { name: 'Premium T-Shirt' } },
        approved: true,
        createdAt: new Date()
      },
      {
        _id: '2',
        user: { username: 'user2', fullName: 'Jane Smith', email: 'jane@example.com', avatar: '' },
        content: 'New collection launch!',
        image: 'https://via.placeholder.com/400',
        likes: 25,
        comments: [{ user: { username: 'user3' }, text: 'Awesome!' }],
        products: { product: { name: 'Classic Jeans' } },
        approved: true,
        createdAt: new Date()
      }
    ];

    const total = demoPosts.length;
    const paginatedPosts = demoPosts.slice(skip, skip + limit);

    res.json({
      success: true,
      message: 'Demo data only - Post model not available in PostgreSQL mode',
      data: paginatedPosts,
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
// @desc    Get all reels (DEMO DATA - MongoDB not available in PostgreSQL mode)
// @access  Admin
router.get('/reels', verifyAdminToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    // Return demo data (Reel model not available in PostgreSQL)
    const demoReels = [
      {
        _id: '1',
        user: { username: 'influencer1', fullName: 'Fashion Guru', email: 'guru@example.com', avatar: '' },
        video: 'https://via.placeholder.com/400',
        description: 'Summer fashion haul!',
        likes: 156,
        views: 2340,
        approved: true,
        createdAt: new Date()
      },
      {
        _id: '2',
        user: { username: 'influencer2', fullName: 'Style Queen', email: 'queen@example.com', avatar: '' },
        video: 'https://via.placeholder.com/400',
        description: 'Styling tips for the season',
        likes: 243,
        views: 4210,
        approved: true,
        createdAt: new Date()
      }
    ];

    const total = demoReels.length;
    const paginatedReels = demoReels.slice(skip, skip + limit);

    res.json({
      success: true,
      message: 'Demo data only - Reel model not available in PostgreSQL mode',
      data: paginatedReels,
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
// @desc    Get social engagement statistics (DEMO DATA - MongoDB not available in PostgreSQL mode)
// @access  Admin
router.get('/stats', verifyAdminToken, async (req, res) => {
  try {
    // Return demo stats (Post and Reel models not available in PostgreSQL)
    res.json({
      success: true,
      message: 'Demo data only - Post and Reel models not available in PostgreSQL mode',
      data: {
        totalPosts: 52,
        totalReels: 28,
        totalEngagement: 1240,
        avgEngagementRate: 19.84
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
