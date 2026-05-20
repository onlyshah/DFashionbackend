/**
 * Notifications Routes - Phase 5
 * 9 endpoints for notifications management
 */

const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsControllerPhase5');
const { verifyToken } = require('../middleware/auth');

// Get all notifications
router.get('/', verifyToken, notificationsController.getNotifications);

// Get unread count
router.get('/unread/count', verifyToken, notificationsController.getUnreadCount);

// Mark all as read
router.post('/mark-all-read', verifyToken, notificationsController.markAllRead);

// Mark single as read
router.post('/:notificationId/read', verifyToken, notificationsController.markAsRead);

// Delete notification
router.delete('/:notificationId', verifyToken, notificationsController.deleteNotification);

// Clear all notifications
router.delete('/all/clear', verifyToken, notificationsController.clearAllNotifications);

// Subscribe to push notifications
router.post('/subscribe', verifyToken, notificationsController.subscribeToNotifications);

// Unsubscribe from push notifications
router.post('/unsubscribe', verifyToken, notificationsController.unsubscribeFromNotifications);

// Send test notification
router.post('/test', verifyToken, notificationsController.testNotification);

module.exports = router;
