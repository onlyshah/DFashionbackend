const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ShipmentSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  shippingAddress: { type: Object, required: true },
  courierName: { type: String },
  trackingNumber: { type: String, unique: true, sparse: true, index: true },
  status: { type: String },
  estimatedDelivery: { type: Date },
  actualDelivery: { type: Date },
  shippingCost: { type: Number },
  weight: { type: Number },
  events: { type: Array }
}, { timestamps: true });

module.exports = mongoose.model('Shipment', ShipmentSchema);
