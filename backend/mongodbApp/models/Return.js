const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReturnSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  orderItemId: { type: Schema.Types.ObjectId, ref: 'OrderItem', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['pending','approved','rejected','refunded'], default: 'pending' },
  refundAmount: { type: Number },
  returnDate: { type: Date, default: Date.now },
  approvedAt: { type: Date },
  refundedAt: { type: Date },
  images: [{ type: String }],
  adminNotes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Return', ReturnSchema);
