const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { auth, requireRole } = require('../middleware/auth');

// Get user notifications with pagination and filtering
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      isRead,
      type
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      type
    };

    // Convert string to boolean for isRead
    if (isRead !== undefined) {
      options.isRead = isRead === 'true';
    }

    const result = await Notification.getUserNotifications(req.user._id, options);

    res.json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
      unreadCount: result.unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// Get unread notifications count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user._id);
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message
    });
  }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.markAsRead(req.params.id, req.user._id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    const result = await Notification.markAllAsRead(req.user._id);
    
    res.json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
});

// Archive notification
router.put('/:id/archive', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.archive();

    res.json({
      success: true,
      message: 'Notification archived',
      data: notification
    });
  } catch (error) {
    console.error('Archive notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive notification',
      error: error.message
    });
  }
});

// Delete notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
});

// Get notification preferences
router.get('/preferences', auth, async (req, res) => {
  try {
    // Get user's notification preferences from User model
    const user = await req.user.populate('notificationPreferences');
    
    res.json({
      success: true,
      preferences: user.notificationPreferences || {
        email: true,
        push: true,
        inApp: true,
        sms: false,
        categories: {
          order: true,
          payment: true,
          social: true,
          marketing: false,
          system: true
        }
      }
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification preferences',
      error: error.message
    });
  }
});

// Update notification preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const { email, push, inApp, sms, categories } = req.body;
    
    const preferences = {
      email: email !== undefined ? email : true,
      push: push !== undefined ? push : true,
      inApp: inApp !== undefined ? inApp : true,
      sms: sms !== undefined ? sms : false,
      categories: categories || {
        order: true,
        payment: true,
        social: true,
        marketing: false,
        system: true
      }
    };

    // Update user's notification preferences
    req.user.notificationPreferences = preferences;
    await req.user.save();

    res.json({
      success: true,
      message: 'Notification preferences updated',
      preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: error.message
    });
  }
});

// Admin: Create notification for specific user
router.post('/admin/create', auth, requireRole(['super_admin']), async (req, res) => {
  try {
    const {
      recipient,
      type,
      title,
      message,
      category,
      priority = 'medium',
      data = {},
      deliveryChannels = { inApp: true }
    } = req.body;

    if (!recipient || !type || !title || !message || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: recipient, type, title, message, category'
      });
    }

    const notification = await Notification.createNotification({
      recipient,
      sender: req.user._id,
      type,
      title,
      message,
      category,
      priority,
      data,
      deliveryChannels,
      metadata: {
        source: 'admin',
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });
  } catch (error) {
    console.error('Admin create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
});

// Admin: Broadcast notification to all users
router.post('/admin/broadcast', auth, requireRole(['super_admin']), async (req, res) => {
  try {
    const {
      type,
      title,
      message,
      category,
      priority = 'medium',
      data = {},
      deliveryChannels = { inApp: true },
      userFilter = {}
    } = req.body;

    if (!type || !title || !message || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, title, message, category'
      });
    }

    // Get all users based on filter
    const models = require('../models');
    const User = models.User;
    const users = await User.find(userFilter).select('_id');

    const notifications = [];
    for (const user of users) {
      const notification = await Notification.createNotification({
        recipient: user._id,
        sender: req.user._id,
        type,
        title,
        message,
        category,
        priority,
        data,
        deliveryChannels,
        metadata: {
          source: 'admin_broadcast',
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        }
      });
      notifications.push(notification);
    }

    res.status(201).json({
      success: true,
      message: `Broadcast notification sent to ${notifications.length} users`,
      count: notifications.length
    });
  } catch (error) {
    console.error('Admin broadcast notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to broadcast notification',
      error: error.message
    });
  }
});

module.exports = router;
