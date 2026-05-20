const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ShippingChargeSchema = new Schema({
  courier: {
    type: Schema.Types.ObjectId,
    ref: 'Courier',
    required: true,
    index: true
  },
  serviceType: {
    type: String,
    enum: ['standard', 'express', 'overnight', 'same_day', 'scheduled', 'bulk'],
    required: true
  },
  fromRegion: {
    type: String,
    required: true
  },
  toRegion: {
    type: String,
    required: true
  },
  minWeight: {
    type: Number,
    default: 0
  },
  maxWeight: {
    type: Number,
    default: null
  },
  baseCharge: {
    type: Number,
    required: true
  },
  chargePerKg: {
    type: Number,
    default: 0
  },
  chargePerKm: {
    type: Number,
    default: 0
  },
  estimatedDays: {
    type: Number,
    default: 3
  },
  insurance: {
    included: { type: Boolean, default: false },
    chargePercentage: { type: Number, default: 0 }
  },
  cod: {
    allowed: { type: Boolean, default: true },
    chargePercentage: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  effectiveFrom: {
    type: Date,
    default: Date.now
  },
  effectiveTo: {
    type: Date,
    default: null
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, { timestamps: true });

// Create index for efficient lookup
ShippingChargeSchema.index({ courier: 1, serviceType: 1, fromRegion: 1, toRegion: 1 });

module.exports = mongoose.model('ShippingCharge', ShippingChargeSchema);
