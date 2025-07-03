const mongoose = require('mongoose');

const productCommentSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: 'Comment image'
    }
  }],
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  replies: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    likes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      likedAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  isPurchaseVerified: {
    type: Boolean,
    default: false
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  reportCount: {
    type: Number,
    default: 0
  },
  isReported: {
    type: Boolean,
    default: false
  },
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending'
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: Date,
  moderationReason: String,
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    replies: {
      type: Number,
      default: 0
    },
    helpfulVotes: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    deviceType: String,
    platform: String,
    location: {
      country: String,
      state: String,
      city: String
    },
    purchaseDate: Date,
    orderNumber: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    text: String,
    rating: Number,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
productCommentSchema.index({ product: 1, createdAt: -1 });
productCommentSchema.index({ user: 1, createdAt: -1 });
productCommentSchema.index({ rating: 1 });
productCommentSchema.index({ moderationStatus: 1 });
productCommentSchema.index({ isPurchaseVerified: 1 });

// Virtual for like count
productCommentSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

// Virtual for reply count
productCommentSchema.virtual('repliesCount').get(function() {
  return this.replies.length;
});

// Method to check if user liked the comment
productCommentSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Method to add like
productCommentSchema.methods.addLike = function(userId) {
  if (!this.isLikedBy(userId)) {
    this.likes.push({ user: userId });
    this.analytics.likes += 1;
  }
};

// Method to remove like
productCommentSchema.methods.removeLike = function(userId) {
  const likeIndex = this.likes.findIndex(like => like.user.toString() === userId.toString());
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
    this.analytics.likes -= 1;
  }
};

// Method to add reply
productCommentSchema.methods.addReply = function(userId, text) {
  this.replies.push({
    user: userId,
    text: text
  });
  this.analytics.replies += 1;
};

// Pre-save middleware to update analytics
productCommentSchema.pre('save', function(next) {
  if (this.isModified('likes')) {
    this.analytics.likes = this.likes.length;
  }
  if (this.isModified('replies')) {
    this.analytics.replies = this.replies.length;
  }
  next();
});

// Static method to get average rating for a product
productCommentSchema.statics.getAverageRating = async function(productId) {
  const result = await this.aggregate([
    { $match: { product: productId, isActive: true, moderationStatus: 'approved' } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  
  return result.length > 0 ? {
    average: Math.round(result[0].avgRating * 10) / 10,
    count: result[0].count
  } : { average: 0, count: 0 };
};

// Static method to get rating distribution
productCommentSchema.statics.getRatingDistribution = async function(productId) {
  const result = await this.aggregate([
    { $match: { product: productId, isActive: true, moderationStatus: 'approved' } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
    { $sort: { _id: -1 } }
  ]);
  
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  result.forEach(item => {
    distribution[item._id] = item.count;
  });
  
  return distribution;
};

module.exports = mongoose.model('ProductComment', productCommentSchema);
