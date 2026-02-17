const express = require('express');
const router = express.Router();
const socialAdminController = require('../controllers/socialAdminController');
const { auth } = require('../middleware/auth');
const { verifyAdminToken } = require('../middleware/adminAuth');

// Stats endpoint
router.get('/stats', verifyAdminToken, socialAdminController.getStats);

router.get('/posts', verifyAdminToken, socialAdminController.getAllPosts);
router.get('/posts/:postId', verifyAdminToken, socialAdminController.getPostById);
router.put('/posts/:postId', verifyAdminToken, socialAdminController.updatePost);
router.delete('/posts/:postId', verifyAdminToken, socialAdminController.deletePost);

router.get('/reels', verifyAdminToken, socialAdminController.getAllReels);
router.get('/reels/:reelId', verifyAdminToken, socialAdminController.getReelById);
router.put('/reels/:reelId', verifyAdminToken, socialAdminController.updateReel);
router.delete('/reels/:reelId', verifyAdminToken, socialAdminController.deleteReel);

module.exports = router;