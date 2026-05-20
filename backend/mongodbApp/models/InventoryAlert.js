const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InventoryAlertSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  alertType: { type: String },
  currentQuantity: { type: Number },
  thresholdQuantity: { type: Number },
  isResolved: { type: Boolean, default: false },
  resolvedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('InventoryAlert', InventoryAlertSchema);
