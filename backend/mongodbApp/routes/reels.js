const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const reelsController = require('../controllers/reelsController');

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

// @route   GET /api/reels
// @desc    Get reels feed
// @access  Public
router.get('/', reelsController.getReelsFeed);

// @route   GET /api/reels/trending
// @desc    Get trending reels
// @access  Public
router.get('/trending', reelsController.getTrendingReels);

// @route   GET /api/reels/:id
// @desc    Get reel by ID
// @access  Public
router.get('/:id', reelsController.getReelById);

// @route   POST /api/reels/:id/like
// @desc    Like/unlike reel
// @access  Private
router.post('/:id/like', auth, reelsController.toggleLikeReel);

// @route   POST /api/reels/:id/save
// @desc    Save/unsave reel
// @access  Private
router.post('/:id/save', auth, reelsController.toggleSaveReel);

module.exports = router;