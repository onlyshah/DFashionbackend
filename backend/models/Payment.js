const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['card', 'upi', 'netbanking', 'wallet', 'cod']
  },
  paymentGateway: {
    type: String,
    enum: ['razorpay', 'stripe', 'payu', 'cashfree'],
    required: function() {
      return this.paymentMethod !== 'cod';
    }
  },
  gatewayTransactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  gatewayPaymentId: String,
  gatewayOrderId: String,
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentDetails: {
    cardLast4: String,
    cardBrand: String,
    upiId: String,
    bankName: String,
    walletProvider: String
  },
  failureReason: String,
  refund: {
    amount: Number,
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed']
    },
    gatewayRefundId: String,
    processedAt: Date,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceInfo: String
  },
  timeline: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
paymentSchema.index({ order: 1 });
paymentSchema.index({ customer: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ gatewayTransactionId: 1 });
paymentSchema.index({ paymentMethod: 1 });

// Virtual for payment status display
paymentSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    pending: 'Payment Pending',
    processing: 'Processing Payment',
    completed: 'Payment Successful',
    failed: 'Payment Failed',
    cancelled: 'Payment Cancelled',
    refunded: 'Payment Refunded'
  };
  return statusMap[this.status] || this.status;
});

// Method to generate payment reference
paymentSchema.statics.generatePaymentReference = function() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PAY${timestamp.slice(-8)}${random}`;
};

// Method to update payment status
paymentSchema.methods.updateStatus = function(newStatus, notes, updatedBy) {
  this.status = newStatus;
  this.timeline.push({
    status: newStatus,
    notes,
    updatedBy
  });
  return this.save();
};

module.exports = mongoose.model('Payment', paymentSchema);
