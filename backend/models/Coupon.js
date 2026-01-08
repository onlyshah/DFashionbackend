const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ['percentage','flat_amount'], required: true },
  value: Number,
  minOrderValue: Number,
  maxDiscountAmount: Number,
  validFrom: Date,
  validUpto: Date,
  usageLimit: Number,
  usagePerCustomer: Number,
  applicableCategories: [String],
  applicableProducts: [String],
  usageCount: { type: Number, default: 0 },
  status: { type: String, enum: ['active','inactive','expired'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Coupon', couponSchema);
