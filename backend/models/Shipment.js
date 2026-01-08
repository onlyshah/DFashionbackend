const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  courier: String,
  trackingNumber: String,
  status: { type: String, enum: ['pending','labeled','picked','in_transit','out_for_delivery','delivered','failed'], default: 'pending' },
  awbNumber: String,
  labelUrl: String,
  pickupDate: Date,
  dispatchDate: Date,
  estimatedDeliveryDate: Date,
  actualDeliveryDate: Date,
  deliveryProof: { signature: Boolean, photo: String, notes: String },
  events: [{ status: String, timestamp: Date, location: String, description: String }],
  rto: { initiated: Boolean, reason: String, status: String, date: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Shipment', shipmentSchema);
