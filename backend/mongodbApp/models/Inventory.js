const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InventorySchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  quantity: { type: Number, required: true, default: 0 },
  reserved: { type: Number, default: 0 },
  warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  reorderLevel: { type: Number },
  reorderQuantity: { type: Number },
  lastRestockedAt: { type: Date }
}, { timestamps: true });

InventorySchema.virtual('available').get(function() { return this.quantity - this.reserved; });

module.exports = mongoose.model('Inventory', InventorySchema);
