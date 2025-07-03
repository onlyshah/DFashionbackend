const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId mapping
    this.userSockets = new Map(); // socketId -> userId mapping
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: ["http://localhost:4200", "http://localhost:8100"],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Make io globally available for notification creation
    global.io = this.io;

    this.setupMiddleware();
    this.setupEventHandlers();

    console.log('✅ Socket.IO service initialized');
    return this.io;
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User ${socket.user.fullName} connected (${socket.id})`);
      
      // Store user connection
      this.connectedUsers.set(socket.userId, socket.id);
      this.userSockets.set(socket.id, socket.userId);
      
      // Join user-specific room
      socket.join(`user_${socket.userId}`);
      
      // Join role-specific rooms
      if (socket.user.role === 'super_admin') {
        socket.join('admins');
      } else if (socket.user.role === 'vendor') {
        socket.join('vendors');
      } else {
        socket.join('customers');
      }

      // Send initial unread count
      this.sendUnreadCount(socket.userId);

      // Handle notification events
      this.handleNotificationEvents(socket);
      
      // Handle typing events
      this.handleTypingEvents(socket);
      
      // Handle presence events
      this.handlePresenceEvents(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 User ${socket.user.fullName} disconnected (${socket.id})`);
        this.connectedUsers.delete(socket.userId);
        this.userSockets.delete(socket.id);
        
        // Broadcast user offline status
        socket.broadcast.emit('userOffline', {
          userId: socket.userId,
          timestamp: new Date()
        });
      });
    });
  }

  handleNotificationEvents(socket) {
    // Mark notification as read
    socket.on('markNotificationRead', async (data) => {
      try {
        const { notificationId } = data;
        await Notification.markAsRead(notificationId, socket.userId);
        
        // Send updated unread count
        this.sendUnreadCount(socket.userId);
        
        socket.emit('notificationMarkedRead', { notificationId });
      } catch (error) {
        console.error('Mark notification read error:', error);
        socket.emit('error', { message: 'Failed to mark notification as read' });
      }
    });

    // Mark all notifications as read
    socket.on('markAllNotificationsRead', async () => {
      try {
        await Notification.markAllAsRead(socket.userId);
        
        // Send updated unread count
        this.sendUnreadCount(socket.userId);
        
        socket.emit('allNotificationsMarkedRead');
      } catch (error) {
        console.error('Mark all notifications read error:', error);
        socket.emit('error', { message: 'Failed to mark all notifications as read' });
      }
    });

    // Get real-time notifications
    socket.on('getNotifications', async (data) => {
      try {
        const { page = 1, limit = 20, category, isRead } = data;
        const options = { page, limit, category };
        
        if (typeof isRead === 'boolean') {
          options.isRead = isRead;
        }

        const result = await Notification.getUserNotifications(socket.userId, options);
        
        socket.emit('notificationsData', {
          notifications: result.notifications,
          pagination: result.pagination,
          unreadCount: result.unreadCount
        });
      } catch (error) {
        console.error('Get notifications error:', error);
        socket.emit('error', { message: 'Failed to get notifications' });
      }
    });
  }

  handleTypingEvents(socket) {
    socket.on('typing', (data) => {
      const { chatId, isTyping } = data;
      socket.to(chatId).emit('userTyping', {
        userId: socket.userId,
        userName: socket.user.fullName,
        isTyping
      });
    });
  }

  handlePresenceEvents(socket) {
    // Broadcast user online status
    socket.broadcast.emit('userOnline', {
      userId: socket.userId,
      userName: socket.user.fullName,
      avatar: socket.user.avatar,
      timestamp: new Date()
    });

    // Handle status updates
    socket.on('updateStatus', (data) => {
      const { status } = data; // online, away, busy, offline
      socket.broadcast.emit('userStatusUpdate', {
        userId: socket.userId,
        status,
        timestamp: new Date()
      });
    });
  }

  // Utility methods
  async sendUnreadCount(userId) {
    try {
      const count = await Notification.getUnreadCount(userId);
      this.emitToUser(userId, 'unreadCount', { count });
    } catch (error) {
      console.error('Send unread count error:', error);
    }
  }

  emitToUser(userId, event, data) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  emitToRole(role, event, data) {
    const roomName = role === 'super_admin' ? 'admins' : 
                     role === 'vendor' ? 'vendors' : 'customers';
    this.io.to(roomName).emit(event, data);
  }

  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  getConnectionCount() {
    return this.connectedUsers.size;
  }

  // Notification helpers
  async sendNotification(userId, notification) {
    try {
      // Send real-time notification
      this.emitToUser(userId, 'notification', notification);
      
      // Update unread count
      this.sendUnreadCount(userId);
      
      return true;
    } catch (error) {
      console.error('Send notification error:', error);
      return false;
    }
  }

  async sendOrderNotification(userId, order, type) {
    const notificationData = {
      recipient: userId,
      type,
      category: 'order',
      data: { orderId: order._id, orderNumber: order.orderNumber },
      relatedEntity: { entityType: 'Order', entityId: order._id },
      deliveryChannels: { inApp: true, email: true }
    };

    switch (type) {
      case 'order_placed':
        notificationData.title = 'Order Placed Successfully';
        notificationData.message = `Your order #${order.orderNumber} has been placed successfully.`;
        break;
      case 'order_confirmed':
        notificationData.title = 'Order Confirmed';
        notificationData.message = `Your order #${order.orderNumber} has been confirmed and is being processed.`;
        break;
      case 'order_shipped':
        notificationData.title = 'Order Shipped';
        notificationData.message = `Your order #${order.orderNumber} has been shipped. Track your package!`;
        break;
      case 'order_delivered':
        notificationData.title = 'Order Delivered';
        notificationData.message = `Your order #${order.orderNumber} has been delivered. Enjoy your purchase!`;
        break;
      case 'order_cancelled':
        notificationData.title = 'Order Cancelled';
        notificationData.message = `Your order #${order.orderNumber} has been cancelled.`;
        break;
    }

    const notification = await Notification.createNotification(notificationData);
    return this.sendNotification(userId, notification);
  }

  async sendPaymentNotification(userId, payment, type) {
    const notificationData = {
      recipient: userId,
      type,
      category: 'payment',
      data: { paymentId: payment._id, amount: payment.amount },
      relatedEntity: { entityType: 'Payment', entityId: payment._id },
      deliveryChannels: { inApp: true, email: true }
    };

    if (type === 'payment_success') {
      notificationData.title = 'Payment Successful';
      notificationData.message = `Your payment of ₹${payment.amount} has been processed successfully.`;
    } else if (type === 'payment_failed') {
      notificationData.title = 'Payment Failed';
      notificationData.message = `Your payment of ₹${payment.amount} could not be processed. Please try again.`;
      notificationData.priority = 'high';
    }

    const notification = await Notification.createNotification(notificationData);
    return this.sendNotification(userId, notification);
  }
}

module.exports = new SocketService();
