const express = require('express');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile/:username
// @desc    Get user profile
// @access  Public
router.get('/profile/:username', optionalAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password')
      .populate('followers', 'username fullName avatar')
      .populate('following', 'username fullName avatar');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

  // Add fallback for image/avatar
  const userObj = user.toObject();
  userObj.image = user.image || user.avatar || '/uploads/default-avatar.svg';
  res.json({ user: userObj });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/follow/:userId
// @desc    Follow/unfollow user
// @access  Private
router.post('/follow/:userId', auth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.user._id);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.params.userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    const isFollowing = currentUser.following.includes(req.params.userId);

    if (isFollowing) {
      // Unfollow
      currentUser.following.pull(req.params.userId);
      targetUser.followers.pull(req.user._id);
      currentUser.socialStats.followingCount -= 1;
      targetUser.socialStats.followersCount -= 1;
    } else {
      // Follow
      currentUser.following.push(req.params.userId);
      targetUser.followers.push(req.user._id);
      currentUser.socialStats.followingCount += 1;
      targetUser.socialStats.followersCount += 1;
    }

    await currentUser.save();
    await targetUser.save();

    res.json({
      success: true,
      message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully',
      isFollowing: !isFollowing,
      followersCount: targetUser.socialStats.followersCount,
      followingCount: currentUser.socialStats.followingCount
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:userId/followers
// @desc    Get user's followers
// @access  Public
router.get('/:userId/followers', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.params.userId)
      .populate({
        path: 'followers',
        select: 'username fullName avatar socialStats.followersCount',
        options: { skip, limit }
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const totalFollowers = await User.findById(req.params.userId).select('followers');

    res.json({
      success: true,
      followers: user.followers,
      pagination: {
        current: page,
        pages: Math.ceil(totalFollowers.followers.length / limit),
        total: totalFollowers.followers.length
      }
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:userId/following
// @desc    Get user's following
// @access  Public
router.get('/:userId/following', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.params.userId)
      .populate({
        path: 'following',
        select: 'username fullName avatar socialStats.followersCount',
        options: { skip, limit }
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const totalFollowing = await User.findById(req.params.userId).select('following');

    res.json({
      success: true,
      following: user.following,
      pagination: {
        current: page,
        pages: Math.ceil(totalFollowing.following.length / limit),
        total: totalFollowing.following.length
      }
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:userId/follow-status
// @desc    Check if current user follows target user
// @access  Private
router.get('/:userId/follow-status', auth, async (req, res) => {
  try {
    if (req.params.userId === req.user._id.toString()) {
      return res.json({
        success: true,
        isFollowing: false,
        isSelf: true
      });
    }

    const currentUser = await User.findById(req.user._id).select('following');
    const isFollowing = currentUser.following.includes(req.params.userId);

    res.json({
      success: true,
      isFollowing,
      isSelf: false
    });
  } catch (error) {
    console.error('Get follow status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
  const { fullName, bio, website, location, dateOfBirth, image } = req.body;

  const updateData = {};
  if (fullName) updateData.fullName = fullName;
  if (bio !== undefined) updateData.bio = bio;
  if (website !== undefined) updateData.website = website;
  if (location !== undefined) updateData.location = location;
  if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
  if (image !== undefined) updateData.image = image;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/users/suggested
// @desc    Get suggested users for sidebar
// @access  Public
router.get('/suggested', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    // Get suggested users (active users with good engagement)
    const suggestedUsers = await User.find({
      isActive: true,
      isVerified: true,
      role: 'customer'
    })
    .select('username fullName avatar bio socialStats')
    .sort({ 'socialStats.followersCount': -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

    // Transform data for frontend
    const transformedUsers = suggestedUsers.map(user => ({
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      image: user.image || user.avatar || '/uploads/default-avatar.svg',
      followedBy: `Followed by ${Math.floor(Math.random() * 50) + 10} others`,
      isFollowing: false
    }));

    const total = await User.countDocuments({
      isActive: true,
      isVerified: true,
      role: 'customer'
    });

    res.json({
      success: true,
      data: transformedUsers,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get suggested users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/users/influencers
// @desc    Get top fashion influencers
// @access  Public
router.get('/influencers', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const influencers = await User.find({
      isInfluencer: true,
      isActive: true,
      isVerified: true
    })
    .select('username fullName avatar bio socialStats isInfluencer')
    .sort({ 'socialStats.followersCount': -1, 'socialStats.postsCount': -1 })
    .skip(skip)
    .limit(limit);

    const total = await User.countDocuments({
      isInfluencer: true,
      isActive: true,
      isVerified: true
    });

    // Transform data for frontend
    const transformedInfluencers = influencers.map(influencer => ({
      id: influencer._id,
      username: influencer.username,
      fullName: influencer.fullName,
      avatar: influencer.avatar || '/uploadsdefault-avatar.svg',
      followersCount: influencer.socialStats?.followersCount || Math.floor(Math.random() * 100000) + 10000,
      postsCount: influencer.socialStats?.postsCount || Math.floor(Math.random() * 500) + 50,
      engagement: Math.floor(Math.random() * 15) + 5, // 5-20% engagement rate
      isFollowing: false
    }));

    res.json({
      success: true,
      data: transformedInfluencers,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get influencers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/users/liked-products
// @desc    Get user's liked products
// @access  Private
router.get('/liked-products', auth, async (req, res) => {
  try {
    const Product = require('../models/Product');

    const products = await Product.find({
      'likes.user': req.user._id,
      isActive: true
    })
    .select('_id name brand price images')
    .populate('vendor', 'username fullName')
    .sort({ 'likes.likedAt': -1 });

    res.json({
      success: true,
      data: products,
      message: 'Liked products retrieved successfully'
    });
  } catch (error) {
    console.error('Get liked products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get liked products',
      error: error.message
    });
  }
});

// @route   GET /api/users/liked-posts
// @desc    Get user's liked posts
// @access  Private
router.get('/liked-posts', auth, async (req, res) => {
  try {
    const Post = require('../models/Post');

    const posts = await Post.find({
      'likes.user': req.user._id,
      isActive: true
    })
    .select('_id caption media user createdAt')
    .populate('user', 'username fullName avatar')
    .sort({ 'likes.likedAt': -1 });

    res.json({
      success: true,
      data: posts,
      message: 'Liked posts retrieved successfully'
    });
  } catch (error) {
    console.error('Get liked posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get liked posts',
      error: error.message
    });
  }
});

// Import user management controller functions
const {
  getAllUsersForManagement,
  getCustomerData,
  getLimitedUserData
} = require('../controllers/userController');

// User Management Routes

// @route   GET /api/users/management/all
// @desc    Get all users with stats for management dashboard
// @access  Private/Admin
router.get('/management/all', auth, async (req, res) => {
  // Check if user has admin privileges
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  await getAllUsersForManagement(req, res);
});

// @route   GET /api/users/customer/:id/profile
// @desc    Get customer data for customer dashboard
// @access  Private
router.get('/customer/:id/profile', auth, async (req, res) => {
  await getCustomerData(req, res);
});

// @route   GET /api/users/management/limited/:role
// @desc    Get limited user data based on role
// @access  Private
router.get('/management/limited/:role', auth, async (req, res) => {
  await getLimitedUserData(req, res);
});

module.exports = router;
