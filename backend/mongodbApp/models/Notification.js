const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    type: {
      type: String,
      enum: [
        'follow',
        'like',
        'comment',
        'message',
        'order_status',
        'payment_status',
        'product_available',
        'flash_sale',
        'promotion',
        'system',
        'mention'
      ],
      required: true
    },
    title: {
      type: String,
      required: [true, 'Title is required']
    },
    message: {
      type: String,
      required: [true, 'Message is required']
    },
    image: String,
    link: String,
    relatedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    relatedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post'
    },
    relatedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    relatedProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    metadata: mongoose.Schema.Types.Mixed,
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    expiresAt: {
      type: Date,
      default: () => new Date(+new Date() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  },
  { timestamps: true, collection: 'notifications' }
);

// TTL index - automatically delete after expiresAt
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for user lookup and sorting
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
