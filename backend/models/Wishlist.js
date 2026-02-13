const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true
  },
  userId: {
    type: Number,
    required: true
  },
  productId: {
    type: Number,
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

wishlistSchema.index({ id: 1 });

module.exports = mongoose.model('Wishlist', wishlistSchema);
