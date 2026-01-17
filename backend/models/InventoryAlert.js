const mongoose = require('mongoose');

const inventoryAlertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['critical', 'warning', 'info'],
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  status: {
    type: String,
    enum: ['pending', 'acknowledged', 'resolved'],
    default: 'pending'
  },
  message: {
    type: String,
    required: true
  },
  currentQuantity: {
    type: Number,
    default: 0
  },
  minimumLevel: {
    type: Number,
    default: 10
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acknowledgedAt: Date,
  resolvedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
inventoryAlertSchema.index({ status: 1, createdAt: -1 });
inventoryAlertSchema.index({ product: 1 });
inventoryAlertSchema.index({ warehouse: 1 });

module.exports = mongoose.model('InventoryAlert', inventoryAlertSchema);
