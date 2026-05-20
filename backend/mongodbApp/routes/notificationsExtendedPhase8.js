/**
 * Notifications Extended Routes - Phase 8
 * Routes: /api/v1/notifications-extended
 */

const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsExtendedControllerPhase8');
const { verifyToken, verifyRole } = require('../middleware/auth');

/**
 * Protected Routes (User)
 */

router.use(verifyToken);

// GET - Get notification preferences
router.get('/preferences', notificationsController.getNotificationPreferences);

// PATCH - Update notification preferences
router.patch('/preferences', notificationsController.updateNotificationPreferences);

/**
 * Protected Routes (Admin)
 */

// POST - Send bulk notification
router.post('/send-bulk', verifyRole(['admin', 'super_admin']), notificationsController.sendBulkNotification);

module.exports = router;
