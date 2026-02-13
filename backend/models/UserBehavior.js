const mongoose = require('mongoose');

// User behavior schema
const userBehaviorSchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true
  },
  userId: {
    type: Number,
    required: true,
    unique: true
  },
  interactions: {
    type: Array,
    default: []
  },
  viewedProducts: {
    type: Array,
    default: []
  },
  likedProducts: {
    type: Array,
    default: []
  },
  purchasedProducts: {
    type: Array,
    default: []
  },
  categories: {
    type: Object,
    default: {}
  },
  brands: {
    type: Object,
    default: {}
  },
  totalViews: {
    type: Number,
    default: 0
  },
  totalPurchases: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  preferredCategories: {
    type: Array,
    default: []
  },
  preferredBrands: {
    type: Array,
    default: []
  }
}, {
  timestamps: true
});

userBehaviorSchema.index({ id: 1 });

module.exports = mongoose.model('UserBehavior', userBehaviorSchema);
