const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  caption: {
    type: String,
    required: true,
    maxlength: 2000
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    thumbnail: String, // For videos
    alt: String
  }],
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    position: {
      x: Number, // X coordinate percentage
      y: Number  // Y coordinate percentage
    },
    size: String,
    color: String
  }],
  hashtags: [String],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: {
      type: String,
      required: true,
      maxlength: 500
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    replies: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      text: {
        type: String,
        required: true,
        maxlength: 500
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  shares: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  saves: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    savedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  visibility: {
    type: String,
    enum: ['public', 'followers', 'private'],
    default: 'public'
  },
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
    productClicks: {
      type: Number,
      default: 0
    },
    purchases: {
      type: Number,
      default: 0
    }
  },
  settings: {
    allowComments: {
      type: Boolean,
      default: true
    },
    allowSharing: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Indexes
postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ isActive: 1, visibility: 1 });
postSchema.index({ createdAt: -1 });

// Virtual for like count
postSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
postSchema.virtual('commentsCount').get(function() {
  return this.comments.length;
});

// Virtual for share count
postSchema.virtual('sharesCount').get(function() {
  return this.shares.length;
});

// Virtual for save count
postSchema.virtual('savesCount').get(function() {
  return this.saves.length;
});

module.exports = mongoose.model('Post', postSchema);
