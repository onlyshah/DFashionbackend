/**
 * Reels Routes - Phase 4
 * 7 endpoints for video reels management
 */

const express = require('express');
const router = express.Router();
const reelsController = require('../controllers/reelsControllerPhase4');
const { verifyToken, optionalAuth } = require('../middleware/auth');

// Get all reels
router.get('/', optionalAuth, reelsController.getReels);

// Create new reel
router.post('/', verifyToken, reelsController.createReel);

// Get single reel
router.get('/:id', optionalAuth, reelsController.getReel);

// Delete reel
router.delete('/:id', verifyToken, reelsController.deleteReel);

// Like reel
router.post('/:id/like', verifyToken, reelsController.likeReel);

// Unlike reel
router.delete('/:id/like', verifyToken, reelsController.unlikeReel);

// Share reel
router.post('/:id/share', verifyToken, reelsController.shareReel);

module.exports = router;
