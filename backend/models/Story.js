const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    trim: true,
    maxlength: 100
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Media Information
  media: {
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
    duration: {
      type: Number, // For videos in seconds
      max: 15 // Instagram stories max duration
    },
    size: Number, // file size in bytes
    resolution: {
      width: Number,
      height: Number
    }
  },

  // Content
  caption: {
    type: String,
    maxlength: 500
  },

  // Product Integration (E-commerce) - MANDATORY
  products: {
    type: [{
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
    position: {
      x: Number, // X coordinate percentage
      y: Number  // Y coordinate percentage
    },
    size: String, // Selected size
    color: String, // Selected color
    displayDuration: {
      type: Number,
      default: 3 // seconds to show product tag
    }
    }],
    validate: {
      validator: function(products) {
        return products && products.length > 0;
      },
      message: 'At least one product must be tagged in the story'
    }
  },

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
    username: String,
    position: {
      x: Number,
      y: Number
    }
  }],
  location: {
    name: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },

  // Story-specific Features
  backgroundColor: {
    type: String,
    default: '#000000'
  },
  textOverlay: {
    text: String,
    position: {
      x: Number,
      y: Number
    },
    style: {
      fontSize: Number,
      color: String,
      fontFamily: String
    }
  },
  stickers: [{
    type: {
      type: String,
      enum: ['emoji', 'gif', 'poll', 'question', 'music', 'location']
    },
    content: String,
    position: {
      x: Number,
      y: Number
    },
    size: Number
  }],

  // Privacy & Visibility
  visibility: {
    type: String,
    enum: ['public', 'followers', 'close_friends', 'private'],
    default: 'followers'
  },
  allowReplies: {
    type: Boolean,
    default: true
  },
  allowSharing: {
    type: Boolean,
    default: true
  },
  viewers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
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
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
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
    },
    visibility: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public'
    }
  }
}, {
  timestamps: true
});

// Indexes
storySchema.index({ user: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ isActive: 1 });

// Virtual for like count
storySchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

// Virtual for view count
storySchema.virtual('viewsCount').get(function() {
  return this.viewers.length;
});

// Virtual for share count
storySchema.virtual('sharesCount').get(function() {
  return this.shares.length;
});

module.exports = mongoose.model('Story', storySchema);
