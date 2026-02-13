const mongoose = require('mongoose');

const flashSaleSchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 200
  },
  title: {
    type: String,
    maxlength: 200
  },
  description: {
    type: String
  },
  discountPercentage: {
    type: Number,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  products: {
    type: Array,
    default: []
  },
  categories: {
    type: Array,
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

flashSaleSchema.index({ id: 1 });

module.exports = mongoose.model('FlashSale', flashSaleSchema);
