const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const User = require('../models/User');

// In-memory storage for alerts (can be moved to model later)
const alertsStore = new Map();

// GET /api/alerts - Get all system alerts
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, type = '', severity = '', read = '' } = req.query;
    const query = {};

    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (read !== '') query.read = read === 'true';

    // Get user's alerts
    const userId = req.user?.id || 'anonymous';
    const userAlerts = Array.from(alertsStore.values()).filter(alert => {
      if (alert.userId && alert.userId !== userId) return false;
      for (let key in query) {
        if (alert[key] !== query[key]) return false;
      }
      return true;
    });

    const total = userAlerts.length;
    const alerts = userAlerts
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      data: alerts,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/alerts/:alertId - Get single alert
router.get('/:alertId', auth, async (req, res) => {
  try {
    const alert = alertsStore.get(req.params.alertId);

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    res.json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/alerts/:alertId/read - Mark alert as read
router.put('/:alertId/read', [auth], async (req, res) => {
  try {
    const alert = alertsStore.get(req.params.alertId);

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    alert.read = true;
    alert.readAt = new Date();

    res.json({
      success: true,
      data: alert,
      message: 'Alert marked as read'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/alerts/:alertId - Delete alert
router.delete('/:alertId', [auth], async (req, res) => {
  try {
    const alert = alertsStore.get(req.params.alertId);

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    alertsStore.delete(req.params.alertId);

    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ ALERT CONFIGURATION ============

// GET /api/alerts/config - Get alert configuration for user
router.get('/config/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('alertPreferences notificationSettings');

    res.json({
      success: true,
      data: {
        preferences: user?.alertPreferences || getDefaultAlertPreferences(),
        notificationSettings: user?.notificationSettings || getDefaultNotificationSettings()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/alerts/config - Update alert configuration
router.put('/config/user', [auth], async (req, res) => {
  try {
    const { preferences, notificationSettings } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        alertPreferences: preferences,
        notificationSettings: notificationSettings
      },
      { new: true }
    ).select('alertPreferences notificationSettings');

    res.json({
      success: true,
      data: {
        preferences: user.alertPreferences,
        notificationSettings: user.notificationSettings
      },
      message: 'Alert configuration updated'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ ADMIN ALERT CONFIGURATION ============

// GET /api/alerts/admin/config - Get system-wide alert configuration (admin only)
router.get('/admin/config', auth, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        alertTypes: [
          { id: 'order_placed', name: 'Order Placed', enabled: true },
          { id: 'payment_received', name: 'Payment Received', enabled: true },
          { id: 'order_shipped', name: 'Order Shipped', enabled: true },
          { id: 'stock_low', name: 'Low Stock Alert', enabled: true },
          { id: 'new_review', name: 'New Review', enabled: true },
          { id: 'product_returned', name: 'Product Returned', enabled: true },
          { id: 'seller_joined', name: 'Seller Joined', enabled: true },
          { id: 'security_alert', name: 'Security Alert', enabled: true }
        ],
        severities: ['info', 'warning', 'critical'],
        channels: ['email', 'sms', 'push', 'in-app']
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/alerts/admin/trigger - Trigger system alert (admin only)
router.post('/admin/trigger', auth, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { type, severity, title, message, targetUsers = 'all', data = {} } = req.body;

    if (!type || !severity || !title || !message) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const alertId = `alert-${Date.now()}`;
    const alert = {
      id: alertId,
      type,
      severity,
      title,
      message,
      data,
      createdBy: req.user.id,
      createdAt: new Date(),
      read: false
    };

    if (targetUsers === 'all') {
      // Broadcast to all users
      const users = await User.find({}).select('_id');
      users.forEach(user => {
        const userAlert = { ...alert, userId: user._id, id: `${alertId}-${user._id}` };
        alertsStore.set(userAlert.id, userAlert);
      });
    } else if (Array.isArray(targetUsers)) {
      // Send to specific users
      targetUsers.forEach(userId => {
        const userAlert = { ...alert, userId, id: `${alertId}-${userId}` };
        alertsStore.set(userAlert.id, userAlert);
      });
    }

    res.status(201).json({
      success: true,
      data: alert,
      message: 'Alert triggered successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/alerts/admin/stats - Get alert statistics (admin only)
router.get('/admin/stats', auth, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const allAlerts = Array.from(alertsStore.values());
    const unreadAlerts = allAlerts.filter(a => !a.read);

    const alertsByType = {};
    allAlerts.forEach(alert => {
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalAlerts: allAlerts.length,
        unreadAlerts: unreadAlerts.length,
        alertsByType,
        recentAlerts: allAlerts.slice(-5)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ HELPER FUNCTIONS ============

function getDefaultAlertPreferences() {
  return {
    orderNotifications: true,
    paymentNotifications: true,
    shippingNotifications: true,
    reviewNotifications: true,
    promotionalAlerts: true,
    securityAlerts: true,
    emailAlerts: true,
    smsAlerts: false,
    pushNotifications: true
  };
}

function getDefaultNotificationSettings() {
  return {
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    },
    frequency: 'immediate',
    groupSimilar: true
  };
}

module.exports = router;
