const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const { auth } = require('../middleware/auth');

router.get('/', auth, notificationsController.getNotifications);
router.get('/unread-count', auth, notificationsController.getUnreadCount);
router.post('/:notificationId/read', auth, notificationsController.markAsRead);
router.delete('/:notificationId', auth, notificationsController.deleteNotification);

module.exports = router;

module.exports = router;