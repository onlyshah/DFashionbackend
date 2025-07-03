const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    size: String,
    color: String
  }],
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
    enum: ['card', 'upi', 'netbanking', 'wallet', 'cod'],
    required: true
  },
  shippingAddress: {
    fullName: String,
    phone: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  billingAddress: {
    fullName: String,
    phone: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  expectedDelivery: Date,
  actualDelivery: Date,
  trackingNumber: String,
  notes: String,
  discount: {
    amount: { type: Number, default: 0 },
    couponCode: String,
    type: { type: String, enum: ['percentage', 'fixed'] }
  },
  tax: {
    amount: { type: Number, default: 0 },
    rate: { type: Number, default: 0 }
  },
  shipping: {
    amount: { type: Number, default: 0 },
    method: String,
    provider: String
  },
  refund: {
    amount: Number,
    reason: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'processed'] },
    processedAt: Date,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminNotes: String,
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ vendor: 1, createdAt: -1 });

// Virtual for order total with tax and shipping
orderSchema.virtual('finalAmount').get(function() {
  return this.totalAmount + this.tax.amount + this.shipping.amount - this.discount.amount;
});

// Method to generate order number
orderSchema.statics.generateOrderNumber = function() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `DF${timestamp.slice(-6)}${random}`;
};

// Method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function() {
  return ['pending', 'confirmed'].includes(this.status);
};

// Method to check if order can be refunded
orderSchema.methods.canBeRefunded = function() {
  return ['delivered'].includes(this.status) && this.paymentStatus === 'paid';
};

module.exports = mongoose.model('Order', orderSchema);
