const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  minimumLevel: {
    type: Number,
    default: 10
  },
  maximumLevel: {
    type: Number,
    default: 1000
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastMovement: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Index for common queries
inventorySchema.index({ warehouse: 1, status: 1 });
inventorySchema.index({ product: 1, warehouse: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
