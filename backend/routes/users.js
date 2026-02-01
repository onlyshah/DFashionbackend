const express = require('express');
const { auth, optionalAuth, allowResourceOwnerOrRoles } = require('../middleware/auth');
const { requirePermission } = require('../middleware/adminAuth');
const userController = require('../controllers/userController');

const router = express.Router();

// @route   GET /api/users/profile/:username
// @desc    Get user profile by username
// @access  Public
router.get('/profile/:username', optionalAuth, userController.getUserProfile);

// @route   POST /api/users/follow/:userId
// @desc    Follow/unfollow user
// @access  Private
router.post('/follow/:userId', auth, userController.toggleFollowUser);

// @route   GET /api/users/:userId/followers
// @desc    Get user's followers
// @access  Public
router.get('/:userId/followers', userController.getFollowers);

// @route   GET /api/users/:userId/following
// @desc    Get user's following list
// @access  Public
router.get('/:userId/following', userController.getFollowing);

// @route   GET /api/users/:userId/follow-status
// @desc    Check follow status between current and target user
// @access  Private
router.get('/:userId/follow-status', auth, userController.getFollowStatus);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, userController.updateProfile);

// @route   GET /api/users/suggested
// @desc    Get suggested users for sidebar
// @access  Public
router.get('/suggested', userController.getSuggestedUsers);

// @route   GET /api/users/influencers
// @desc    Get top fashion influencers
// @access  Public
router.get('/influencers', userController.getInfluencers);

// @route   GET /api/users/liked-products
// @desc    Get user's liked products
// @access  Private
router.get('/liked-products', auth, userController.getLikedProducts);

// @route   GET /api/users/liked-posts
// @desc    Get user's liked posts
// @access  Private
router.get('/liked-posts', auth, userController.getLikedPosts);

// @route   GET /api/users/management/all
// @desc    Get all users with stats for management dashboard
// @access  Private/Admin
router.get('/management/all', auth, requirePermission('users', 'view'), userController.getAllUsersForManagement);

// @route   GET /api/users/customer/:id/profile
// @desc    Get customer data for customer dashboard
// @access  Private (owner or admin)
router.get('/customer/:id/profile', auth, allowResourceOwnerOrRoles('User', 'id', '_id', ['admin', 'super_admin']), userController.getCustomerData);

// @route   GET /api/users/management/limited/:role
// @desc    Get limited user data based on role
// @access  Private
router.get('/management/limited/:role', auth, requirePermission('users', 'view'), userController.getLimitedUserData);

module.exports = router;