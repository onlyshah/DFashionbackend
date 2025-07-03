const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // User Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Media Information
  media: {
    type: {
      type: String,
      enum: ['video'],
      default: 'video',
      required: true
    },
    url: {
      type: String,
      required: true
    },
    thumbnail: {
      type: String,
      required: true
    },
    duration: {
      type: Number, // in seconds
      required: true,
      min: 1,
      max: 90 // Instagram reels max duration
    },
    size: {
      type: Number // file size in bytes
    },
    resolution: {
      width: Number,
      height: Number
    }
  },
  
  // Product Integration (E-commerce)
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    position: {
      x: Number, // percentage from left
      y: Number, // percentage from top
      timestamp: Number // when to show in video (seconds)
    },
    displayDuration: {
      type: Number,
      default: 3 // seconds to show product tag
    }
  }],
  
  // Instagram-style Features
  hashtags: [{
    type: String,
    trim: true
  }],
  mentions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String
  }],
  location: {
    name: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // Privacy & Visibility
  visibility: {
    type: String,
    enum: ['public', 'followers', 'private'],
    default: 'public'
  },
  allowComments: {
    type: Boolean,
    default: true
  },
  allowSharing: {
    type: Boolean,
    default: true
  },
  
  // Engagement Analytics
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    saves: {
      type: Number,
      default: 0
    },
    reach: {
      type: Number,
      default: 0
    },
    impressions: {
      type: Number,
      default: 0
    }
  },
  
  // User Interactions
  likedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  savedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    savedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Content Moderation
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'reported', 'removed'],
    default: 'published'
  },
  moderationFlags: [{
    type: {
      type: String,
      enum: ['inappropriate', 'spam', 'copyright', 'violence', 'other']
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reportedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],
  
  // Algorithm & Discovery
  trending: {
    score: {
      type: Number,
      default: 0
    },
    lastCalculated: {
      type: Date,
      default: Date.now
    }
  },
  featured: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  publishedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
reelSchema.index({ user: 1, createdAt: -1 });
reelSchema.index({ status: 1, createdAt: -1 });
reelSchema.index({ hashtags: 1 });
reelSchema.index({ 'analytics.views': -1 });
reelSchema.index({ 'analytics.likes': -1 });
reelSchema.index({ 'trending.score': -1 });
reelSchema.index({ featured: 1, createdAt: -1 });
reelSchema.index({ visibility: 1, status: 1, createdAt: -1 });

// Virtual for engagement rate
reelSchema.virtual('engagementRate').get(function() {
  if (this.analytics.views === 0) return 0;
  const totalEngagement = this.analytics.likes + this.analytics.comments + this.analytics.shares;
  return (totalEngagement / this.analytics.views) * 100;
});

// Pre-save middleware
reelSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Methods
reelSchema.methods.incrementView = function() {
  this.analytics.views += 1;
  this.analytics.impressions += 1;
  return this.save();
};

reelSchema.methods.toggleLike = function(userId) {
  const existingLike = this.likedBy.find(like => like.user.toString() === userId.toString());
  
  if (existingLike) {
    this.likedBy.pull({ _id: existingLike._id });
    this.analytics.likes = Math.max(0, this.analytics.likes - 1);
  } else {
    this.likedBy.push({ user: userId });
    this.analytics.likes += 1;
  }
  
  return this.save();
};

reelSchema.methods.toggleSave = function(userId) {
  const existingSave = this.savedBy.find(save => save.user.toString() === userId.toString());
  
  if (existingSave) {
    this.savedBy.pull({ _id: existingSave._id });
    this.analytics.saves = Math.max(0, this.analytics.saves - 1);
  } else {
    this.savedBy.push({ user: userId });
    this.analytics.saves += 1;
  }
  
  return this.save();
};

module.exports = mongoose.model('Reel', reelSchema);
