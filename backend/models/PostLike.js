/**
 * 👍 PostLike Model
 * Tracks likes on posts with user and timestamp information
 * Used for social media engagement metrics
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostLikeSchema = new Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true
    },
    userId: {
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
    collection: 'postlikes'
  }
);

// Compound unique index - ensure one like per user per post
PostLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

// Index for fast retrieval of all likes for a post
PostLikeSchema.index({ postId: 1, createdAt: -1 });

// Index for finding all likes by a user
PostLikeSchema.index({ userId: 1, createdAt: -1 });

// Virtual to get like count (denormalized in Post model)
PostLikeSchema.virtual('likeCount').get(function() {
  if (this.likes && Array.isArray(this.likes)) {
    return this.likes.length;
  }
  return 0;
});

// Static method to add a like
PostLikeSchema.statics.addLike = async function(postId, userId) {
  try {
    const like = await this.findOneAndUpdate(
      { postId, userId },
      { postId, userId },
      { upsert: true, new: true }
    );
    return like;
  } catch (error) {
    throw new Error(`Error adding like: ${error.message}`);
  }
};

// Static method to remove a like
PostLikeSchema.statics.removeLike = async function(postId, userId) {
  try {
    const result = await this.findOneAndDelete({ postId, userId });
    return result;
  } catch (error) {
    throw new Error(`Error removing like: ${error.message}`);
  }
};

// Static method to get like count for a post
PostLikeSchema.statics.getLikeCount = async function(postId) {
  try {
    const count = await this.countDocuments({ postId });
    return count;
  } catch (error) {
    throw new Error(`Error getting like count: ${error.message}`);
  }
};

// Static method to check if user has liked a post
PostLikeSchema.statics.userHasLiked = async function(postId, userId) {
  try {
    const like = await this.findOne({ postId, userId });
    return !!like;
  } catch (error) {
    throw new Error(`Error checking like: ${error.message}`);
  }
};

// Static method to get all users who liked a post (with pagination)
PostLikeSchema.statics.getLikersByPost = async function(postId, page = 1, limit = 20) {
  try {
    const skip = (page - 1) * limit;
    const likes = await this.find({ postId })
      .populate('userId', 'username firstName lastName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await this.countDocuments({ postId });
    
    return {
      likes: likes.map(like => like.userId),
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  } catch (error) {
    throw new Error(`Error getting likers: ${error.message}`);
  }
};

// Pre-save validation
PostLikeSchema.pre('save', async function(next) {
  if (this.isNew && (!this.postId || !this.userId)) {
    return next(new Error('postId and userId are required'));
  }
  next();
});

module.exports = mongoose.model('PostLike', PostLikeSchema);
