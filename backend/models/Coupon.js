const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    maxlength: 50
  },
  description: {
    type: String
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  discountValue: {
    type: Number,
    required: true
  },
  minPurchase: {
    type: Number,
    default: 0
  },
  maxDiscount: {
    type: Number
  },
  usageLimit: {
    type: Number
  },
  usageCount: {
    type: Number,
    default: 0
  },
  validFrom: {
    type: Date
  },
  validUntil: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

couponSchema.index({ id: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
