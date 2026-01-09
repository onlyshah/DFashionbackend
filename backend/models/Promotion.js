const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  type: {
    type: String,
    enum: ['percentage', 'fixed', 'bogo', 'tiered'],
    required: true,
  },
  code: {
    type: String,
    unique: true,
    sparse: true,
  },
  discountValue: {
    type: Number,
    required: true,
  },
  maxUses: Number,
  usedCount: {
    type: Number,
    default: 0,
  },
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
  applicableCategories: [String],
  minOrderValue: Number,
  maxDiscount: Number,
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active',
  },
  startDate: Date,
  endDate: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Promotion', promotionSchema);
