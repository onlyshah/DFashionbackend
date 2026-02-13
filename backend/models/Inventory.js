const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true
  },
  productId: {
    type: Number,
    required: true
  },
  warehouseId: {
    type: Number,
    required: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    maxlength: 100
  },
  quantity: {
    type: Number,
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
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  },
  notes: {
    type: String
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastMovement: {
    type: Date
  }
}, { timestamps: true });

inventorySchema.index({ id: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
