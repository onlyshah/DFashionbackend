const express = require('express');
const { auth, optionalAuth, requireRole, verifyOwnership } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

// Public routes
router.get('/profile/:username', optionalAuth, userController.getUserProfile);
router.get('/:userId/followers', userController.getFollowers);
router.get('/:userId/following', userController.getFollowing);
router.get('/suggested', userController.getSuggestedUsers);
router.get('/influencers', userController.getInfluencers);

// Private routes - user actions
router.post('/follow/:userId', auth, userController.toggleFollowUser);
router.get('/:userId/follow-status', auth, userController.getFollowStatus);
router.put('/profile', auth, userController.updateProfile);

// Admin only routes
router.get('/admin/all', auth, requireRole(['admin', 'super_admin']), userController.getAllUsers);
router.delete('/:userId', auth, requireRole(['admin', 'super_admin']), userController.deleteUser);

module.exports = router;
