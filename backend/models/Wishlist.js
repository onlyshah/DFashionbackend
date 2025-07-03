const mongoose = require('mongoose');

const wishlistItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  size: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: {
    type: Number,
    min: 0
  },
  addedFrom: {
    type: String,
    enum: ['product', 'post', 'story', 'cart', 'manual'],
    default: 'manual'
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    maxlength: 500,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Social features for wishlist items
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
      maxlength: 1000,
      trim: true
    },
    commentedAt: {
      type: Date,
      default: Date.now
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date
    }
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  commentsCount: {
    type: Number,
    default: 0
  }
});

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [wishlistItemSchema],
  totalItems: {
    type: Number,
    default: 0
  },
  totalValue: {
    type: Number,
    default: 0
  },
  totalSavings: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    default: 'My Wishlist',
    maxlength: 100,
    trim: true
  },
  description: {
    type: String,
    maxlength: 500,
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  shareSettings: {
    allowComments: {
      type: Boolean,
      default: true
    },
    allowLikes: {
      type: Boolean,
      default: true
    },
    shareableLink: {
      type: String,
      unique: true,
      sparse: true
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
wishlistSchema.index({ user: 1 });
wishlistSchema.index({ 'items.product': 1 });
wishlistSchema.index({ lastUpdated: -1 });
wishlistSchema.index({ isPublic: 1 });
wishlistSchema.index({ 'shareSettings.shareableLink': 1 });

// Virtual for wishlist summary
wishlistSchema.virtual('summary').get(function() {
  return {
    totalItems: this.totalItems,
    totalValue: this.totalValue,
    totalSavings: this.totalSavings,
    itemCount: this.items.length
  };
});

// Method to calculate totals
wishlistSchema.methods.calculateTotals = function() {
  this.totalItems = this.items.length;
  this.totalValue = this.items.reduce((sum, item) => sum + item.price, 0);
  this.totalSavings = this.items.reduce((sum, item) => {
    const originalPrice = item.originalPrice || item.price;
    return sum + (originalPrice - item.price);
  }, 0);
  this.lastUpdated = new Date();
  return this;
};

// Method to add item to wishlist
wishlistSchema.methods.addItem = function(itemData) {
  const existingItemIndex = this.items.findIndex(item => 
    item.product.toString() === itemData.product.toString() &&
    item.size === itemData.size &&
    item.color === itemData.color
  );

  if (existingItemIndex > -1) {
    // Update existing item
    this.items[existingItemIndex].updatedAt = new Date();
    this.items[existingItemIndex].addedFrom = itemData.addedFrom || 'manual';
    this.items[existingItemIndex].notes = itemData.notes || this.items[existingItemIndex].notes;
  } else {
    // Add new item
    this.items.push({
      ...itemData,
      addedAt: new Date(),
      updatedAt: new Date()
    });
  }

  return this.calculateTotals();
};

// Method to remove item
wishlistSchema.methods.removeItem = function(itemId) {
  this.items.pull(itemId);
  return this.calculateTotals();
};

// Method to like an item
wishlistSchema.methods.likeItem = function(itemId, userId) {
  const item = this.items.id(itemId);
  if (item) {
    const existingLike = item.likes.find(like => like.user.toString() === userId.toString());
    if (!existingLike) {
      item.likes.push({ user: userId, likedAt: new Date() });
    }
  }
  return this;
};

// Method to unlike an item
wishlistSchema.methods.unlikeItem = function(itemId, userId) {
  const item = this.items.id(itemId);
  if (item) {
    item.likes = item.likes.filter(like => like.user.toString() !== userId.toString());
  }
  return this;
};

// Method to add comment to item
wishlistSchema.methods.addComment = function(itemId, userId, text) {
  const item = this.items.id(itemId);
  if (item) {
    item.comments.push({
      user: userId,
      text: text,
      commentedAt: new Date()
    });
  }
  return this;
};

// Method to remove comment from item
wishlistSchema.methods.removeComment = function(itemId, commentId, userId) {
  const item = this.items.id(itemId);
  if (item) {
    const comment = item.comments.id(commentId);
    if (comment && (comment.user.toString() === userId.toString() || this.user.toString() === userId.toString())) {
      item.comments.pull(commentId);
    }
  }
  return this;
};

// Method to update item
wishlistSchema.methods.updateItem = function(itemId, updateData) {
  const item = this.items.id(itemId);
  if (item) {
    Object.assign(item, updateData);
    item.updatedAt = new Date();
    this.calculateTotals();
  }
  return this;
};

// Method to like an item
wishlistSchema.methods.likeItem = function(itemId, userId) {
  const item = this.items.id(itemId);
  if (item) {
    const existingLike = item.likes.find(like => like.user.toString() === userId.toString());
    if (!existingLike) {
      item.likes.push({ user: userId });
      item.likesCount = item.likes.length;
    }
  }
  return this;
};

// Method to unlike an item
wishlistSchema.methods.unlikeItem = function(itemId, userId) {
  const item = this.items.id(itemId);
  if (item) {
    item.likes = item.likes.filter(like => like.user.toString() !== userId.toString());
    item.likesCount = item.likes.length;
  }
  return this;
};

// Method to add comment to item
wishlistSchema.methods.addComment = function(itemId, userId, text) {
  const item = this.items.id(itemId);
  if (item) {
    item.comments.push({
      user: userId,
      text: text,
      commentedAt: new Date()
    });
    item.commentsCount = item.comments.length;
  }
  return this;
};

// Method to remove comment from item
wishlistSchema.methods.removeComment = function(itemId, commentId, userId) {
  const item = this.items.id(itemId);
  if (item) {
    const comment = item.comments.id(commentId);
    if (comment && comment.user.toString() === userId.toString()) {
      item.comments.pull(commentId);
      item.commentsCount = item.comments.length;
    }
  }
  return this;
};

// Method to edit comment
wishlistSchema.methods.editComment = function(itemId, commentId, userId, newText) {
  const item = this.items.id(itemId);
  if (item) {
    const comment = item.comments.id(commentId);
    if (comment && comment.user.toString() === userId.toString()) {
      comment.text = newText;
      comment.isEdited = true;
      comment.editedAt = new Date();
    }
  }
  return this;
};

// Method to generate shareable link
wishlistSchema.methods.generateShareableLink = function() {
  if (!this.shareSettings.shareableLink) {
    this.shareSettings.shareableLink = `wishlist-${this.user}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
  return this.shareSettings.shareableLink;
};

// Pre-save middleware to calculate totals
wishlistSchema.pre('save', function(next) {
  if (this.isModified('items')) {
    this.calculateTotals();
  }
  next();
});

// Static method to find or create wishlist for user
wishlistSchema.statics.findOrCreateForUser = async function(userId, shouldPopulate = true) {
  let wishlist = await this.findOne({ user: userId });
  if (!wishlist) {
    wishlist = new this({ user: userId });
    await wishlist.save();
  }

  // Populate related data if requested
  if (shouldPopulate) {
    wishlist = await this.findById(wishlist._id)
      .populate({
        path: 'items.product',
        select: 'name images price originalPrice brand category isActive sizes colors vendor',
        populate: {
          path: 'vendor',
          select: 'username fullName vendorInfo.businessName'
        }
      })
      .populate({
        path: 'items.likes.user',
        select: 'username fullName avatar'
      })
      .populate({
        path: 'items.comments.user',
        select: 'username fullName avatar'
      });
  }

  return wishlist;
};

// Static method to find public wishlists
wishlistSchema.statics.findPublicWishlists = function(limit = 10, skip = 0) {
  return this.find({ isPublic: true })
    .populate('user', 'username fullName avatar')
    .populate('items.product', 'name images price brand')
    .sort({ lastUpdated: -1 })
    .limit(limit)
    .skip(skip);
};

module.exports = mongoose.model('Wishlist', wishlistSchema);
