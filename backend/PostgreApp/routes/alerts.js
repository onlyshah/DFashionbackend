const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alertsController');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', alertsController.getAllAlerts);
router.get('/:alertId', auth, alertsController.getAlertById);
router.put('/:alertId/read', auth, alertsController.markAlertAsRead);
router.delete('/:alertId', auth, alertsController.deleteAlert);
router.get('/config/user', auth, alertsController.getUserAlertConfig);
router.put('/config/user', auth, alertsController.updateUserAlertConfig);
router.get('/admin/config', auth, requireRole(['admin', 'super_admin']), alertsController.getAdminAlertConfig);
router.post('/admin/trigger', auth, requireRole(['admin', 'super_admin']), alertsController.triggerSystemAlert);
router.get('/admin/stats', auth, requireRole(['admin', 'super_admin']), alertsController.getAlertStatistics);

module.exports = router;