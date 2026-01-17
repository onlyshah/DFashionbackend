const mongoose = require('mongoose');

const inventoryHistorySchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  type: {
    type: String,
    enum: ['in', 'out', 'adjustment', 'receipt', 'sale', 'return', 'damage', 'expired'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  reference: {
    // Could be order ID, purchase order ID, etc.
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceType'
  },
  referenceType: {
    type: String,
    enum: ['Order', 'Purchase', 'Return'],
    default: 'Purchase'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for efficient queries
inventoryHistorySchema.index({ warehouse: 1, timestamp: -1 });
inventoryHistorySchema.index({ product: 1, warehouse: 1, timestamp: -1 });
inventoryHistorySchema.index({ type: 1, timestamp: -1 });

module.exports = mongoose.model('InventoryHistory', inventoryHistorySchema);
