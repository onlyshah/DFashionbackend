const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true // Optional for system notifications
  },
  type: {
    type: String,
    required: true,
    enum: [
      'order_placed',
      'order_confirmed',
      'order_shipped',
      'order_delivered',
      'order_cancelled',
      'payment_success',
      'payment_failed',
      'product_liked',
      'product_commented',
      'user_followed',
      'post_liked',
      'post_commented',
      'story_viewed',
      'vendor_approved',
      'vendor_rejected',
      'low_stock',
      'new_product',
      'promotion',
      'system_announcement',
      'welcome',
      'password_changed',
      'profile_updated'
    ],
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['Order', 'Product', 'User', 'Post', 'Story', 'Payment'],
      sparse: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      sparse: true
    }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['order', 'payment', 'social', 'system', 'marketing', 'security'],
    required: true,
    index: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    sparse: true
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  archivedAt: {
    type: Date,
    sparse: true
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed'],
    default: 'pending'
  },
  deliveryChannels: {
    inApp: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    }
  },
  deliveryAttempts: {
    type: Number,
    default: 0
  },
  lastDeliveryAttempt: {
    type: Date,
    sparse: true
  },
  expiresAt: {
    type: Date,
    sparse: true,
    index: { expireAfterSeconds: 0 }
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'system'],
      default: 'system'
    },
    version: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, category: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ deliveryStatus: 1, createdAt: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return this.createdAt.toLocaleDateString();
});

// Static methods
notificationSchema.statics.createNotification = async function(data) {
  try {
    const notification = new this(data);
    await notification.save();
    
    // Emit real-time notification if socket.io is available
    if (global.io) {
      global.io.to(`user_${data.recipient}`).emit('notification', notification);
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

notificationSchema.statics.markAsRead = async function(notificationId, userId) {
  try {
    const notification = await this.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { 
        isRead: true, 
        readAt: new Date() 
      },
      { new: true }
    );
    
    if (notification && global.io) {
      global.io.to(`user_${userId}`).emit('notificationRead', { notificationId });
    }
    
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

notificationSchema.statics.markAllAsRead = async function(userId) {
  try {
    const result = await this.updateMany(
      { recipient: userId, isRead: false },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );
    
    if (global.io) {
      global.io.to(`user_${userId}`).emit('allNotificationsRead');
    }
    
    return result;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

notificationSchema.statics.getUnreadCount = async function(userId) {
  try {
    return await this.countDocuments({
      recipient: userId,
      isRead: false,
      isArchived: false
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

notificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      isRead,
      type
    } = options;

    const filter = {
      recipient: userId,
      isArchived: false
    };

    if (category) filter.category = category;
    if (typeof isRead === 'boolean') filter.isRead = isRead;
    if (type) filter.type = type;

    const skip = (page - 1) * limit;

    const notifications = await this.find(filter)
      .populate('sender', 'fullName username avatar')
      .populate('relatedEntity.entityId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.countDocuments(filter);
    const unreadCount = await this.getUnreadCount(userId);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

// Instance methods
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.archive = function() {
  this.isArchived = true;
  this.archivedAt = new Date();
  return this.save();
};

notificationSchema.methods.updateDeliveryStatus = function(status) {
  this.deliveryStatus = status;
  this.deliveryAttempts += 1;
  this.lastDeliveryAttempt = new Date();
  return this.save();
};

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  // Set expiration for certain notification types
  if (!this.expiresAt) {
    const expirationDays = {
      'promotion': 30,
      'system_announcement': 60,
      'marketing': 15
    };
    
    const days = expirationDays[this.type] || 90; // Default 90 days
    this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
  
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);
