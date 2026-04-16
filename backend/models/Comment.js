/**
 * 💬 Comment Model (Enhanced)
 * Stores comments on posts with nested reply support
 * Supports threaded conversations and engagement metrics
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema(
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
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 1000
    },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    },
    mentions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        username: String
      }
    ],
    likes: {
      type: Number,
      default: 0,
      min: 0
    },
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
      }
    ],
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date,
    authorDetails: {
      _id: mongoose.Schema.Types.ObjectId,
      username: String,
      firstName: String,
      lastName: String,
      avatar: String,
      isVerified: Boolean
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    collection: 'comments',
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
CommentSchema.index({ postId: 1, createdAt: -1 });
CommentSchema.index({ userId: 1, createdAt: -1 });
CommentSchema.index({ parentCommentId: 1 });
CommentSchema.index({ 'mentions.userId': 1 });
CommentSchema.index({ isDeleted: 1, postId: 1 });

// Virtual for reply count
CommentSchema.virtual('replyCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

// Virtual for comment depth (for threaded display)
CommentSchema.virtual('isReply').get(function() {
  return !!this.parentCommentId;
});

// Static method to create a comment
CommentSchema.statics.createComment = async function(postId, userId, text, authorDetails, parentCommentId = null) {
  try {
    const comment = new this({
      postId,
      userId,
      text,
      authorDetails,
      parentCommentId
    });
    await comment.save();
    return comment;
  } catch (error) {
    throw new Error(`Error creating comment: ${error.message}`);
  }
};

// Static method to update a comment
CommentSchema.statics.updateComment = async function(commentId, text) {
  try {
    const comment = await this.findByIdAndUpdate(
      commentId,
      {
        text,
        isEdited: true,
        editedAt: new Date()
      },
      { new: true }
    );
    return comment;
  } catch (error) {
    throw new Error(`Error updating comment: ${error.message}`);
  }
};

// Static method to soft delete a comment
CommentSchema.statics.deleteComment = async function(commentId) {
  try {
    const comment = await this.findByIdAndUpdate(
      commentId,
      {
        isDeleted: true,
        deletedAt: new Date(),
        text: '[deleted]'
      },
      { new: true }
    );
    return comment;
  } catch (error) {
    throw new Error(`Error deleting comment: ${error.message}`);
  }
};

// Static method to get comments for a post (with pagination)
CommentSchema.statics.getCommentsByPost = async function(postId, page = 1, limit = 20, includeDeleted = false) {
  try {
    const skip = (page - 1) * limit;
    
    const query = {
      postId,
      parentCommentId: null // Get only top-level comments
    };
    
    if (!includeDeleted) {
      query.isDeleted = false;
    }
    
    const comments = await this.find(query)
      .populate('userId', 'username firstName lastName avatar isVerified')
      .populate('replies')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await this.countDocuments(query);
    
    return {
      comments,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  } catch (error) {
    throw new Error(`Error getting comments: ${error.message}`);
  }
};

// Static method to get replies to a comment
CommentSchema.statics.getReplies = async function(commentId, page = 1, limit = 10) {
  try {
    const skip = (page - 1) * limit;
    
    const replies = await this.find({
      parentCommentId: commentId,
      isDeleted: false
    })
      .populate('userId', 'username firstName lastName avatar isVerified')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await this.countDocuments({ parentCommentId: commentId, isDeleted: false });
    
    return {
      replies,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  } catch (error) {
    throw new Error(`Error getting replies: ${error.message}`);
  }
};

// Static method to add like to a comment
CommentSchema.statics.likeComment = async function(commentId) {
  try {
    const comment = await this.findByIdAndUpdate(
      commentId,
      { $inc: { likes: 1 } },
      { new: true }
    );
    return comment;
  } catch (error) {
    throw new Error(`Error liking comment: ${error.message}`);
  }
};

// Static method to remove like from a comment
CommentSchema.statics.unlikeComment = async function(commentId) {
  try {
    const comment = await this.findByIdAndUpdate(
      commentId,
      { $inc: { likes: -1 }, $max: { likes: 0 } },
      { new: true }
    );
    return comment;
  } catch (error) {
    throw new Error(`Error unliking comment: ${error.message}`);
  }
};

// Pre-save middleware to validate
CommentSchema.pre('save', async function(next) {
  if (!this.text || this.text.trim().length === 0) {
    return next(new Error('Comment text cannot be empty'));
  }
  
  if (!this.postId || !this.userId) {
    return next(new Error('postId and userId are required'));
  }
  
  next();
});

// Pre-remove middleware
CommentSchema.pre('remove', async function(next) {
  try {
    // If this is a parent comment, delete all its replies
    if (!this.parentCommentId) {
      await this.model('Comment').deleteMany({ parentCommentId: this._id });
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Comment', CommentSchema);
