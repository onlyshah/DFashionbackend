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
  const models = require('../models');
  User = models.User;
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

// All data comes from database via seeders - no mock data used

// GET /api/reels - Get all reels (Instagram-style feed)
router.get('/', async (req, res) => {
  try {
    console.log('📱 Reels: Fetching reels feed...');

    const { page = 1, limit = 10, trending = false } = req.query;

    if (!Reel) {
      return res.status(503).json({
        success: false,
        message: 'Reel service not available - database not connected'
      });
    }

    let query = { status: 'published' };
    let sort = trending ? { 'trending.score': -1 } : { createdAt: -1 };

    console.log('📱 Reels: Executing query with:', query);

    const reels = await Reel.find(query)
      .populate('user', 'username fullName avatar isVerified')
      .populate('products.product', 'name price images')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    console.log(`📱 Reels: Found ${reels.length} reels`);

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
      return res.status(503).json({
        success: false,
        message: 'Reel service not available - database not connected'
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
      return res.status(503).json({
        success: false,
        message: 'Reel service not available - database not connected'
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
      return res.status(503).json({
        success: false,
        message: 'Reel service not available - database not connected'
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
      return res.status(503).json({
        success: false,
        message: 'Reel service not available - database not connected'
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
