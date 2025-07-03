const Notification = require('../models/Notification');
const socketService = require('./socketService');

class NotificationService {
  constructor() {
    this.templates = {
      // Order notifications
      order_placed: {
        title: 'Order Placed Successfully',
        message: 'Your order #{orderNumber} has been placed successfully.',
        category: 'order',
        priority: 'medium'
      },
      order_confirmed: {
        title: 'Order Confirmed',
        message: 'Your order #{orderNumber} has been confirmed and is being processed.',
        category: 'order',
        priority: 'medium'
      },
      order_shipped: {
        title: 'Order Shipped',
        message: 'Your order #{orderNumber} has been shipped. Track your package!',
        category: 'order',
        priority: 'high'
      },
      order_delivered: {
        title: 'Order Delivered',
        message: 'Your order #{orderNumber} has been delivered. Enjoy your purchase!',
        category: 'order',
        priority: 'high'
      },
      order_cancelled: {
        title: 'Order Cancelled',
        message: 'Your order #{orderNumber} has been cancelled.',
        category: 'order',
        priority: 'high'
      },

      // Payment notifications
      payment_success: {
        title: 'Payment Successful',
        message: 'Your payment of ₹{amount} has been processed successfully.',
        category: 'payment',
        priority: 'high'
      },
      payment_failed: {
        title: 'Payment Failed',
        message: 'Your payment of ₹{amount} could not be processed. Please try again.',
        category: 'payment',
        priority: 'urgent'
      },

      // Social notifications
      product_liked: {
        title: 'Product Liked',
        message: '{userName} liked your product "{productName}".',
        category: 'social',
        priority: 'low'
      },
      product_commented: {
        title: 'New Comment',
        message: '{userName} commented on your product "{productName}".',
        category: 'social',
        priority: 'medium'
      },
      user_followed: {
        title: 'New Follower',
        message: '{userName} started following you.',
        category: 'social',
        priority: 'medium'
      },
      post_liked: {
        title: 'Post Liked',
        message: '{userName} liked your post.',
        category: 'social',
        priority: 'low'
      },
      post_commented: {
        title: 'New Comment',
        message: '{userName} commented on your post.',
        category: 'social',
        priority: 'medium'
      },
      story_viewed: {
        title: 'Story Viewed',
        message: '{userName} viewed your story.',
        category: 'social',
        priority: 'low'
      },

      // Vendor notifications
      vendor_approved: {
        title: 'Vendor Application Approved',
        message: 'Congratulations! Your vendor application has been approved.',
        category: 'system',
        priority: 'high'
      },
      vendor_rejected: {
        title: 'Vendor Application Rejected',
        message: 'Your vendor application has been rejected. Please contact support for more information.',
        category: 'system',
        priority: 'high'
      },
      low_stock: {
        title: 'Low Stock Alert',
        message: 'Your product "{productName}" is running low on stock ({quantity} remaining).',
        category: 'system',
        priority: 'high'
      },

      // System notifications
      welcome: {
        title: 'Welcome to DFashion!',
        message: 'Welcome to DFashion! Start exploring amazing fashion products.',
        category: 'system',
        priority: 'medium'
      },
      password_changed: {
        title: 'Password Changed',
        message: 'Your password has been changed successfully.',
        category: 'security',
        priority: 'high'
      },
      profile_updated: {
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully.',
        category: 'system',
        priority: 'low'
      }
    };
  }

  // Create notification with template
  async createNotification(type, recipientId, data = {}, options = {}) {
    try {
      const template = this.templates[type];
      if (!template) {
        throw new Error(`Unknown notification type: ${type}`);
      }

      // Replace placeholders in title and message
      const title = this.replacePlaceholders(template.title, data);
      const message = this.replacePlaceholders(template.message, data);

      const notificationData = {
        recipient: recipientId,
        type,
        title,
        message,
        category: template.category,
        priority: template.priority,
        data: data,
        deliveryChannels: {
          inApp: true,
          email: options.email || false,
          push: options.push || false,
          sms: options.sms || false
        },
        metadata: {
          source: options.source || 'system',
          userAgent: options.userAgent,
          ipAddress: options.ipAddress
        },
        ...options
      };

      // Add related entity if provided
      if (options.relatedEntity) {
        notificationData.relatedEntity = options.relatedEntity;
      }

      // Add sender if provided
      if (options.senderId) {
        notificationData.sender = options.senderId;
      }

      const notification = await Notification.createNotification(notificationData);
      
      // Send real-time notification via Socket.IO
      if (socketService.isUserOnline(recipientId)) {
        await socketService.sendNotification(recipientId, notification);
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Replace placeholders in text
  replacePlaceholders(text, data) {
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  // Order-specific notification methods
  async notifyOrderPlaced(order) {
    return this.createNotification('order_placed', order.customer, {
      orderNumber: order.orderNumber,
      orderId: order._id
    }, {
      email: true,
      push: true,
      relatedEntity: { entityType: 'Order', entityId: order._id }
    });
  }

  async notifyOrderStatusChange(order, status) {
    const type = `order_${status}`;
    return this.createNotification(type, order.customer, {
      orderNumber: order.orderNumber,
      orderId: order._id
    }, {
      email: true,
      push: true,
      relatedEntity: { entityType: 'Order', entityId: order._id }
    });
  }

  // Payment-specific notification methods
  async notifyPaymentSuccess(payment) {
    return this.createNotification('payment_success', payment.customer, {
      amount: payment.amount,
      paymentId: payment._id
    }, {
      email: true,
      push: true,
      relatedEntity: { entityType: 'Payment', entityId: payment._id }
    });
  }

  async notifyPaymentFailed(payment) {
    return this.createNotification('payment_failed', payment.customer, {
      amount: payment.amount,
      paymentId: payment._id
    }, {
      email: true,
      push: true,
      relatedEntity: { entityType: 'Payment', entityId: payment._id }
    });
  }

  // Social notification methods
  async notifyProductLiked(product, liker) {
    if (product.vendor && product.vendor.toString() !== liker._id.toString()) {
      return this.createNotification('product_liked', product.vendor, {
        userName: liker.fullName,
        productName: product.name,
        productId: product._id
      }, {
        senderId: liker._id,
        relatedEntity: { entityType: 'Product', entityId: product._id }
      });
    }
  }

  async notifyUserFollowed(followedUser, follower) {
    return this.createNotification('user_followed', followedUser._id, {
      userName: follower.fullName,
      userId: follower._id
    }, {
      senderId: follower._id,
      relatedEntity: { entityType: 'User', entityId: follower._id }
    });
  }

  // System notification methods
  async notifyWelcome(userId) {
    return this.createNotification('welcome', userId, {}, {
      email: true
    });
  }

  async notifyPasswordChanged(userId) {
    return this.createNotification('password_changed', userId, {}, {
      email: true,
      push: true
    });
  }

  async notifyLowStock(product, vendor) {
    return this.createNotification('low_stock', vendor, {
      productName: product.name,
      quantity: product.stock,
      productId: product._id
    }, {
      email: true,
      push: true,
      relatedEntity: { entityType: 'Product', entityId: product._id }
    });
  }

  // Broadcast notifications
  async broadcastToRole(role, type, data = {}, options = {}) {
    try {
      const User = require('../models/User');
      const users = await User.find({ role }).select('_id');
      
      const notifications = [];
      for (const user of users) {
        const notification = await this.createNotification(type, user._id, data, options);
        notifications.push(notification);
      }
      
      return notifications;
    } catch (error) {
      console.error('Error broadcasting to role:', error);
      throw error;
    }
  }

  async broadcastToAll(type, data = {}, options = {}) {
    try {
      const User = require('../models/User');
      const users = await User.find({ isActive: true }).select('_id');
      
      const notifications = [];
      for (const user of users) {
        const notification = await this.createNotification(type, user._id, data, options);
        notifications.push(notification);
      }
      
      return notifications;
    } catch (error) {
      console.error('Error broadcasting to all users:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
