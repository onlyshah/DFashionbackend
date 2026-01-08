const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{ productId: mongoose.Schema.Types.ObjectId, quantity: Number, reason: { type: String, enum: ['defective','wrongitem','changedmind','notasexpected','other'] }, description: String }],
  returnInitiatedAt: { type: Date, default: Date.now },
  returnDeadline: Date,
  status: { type: String, enum: ['requested','approved','rejected','shipped','received','completed'], default: 'requested' },
  returnShipmentId: String,
  returnType: { type: String, enum: ['return','replacement','refund'], default: 'refund' },
  refund: { amount: Number, method: { type: String, enum: ['original_payment','wallet','bank'] }, processedAt: Date, processedBy: mongoose.Schema.Types.ObjectId, referenceId: String },
  audits: [{ actor: mongoose.Schema.Types.ObjectId, action: String, timestamp: { type: Date, default: Date.now }, notes: String }]
});

module.exports = mongoose.model('Return', returnSchema);
