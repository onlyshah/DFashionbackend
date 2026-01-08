const mongoose = require('mongoose');

const shippingChargeSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  weightSlab: { min: Number, max: Number },
  charge: Number,
  zone: String
});

module.exports = mongoose.model('ShippingCharge', shippingChargeSchema);
