const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true
  },
  userId: {
    type: Number,
    required: true
  },
  items: {
    type: Array,
    default: []
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  totalQuantity: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

cartSchema.index({ id: 1 });

module.exports = mongoose.model('Cart', cartSchema);
