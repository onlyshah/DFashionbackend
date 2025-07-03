const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
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
    enum: ['product', 'post', 'story', 'wishlist', 'manual'],
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
  isAvailable: {
    type: Boolean,
    default: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  savedForLater: [cartItemSchema],
  totalItems: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  totalOriginalAmount: {
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
  isActive: {
    type: Boolean,
    default: true
  },
  sessionId: {
    type: String,
    sparse: true
  },
  metadata: {
    deviceInfo: String,
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true
});

// Indexes for better performance
cartSchema.index({ user: 1 });
cartSchema.index({ 'items.product': 1 });
cartSchema.index({ lastUpdated: -1 });
cartSchema.index({ isActive: 1 });

// Virtual for cart summary
cartSchema.virtual('summary').get(function() {
  return {
    totalItems: this.totalItems,
    totalAmount: this.totalAmount,
    total: this.totalAmount, // Add this for frontend compatibility
    totalSavings: this.totalSavings,
    itemCount: this.items.length,
    subtotal: this.totalOriginalAmount || this.totalAmount,
    discount: this.totalSavings || 0
  };
});

// Method to calculate totals
cartSchema.methods.calculateTotals = function() {
  this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.totalAmount = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  this.totalOriginalAmount = this.items.reduce((sum, item) => {
    const originalPrice = item.originalPrice || item.price;
    return sum + (originalPrice * item.quantity);
  }, 0);
  this.totalSavings = this.totalOriginalAmount - this.totalAmount;
  this.lastUpdated = new Date();
  return this;
};

// Method to add item to cart
cartSchema.methods.addItem = function(itemData) {
  const existingItemIndex = this.items.findIndex(item => 
    item.product.toString() === itemData.product.toString() &&
    item.size === itemData.size &&
    item.color === itemData.color
  );

  if (existingItemIndex > -1) {
    // Update existing item
    this.items[existingItemIndex].quantity += itemData.quantity || 1;
    this.items[existingItemIndex].updatedAt = new Date();
    this.items[existingItemIndex].addedFrom = itemData.addedFrom || 'manual';
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

// Method to update item quantity
cartSchema.methods.updateItemQuantity = function(itemId, quantity) {
  const item = this.items.id(itemId);
  if (item) {
    if (quantity <= 0) {
      this.items.pull(itemId);
    } else {
      item.quantity = quantity;
      item.updatedAt = new Date();
    }
    this.calculateTotals();
  }
  return this;
};

// Method to remove item
cartSchema.methods.removeItem = function(itemId) {
  this.items.pull(itemId);
  return this.calculateTotals();
};

// Method to clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  return this.calculateTotals();
};

// Method to save item for later
cartSchema.methods.saveForLater = function(itemId) {
  const itemIndex = this.items.findIndex(item => item._id.toString() === itemId.toString());
  if (itemIndex > -1) {
    const item = this.items[itemIndex];
    this.savedForLater.push(item);
    this.items.splice(itemIndex, 1);
    this.calculateTotals();
  }
  return this;
};

// Method to move item back to cart
cartSchema.methods.moveToCart = function(itemId) {
  const itemIndex = this.savedForLater.findIndex(item => item._id.toString() === itemId.toString());
  if (itemIndex > -1) {
    const item = this.savedForLater[itemIndex];
    this.items.push(item);
    this.savedForLater.splice(itemIndex, 1);
    this.calculateTotals();
  }
  return this;
};

// Method to remove from saved for later
cartSchema.methods.removeFromSaved = function(itemId) {
  this.savedForLater.pull(itemId);
  return this;
};

// Method to get items by vendor
cartSchema.methods.getItemsByVendor = function() {
  const vendorGroups = {};
  this.items.forEach(item => {
    const vendorId = item.vendor?.toString() || 'unknown';
    if (!vendorGroups[vendorId]) {
      vendorGroups[vendorId] = [];
    }
    vendorGroups[vendorId].push(item);
  });
  return vendorGroups;
};

// Pre-save middleware to calculate totals
cartSchema.pre('save', function(next) {
  if (this.isModified('items')) {
    this.calculateTotals();
  }
  next();
});

// Static method to find or create cart for user
cartSchema.statics.findOrCreateForUser = async function(userId, shouldPopulate = true) {
  let cart = await this.findOne({ user: userId, isActive: true });
  if (!cart) {
    cart = new this({ user: userId });
    await cart.save();
  }

  // Populate related data if requested
  if (shouldPopulate) {
    cart = await this.findById(cart._id)
      .populate({
        path: 'items.product',
        select: 'name images price originalPrice brand category isActive sizes colors vendor',
        populate: {
          path: 'vendor',
          select: 'username fullName vendorInfo.businessName'
        }
      });
  }

  return cart;
};

// Static method to cleanup old inactive carts
cartSchema.statics.cleanupOldCarts = async function(daysOld = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return this.deleteMany({
    isActive: false,
    lastUpdated: { $lt: cutoffDate }
  });
};

module.exports = mongoose.model('Cart', cartSchema);
