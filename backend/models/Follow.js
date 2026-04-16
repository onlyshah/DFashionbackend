/**
 * 👥 Follow Model
 * Manages user following relationships for social features
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FollowSchema = new Schema(
  {
    followerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    followingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'follows'
  }
);

// Compound unique index - prevent duplicate follows
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

// Index for finding followers of a user
FollowSchema.index({ followingId: 1, createdAt: -1 });

// Index for finding users that a user is following
FollowSchema.index({ followerId: 1, createdAt: -1 });

// Static method to follow a user
FollowSchema.statics.followUser = async function(followerId, followingId) {
  try {
    if (followerId.toString() === followingId.toString()) {
      throw new Error('Cannot follow yourself');
    }

    const follow = await this.findOneAndUpdate(
      { followerId, followingId },
      { followerId, followingId },
      { upsert: true, new: true }
    );
    return follow;
  } catch (error) {
    throw new Error(`Error following user: ${error.message}`);
  }
};

// Static method to unfollow a user
FollowSchema.statics.unfollowUser = async function(followerId, followingId) {
  try {
    const result = await this.findOneAndDelete({ followerId, followingId });
    return result;
  } catch (error) {
    throw new Error(`Error unfollowing user: ${error.message}`);
  }
};

// Static method to check if user is following another
FollowSchema.statics.isFollowing = async function(followerId, followingId) {
  try {
    const follow = await this.findOne({ followerId, followingId });
    return !!follow;
  } catch (error) {
    throw new Error(`Error checking follow status: ${error.message}`);
  }
};

// Static method to get followers count
FollowSchema.statics.getFollowersCount = async function(userId) {
  try {
    const count = await this.countDocuments({ followingId: userId });
    return count;
  } catch (error) {
    throw new Error(`Error getting followers count: ${error.message}`);
  }
};

// Static method to get following count
FollowSchema.statics.getFollowingCount = async function(userId) {
  try {
    const count = await this.countDocuments({ followerId: userId });
    return count;
  } catch (error) {
    throw new Error(`Error getting following count: ${error.message}`);
  }
};

// Static method to get followers with pagination
FollowSchema.statics.getFollowers = async function(userId, page = 1, limit = 20) {
  try {
    const skip = (page - 1) * limit;
    
    const followers = await this.find({ followingId: userId })
      .populate('followerId', 'username firstName lastName avatar isVerified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await this.countDocuments({ followingId: userId });
    
    return {
      followers: followers.map(f => f.followerId),
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  } catch (error) {
    throw new Error(`Error getting followers: ${error.message}`);
  }
};

// Static method to get following list with pagination
FollowSchema.statics.getFollowing = async function(userId, page = 1, limit = 20) {
  try {
    const skip = (page - 1) * limit;
    
    const following = await this.find({ followerId: userId })
      .populate('followingId', 'username firstName lastName avatar isVerified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await this.countDocuments({ followerId: userId });
    
    return {
      following: following.map(f => f.followingId),
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  } catch (error) {
    throw new Error(`Error getting following list: ${error.message}`);
  }
};

// Pre-save validation
FollowSchema.pre('save', async function(next) {
  if (this.followerId.toString() === this.followingId.toString()) {
    return next(new Error('Cannot follow yourself'));
  }
  next();
});

module.exports = mongoose.model('Follow', FollowSchema);
