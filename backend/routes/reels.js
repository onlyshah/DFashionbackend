const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Middleware
const { auth } = require('../middleware/auth');

// Models
let Reel, User, Product;
try {
  Reel = require('../models/Reel');
  User = require('../models/User');
  Product = require('../models/Product');
} catch (error) {
  console.log('⚠️ Models not available, using mock data for reels');
}

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/reels';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'reel-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for videos
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed for reels'), false);
    }
  }
});

// Mock data for reels
const mockReels = [
  {
    id: '1',
    title: 'Summer Fashion Trends',
    description: 'Check out these amazing summer looks! 🌞✨ #fashion #summer #trending',
    user: {
      id: 'user1',
      username: 'fashion_queen_sara',
      fullName: 'Sara Fashion Queen',
      avatar: '/assets/images/default-avatar.svg',
      isVerified: true
    },
    media: {
      type: 'video',
      url: '/assets/videos/reel1.mp4',
      thumbnail: '/assets/images/reel1-thumb.jpg',
      duration: 30,
      resolution: { width: 1080, height: 1920 }
    },
    products: [
      {
        product: {
          id: 'prod1',
          name: 'Summer Dress',
          price: 2999,
          image: '/assets/images/dress1.jpg'
        },
        position: { x: 20, y: 50, timestamp: 15 }
      }
    ],
    hashtags: ['fashion', 'summer', 'trending', 'ootd'],
    analytics: {
      views: 15420,
      likes: 1240,
      comments: 89,
      shares: 45,
      saves: 156
    },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
  },
  {
    id: '2',
    title: 'Styling Tips for Office Wear',
    description: 'Professional yet stylish! 💼✨ #officewear #professional #style',
    user: {
      id: 'user2',
      username: 'style_guru_raj',
      fullName: 'Raj Style Guru',
      avatar: '/assets/images/default-avatar.svg',
      isVerified: false
    },
    media: {
      type: 'video',
      url: '/assets/videos/reel2.mp4',
      thumbnail: '/assets/images/reel2-thumb.jpg',
      duration: 45,
      resolution: { width: 1080, height: 1920 }
    },
    products: [
      {
        product: {
          id: 'prod2',
          name: 'Formal Blazer',
          price: 4999,
          image: '/assets/images/blazer1.jpg'
        },
        position: { x: 30, y: 60, timestamp: 10 }
      }
    ],
    hashtags: ['officewear', 'professional', 'style', 'workwear'],
    analytics: {
      views: 8930,
      likes: 567,
      comments: 34,
      shares: 23,
      saves: 89
    },
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
  },
  {
    id: '3',
    title: 'Casual Weekend Vibes',
    description: 'Comfort meets style 😎 #weekend #casual #comfortable',
    user: {
      id: 'user3',
      username: 'casual_chic_priya',
      fullName: 'Priya Casual Chic',
      avatar: '/assets/images/default-avatar.svg',
      isVerified: true
    },
    media: {
      type: 'video',
      url: '/assets/videos/reel3.mp4',
      thumbnail: '/assets/images/reel3-thumb.jpg',
      duration: 25,
      resolution: { width: 1080, height: 1920 }
    },
    products: [
      {
        product: {
          id: 'prod3',
          name: 'Casual T-Shirt',
          price: 1299,
          image: '/assets/images/tshirt1.jpg'
        },
        position: { x: 25, y: 75, timestamp: 8 }
      }
    ],
    hashtags: ['weekend', 'casual', 'comfortable', 'relaxed'],
    analytics: {
      views: 12340,
      likes: 890,
      comments: 67,
      shares: 34,
      saves: 123
    },
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000) // 8 hours ago
  }
];

// GET /api/reels - Get all reels (Instagram-style feed)
router.get('/', async (req, res) => {
  try {
    console.log('📱 Reels: Fetching reels feed...');

    const { page = 1, limit = 10, trending = false } = req.query;

    // Always use mock data for now (database not required)
    console.log('📱 Reels: Using mock data');
    return res.json({
      success: true,
      data: {
        reels: mockReels,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalReels: mockReels.length,
          hasNext: false,
          hasPrev: false
        }
      }
    });

    let query = { status: 'published', visibility: { $in: ['public', 'followers'] } };
    let sort = trending ? { 'trending.score': -1 } : { createdAt: -1 };

    const reels = await Reel.find(query)
      .populate('user', 'username fullName avatar isVerified')
      .populate('products.product', 'name price images')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Reel.countDocuments(query);

    res.json({
      success: true,
      data: {
        reels,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalReels: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching reels:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reels',
      error: error.message
    });
  }
});

// GET /api/reels/trending - Get trending reels
router.get('/trending', async (req, res) => {
  try {
    console.log('📱 Reels: Fetching trending reels...');
    
    if (!Reel) {
      const trendingReels = mockReels.sort((a, b) => b.analytics.views - a.analytics.views);
      return res.json({
        success: true,
        data: { reels: trendingReels }
      });
    }

    const reels = await Reel.find({ 
      status: 'published',
      visibility: 'public'
    })
    .populate('user', 'username fullName avatar isVerified')
    .populate('products.product', 'name price images')
    .sort({ 'trending.score': -1, 'analytics.views': -1 })
    .limit(20)
    .lean();

    res.json({
      success: true,
      data: { reels }
    });

  } catch (error) {
    console.error('❌ Error fetching trending reels:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trending reels',
      error: error.message
    });
  }
});

// GET /api/reels/:id - Get specific reel
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📱 Reels: Fetching reel ${id}...`);
    
    if (!Reel) {
      const reel = mockReels.find(r => r.id === id);
      if (!reel) {
        return res.status(404).json({
          success: false,
          message: 'Reel not found'
        });
      }
      return res.json({
        success: true,
        data: { reel }
      });
    }

    const reel = await Reel.findById(id)
      .populate('user', 'username fullName avatar isVerified followerCount')
      .populate('products.product', 'name price images brand')
      .lean();

    if (!reel) {
      return res.status(404).json({
        success: false,
        message: 'Reel not found'
      });
    }

    // Increment view count
    await Reel.findByIdAndUpdate(id, { 
      $inc: { 'analytics.views': 1, 'analytics.impressions': 1 }
    });

    res.json({
      success: true,
      data: { reel }
    });

  } catch (error) {
    console.error('❌ Error fetching reel:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reel',
      error: error.message
    });
  }
});

// POST /api/reels/:id/like - Like/unlike a reel
router.post('/:id/like', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    console.log(`📱 Reels: User ${userId} toggling like on reel ${id}...`);
    
    if (!Reel) {
      return res.json({
        success: true,
        message: 'Like toggled successfully',
        data: { liked: true, likesCount: 1241 }
      });
    }

    const reel = await Reel.findById(id);
    if (!reel) {
      return res.status(404).json({
        success: false,
        message: 'Reel not found'
      });
    }

    await reel.toggleLike(userId);

    const isLiked = reel.likedBy.some(like => like.user.toString() === userId);

    res.json({
      success: true,
      message: isLiked ? 'Reel liked' : 'Reel unliked',
      data: {
        liked: isLiked,
        likesCount: reel.analytics.likes
      }
    });

  } catch (error) {
    console.error('❌ Error toggling reel like:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling like',
      error: error.message
    });
  }
});

// POST /api/reels/:id/save - Save/unsave a reel
router.post('/:id/save', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    console.log(`📱 Reels: User ${userId} toggling save on reel ${id}...`);
    
    if (!Reel) {
      return res.json({
        success: true,
        message: 'Save toggled successfully',
        data: { saved: true, savesCount: 157 }
      });
    }

    const reel = await Reel.findById(id);
    if (!reel) {
      return res.status(404).json({
        success: false,
        message: 'Reel not found'
      });
    }

    await reel.toggleSave(userId);

    const isSaved = reel.savedBy.some(save => save.user.toString() === userId);

    res.json({
      success: true,
      message: isSaved ? 'Reel saved' : 'Reel unsaved',
      data: {
        saved: isSaved,
        savesCount: reel.analytics.saves
      }
    });

  } catch (error) {
    console.error('❌ Error toggling reel save:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling save',
      error: error.message
    });
  }
});

module.exports = router;
