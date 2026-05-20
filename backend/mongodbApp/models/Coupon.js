const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CouponSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, index: true },
  description: { type: String },
  discountType: { type: String, enum: ['percentage','fixed'], required: true },
  discountValue: { type: Number, required: true },
  maxDiscountAmount: { type: Number },
  minOrderAmount: { type: Number, default: 0 },
  maxUses: { type: Number },
  usedCount: { type: Number, default: 0 },
  usedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  validFrom: { type: Date, required: true },
  validTo: { type: Date, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', CouponSchema);
