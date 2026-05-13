const express = require('express');
const router = express.Router();
const logisticsController = require('../controllers/logisticsController');
const { auth } = require('../middleware/auth');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuth');

// Couriers
router.get('/couriers', verifyAdminToken, requirePermission('logistics', 'view'), logisticsController.getAllCouriers);
router.get('/couriers/:id', verifyAdminToken, requirePermission('logistics', 'view'), logisticsController.getCourierById);
router.post('/couriers', verifyAdminToken, requirePermission('logistics', 'manage'), logisticsController.createCourier);
router.put('/couriers/:id', verifyAdminToken, requirePermission('logistics', 'manage'), logisticsController.updateCourier);
router.delete('/couriers/:id', verifyAdminToken, requirePermission('logistics', 'manage'), logisticsController.deleteCourier);

// Shipments
router.get('/shipments', verifyAdminToken, requirePermission('logistics', 'view'), logisticsController.getAllShipments);
router.get('/shipments/:id', verifyAdminToken, requirePermission('logistics', 'view'), logisticsController.getShipmentById);
router.post('/shipments', verifyAdminToken, requirePermission('logistics', 'manage'), logisticsController.createShipment);
router.put('/shipments/:id/tracking', verifyAdminToken, requirePermission('logistics', 'manage'), logisticsController.updateTracking);

// Shipping Charges
router.get('/charges', verifyAdminToken, requirePermission('logistics', 'view'), logisticsController.getShippingCharges);
router.post('/charges', verifyAdminToken, requirePermission('logistics', 'manage'), logisticsController.createShippingCharge);
router.put('/charges/:id', verifyAdminToken, requirePermission('logistics', 'manage'), logisticsController.updateShippingCharge);

module.exports = router;