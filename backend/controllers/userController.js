const bcrypt = require('bcryptjs');
const ServiceLoader = require('../services/ServiceLoader');
const userService = ServiceLoader.loadService('userService');

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      role = '',
      department = '',
      isActive = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filters = {};
    if (search) filters.search = search;
    if (role) filters.role = role;
    if (department) filters.department = department;
    if (isActive !== '') filters.isActive = isActive === 'true';

    // Call service layer
    const result = await userService.getAllUsers(filters, parseInt(page), parseInt(limit));

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to fetch users'
      });
    }

    res.json({
      success: true,
      data: {
        users: result.data,
        pagination: result.pagination
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
  try {
    const result = await userService.getUserById(req.params.id);

    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user: result.data }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
};

// @desc    Create user (Admin only)
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      fullName,
      role,
      department,
      employeeId,
      permissions,
      isActive = true
    } = req.body;

    // Validation
    if (!username || !email || !password || !fullName || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    // Create user
    const userData = {
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      fullName,
      role,
      isActive,
      isVerified: true // Admin created users are auto-verified
    };

    // Add admin-specific fields
    if (role !== 'customer') {
      userData.department = department;
      userData.employeeId = employeeId;
      userData.permissions = permissions || [];
    }

    const user = new User(userData);
    await user.save();

    // Return user without password
    const userResponse = await User.findById(user._id).select('-password');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: userResponse }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Remove sensitive fields that shouldn't be updated this way
    delete updateData.password;
    delete updateData._id;
    delete updateData.__v;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check permissions (users can only update themselves unless admin)
    if (req.user.userId !== id && !['admin', 'sales', 'marketing'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user'
      });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting super admin
    if (user.role === 'admin' && user.email === 'superadmin@dfashion.com') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete super admin account'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

// @desc    Block/Unblock user (Admin only)
// @route   PUT /api/users/:id/block
// @access  Private/Admin
const toggleUserBlock = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent blocking super admin
    if (user.role === 'admin' && user.email === 'superadmin@dfashion.com') {
      return res.status(400).json({
        success: false,
        message: 'Cannot block super admin account'
      });
    }

    // Toggle active status
    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'unblocked' : 'blocked'} successfully`,
      data: { user: { id: user._id, isActive: user.isActive } }
    });

  } catch (error) {
    console.error('Toggle user block error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
};

// @desc    Update user permissions (Super Admin only)
// @route   PUT /api/users/:id/permissions
// @access  Private/SuperAdmin
const updateUserPermissions = async (req, res) => {
  try {
    const { permissions } = req.body;

    // Only super admin can update permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can update permissions'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.permissions = permissions;
    await user.save();

    res.json({
      success: true,
      message: 'User permissions updated successfully',
      data: { user: { id: user._id, permissions: user.permissions } }
    });

  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update permissions'
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private/Admin
const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });
    const verifiedUsers = await User.countDocuments({ isVerified: true });

    // Users by role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.json({
      success: true,
      data: {
        overview: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          verified: verifiedUsers,
          recent: recentUsers
        },
        byRole: usersByRole
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
};

// @desc    Get all users with stats for management (Super Admin/Admin)
// @route   GET /api/users/management/all
// @access  Private/Admin
const getAllUsersForManagement = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      role = '',
      status = '',
      department = ''
    } = req.query;

    // Build filter
    const filter = {};

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) filter.role = role;
    if (department) filter.department = department;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get users
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get stats
    const totalUsers = await User.countDocuments(filter);
    const activeUsers = await User.countDocuments({ ...filter, isActive: true });

    // Get new users this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newUsersThisMonth = await User.countDocuments({
      ...filter,
      createdAt: { $gte: startOfMonth }
    });

    // Get users by role
    const usersByRole = await User.aggregate([
      { $match: filter },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const usersByRoleObj = {};
    usersByRole.forEach(item => {
      usersByRoleObj[item._id] = item.count;
    });

    const stats = {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      newUsersThisMonth,
      usersByRole: usersByRoleObj
    };

    res.json({
      success: true,
      data: { users, stats },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalUsers,
        pages: Math.ceil(totalUsers / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get all users for management error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users data'
    });
  }
};

// @desc    Get customer data for customer dashboard
// @route   GET /api/users/customer/:id/profile
// @access  Private/Customer
const getCustomerData = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user can access this data
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get customer basic data
    const customer = await User.findById(id).select('-password');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Customer object with initialized stats
    const customerWithStats = {
      ...customer.toObject(),
      totalOrders: 0,
      totalSpent: 0,
      wishlistCount: 0,
      cartCount: 0
    };

    const stats = {
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      lastOrderDate: null
    };

    res.json({
      success: true,
      data: {
        customer: customerWithStats,
        orderHistory: [],
        stats
      }
    });

  } catch (error) {
    console.error('Get customer data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer data'
    });
  }
};

// @desc    Get limited user data based on role
// @route   GET /api/users/management/limited/:role
// @access  Private
const getLimitedUserData = async (req, res) => {
  try {
    const { role } = req.params;
    const userRole = req.user.role;

    let filter = {};
    let projection = { password: 0 };

    // Define what each role can see
    switch (userRole) {
      case 'manager':
        // Managers can see users in their department
        filter = { department: req.user.department };
        break;
      case 'vendor':
        // Vendors can only see their own data
        filter = { _id: req.user._id };
        break;
      default:
        // Other roles get minimal data
        filter = { _id: req.user._id };
    }

    const users = await User.find(filter, projection)
      .sort({ createdAt: -1 })
      .limit(10);

    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive).length,
      newUsersThisMonth: 0,
      usersByRole: {}
    };

    res.json({
      success: true,
      data: { users, stats }
    });

  } catch (error) {
    console.error('Get limited user data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user data'
    });
  }
};

/**
 * Get user profile by username
 */
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password')
      .populate('followers', 'username fullName avatar')
      .populate('following', 'username fullName avatar');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userObj = user.toObject();
    userObj.image = user.image || user.avatar || '/uploads/default-avatar.svg';

    res.json({
      success: true,
      user: userObj
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Follow/unfollow user
 */
const toggleFollowUser = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.user._id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (req.params.userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot follow yourself'
      });
    }

    const isFollowing = currentUser.following.includes(req.params.userId);

    if (isFollowing) {
      currentUser.following.pull(req.params.userId);
      targetUser.followers.pull(req.user._id);
      currentUser.socialStats.followingCount -= 1;
      targetUser.socialStats.followersCount -= 1;
    } else {
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
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get user's followers
 */
const getFollowers = async (req, res) => {
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
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
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
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get user's following list
 */
const getFollowing = async (req, res) => {
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
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
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
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Check follow status
 */
const getFollowStatus = async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
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
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
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
};

/**
 * Get suggested users
 */
const getSuggestedUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    const suggestedUsers = await User.find({
      isActive: true,
      isVerified: true,
      role: 'customer'
    })
      .select('username fullName avatar bio socialStats')
      .sort({ 'socialStats.followersCount': -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

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
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get top influencers
 */
const getInfluencers = async (req, res) => {
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

    const transformedInfluencers = influencers.map(influencer => ({
      id: influencer._id,
      username: influencer.username,
      fullName: influencer.fullName,
      avatar: influencer.avatar || '/uploads/default-avatar.svg',
      followersCount: influencer.socialStats?.followersCount || Math.floor(Math.random() * 100000) + 10000,
      postsCount: influencer.socialStats?.postsCount || Math.floor(Math.random() * 500) + 50,
      engagement: Math.floor(Math.random() * 15) + 5,
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
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get user's liked products
 */
const getLikedProducts = async (req, res) => {
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
};

/**
 * Get user's liked posts
 */
const getLikedPosts = async (req, res) => {
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
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserBlock,
  updateUserPermissions,
  getUserStats,
  getAllUsersForManagement,
  getCustomerData,
  getLimitedUserData,
  getUserProfile,
  toggleFollowUser,
  getFollowers,
  getFollowing,
  getFollowStatus,
  updateProfile,
  getSuggestedUsers,
  getInfluencers,
  getLikedProducts,
  getLikedPosts
};
