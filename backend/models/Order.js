const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  id: {
    type: Number,
    index: true
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    maxlength: 50
  },
  customerId: {
    type: Number,
    required: true
  },
  userId: {
    type: Number
  },
  items: {
    type: Array,
    default: []
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    maxlength: 50
  },
  shippingAddress: {
    type: mongoose.Schema.Types.Mixed
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

orderSchema.index({ id: 1 });

module.exports = mongoose.model('Order', orderSchema);
