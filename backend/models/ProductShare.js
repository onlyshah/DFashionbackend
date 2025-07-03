const mongoose = require('mongoose');

const productShareSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  sharedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    platform: {
      type: String,
      enum: ['email', 'sms', 'whatsapp', 'facebook', 'twitter', 'instagram', 'telegram', 'copy_link', 'direct'],
      required: true
    },
    sharedAt: {
      type: Date,
      default: Date.now
    },
    viewed: {
      type: Boolean,
      default: false
    },
    viewedAt: Date,
    clicked: {
      type: Boolean,
      default: false
    },
    clickedAt: Date
  }],
  shareType: {
    type: String,
    enum: ['public', 'private', 'group'],
    default: 'private'
  },
  message: {
    type: String,
    trim: true,
    maxlength: 500
  },
  customNote: {
    type: String,
    trim: true,
    maxlength: 200
  },
  shareUrl: {
    type: String,
    required: true
  },
  shortUrl: {
    type: String,
    unique: true,
    sparse: true
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
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300
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
    }
  }],
  analytics: {
    totalShares: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    },
    totalClicks: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: Number,
      default: 0
    },
    platformBreakdown: {
      email: { type: Number, default: 0 },
      sms: { type: Number, default: 0 },
      whatsapp: { type: Number, default: 0 },
      facebook: { type: Number, default: 0 },
      twitter: { type: Number, default: 0 },
      instagram: { type: Number, default: 0 },
      telegram: { type: Number, default: 0 },
      copy_link: { type: Number, default: 0 },
      direct: { type: Number, default: 0 }
    }
  },
  metadata: {
    deviceType: String,
    platform: String,
    userAgent: String,
    ipAddress: String,
    location: {
      country: String,
      state: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    referrer: String
  },
  privacy: {
    isPublic: {
      type: Boolean,
      default: false
    },
    allowComments: {
      type: Boolean,
      default: true
    },
    allowLikes: {
      type: Boolean,
      default: true
    },
    showSharedBy: {
      type: Boolean,
      default: true
    }
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isReported: {
    type: Boolean,
    default: false
  },
  reportCount: {
    type: Number,
    default: 0
  },
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  }
}, {
  timestamps: true
});

// Indexes for better performance
productShareSchema.index({ product: 1, createdAt: -1 });
productShareSchema.index({ sharedBy: 1, createdAt: -1 });
productShareSchema.index({ shortUrl: 1 });
productShareSchema.index({ expiresAt: 1 });
productShareSchema.index({ 'sharedWith.platform': 1 });

// Virtual for total recipients
productShareSchema.virtual('recipientCount').get(function() {
  return this.sharedWith.length;
});

// Virtual for like count
productShareSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
productShareSchema.virtual('commentsCount').get(function() {
  return this.comments.length;
});

// Method to check if user liked the share
productShareSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Method to add like
productShareSchema.methods.addLike = function(userId) {
  if (!this.isLikedBy(userId)) {
    this.likes.push({ user: userId });
  }
};

// Method to remove like
productShareSchema.methods.removeLike = function(userId) {
  const likeIndex = this.likes.findIndex(like => like.user.toString() === userId.toString());
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
  }
};

// Method to add comment
productShareSchema.methods.addComment = function(userId, text) {
  this.comments.push({
    user: userId,
    text: text
  });
};

// Method to track view
productShareSchema.methods.trackView = function(platform, userId = null) {
  const shareIndex = this.sharedWith.findIndex(share => 
    share.platform === platform && 
    (userId ? share.user && share.user.toString() === userId.toString() : true)
  );
  
  if (shareIndex > -1 && !this.sharedWith[shareIndex].viewed) {
    this.sharedWith[shareIndex].viewed = true;
    this.sharedWith[shareIndex].viewedAt = new Date();
    this.analytics.totalViews += 1;
  }
};

// Method to track click
productShareSchema.methods.trackClick = function(platform, userId = null) {
  const shareIndex = this.sharedWith.findIndex(share => 
    share.platform === platform && 
    (userId ? share.user && share.user.toString() === userId.toString() : true)
  );
  
  if (shareIndex > -1 && !this.sharedWith[shareIndex].clicked) {
    this.sharedWith[shareIndex].clicked = true;
    this.sharedWith[shareIndex].clickedAt = new Date();
    this.analytics.totalClicks += 1;
    this.analytics.platformBreakdown[platform] += 1;
  }
};

// Pre-save middleware to update analytics
productShareSchema.pre('save', function(next) {
  this.analytics.totalShares = this.sharedWith.length;
  
  // Calculate conversion rate
  if (this.analytics.totalViews > 0) {
    this.analytics.conversionRate = (this.analytics.totalClicks / this.analytics.totalViews) * 100;
  }
  
  next();
});

// Static method to generate short URL
productShareSchema.statics.generateShortUrl = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Static method to get share analytics for a product
productShareSchema.statics.getProductShareAnalytics = async function(productId) {
  const result = await this.aggregate([
    { $match: { product: productId, isActive: true } },
    {
      $group: {
        _id: null,
        totalShares: { $sum: '$analytics.totalShares' },
        totalViews: { $sum: '$analytics.totalViews' },
        totalClicks: { $sum: '$analytics.totalClicks' },
        avgConversionRate: { $avg: '$analytics.conversionRate' }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : {
    totalShares: 0,
    totalViews: 0,
    totalClicks: 0,
    avgConversionRate: 0
  };
};

module.exports = mongoose.model('ProductShare', productShareSchema);
