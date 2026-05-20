const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      sparse: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
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
      discount: {
        type: Number,
        default: 0
      }
    }],
    shippingAddress: {
      firstName: String,
      lastName: String,
      email: String,
      phoneNumber: String,
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      landmark: String
    },
    payment: {
      method: {
        type: String,
        enum: ['credit_card', 'debit_card', 'upi', 'wallet', 'cod'],
        default: 'cod'
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
      },
      transactionId: String,
      paidAt: Date
    },
    pricing: {
      subtotal: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      shipping: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      total: { type: Number, required: true }
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
      default: 'pending'
    },
    tracking: {
      trackingNumber: String,
      carrier: String,
      url: String
    },
    notes: String,
    coupon: {
      code: String,
      discount: { type: Number, default: 0 }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deliveredAt: Date,
    cancelledAt: Date,
    returnedAt: Date
  },
  { timestamps: true, collection: 'orders' }
);

// Generate order number on creation
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD-${Date.now()}-${count + 1}`;
  }
  next();
});

// Index for user lookup and sorting
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);
