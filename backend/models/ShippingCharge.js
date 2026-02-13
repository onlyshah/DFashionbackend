const mongoose = require('mongoose');

const shippingChargeSchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  minWeight: {
    type: Number
  },
  maxWeight: {
    type: Number
  },
  minPrice: {
    type: Number
  },
  maxPrice: {
    type: Number
  },
  charge: {
    type: Number,
    required: true
  },
  courierId: {
    type: Number
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

shippingChargeSchema.index({ id: 1 });

module.exports = mongoose.model('ShippingCharge', shippingChargeSchema);
