/**
 * Inventory Management Routes - Phase 7
 * Routes: /api/v1/inventory
 */

const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryControllerPhase7');
const { verifyToken, verifyRole } = require('../middleware/auth');

/**
 * Protected Routes (Admin)
 */

router.use(verifyToken, verifyRole(['admin', 'super_admin']));

// GET - Retrieve all inventory items
router.get('/', inventoryController.getInventory);

// GET - Get specific inventory item
router.get('/:inventoryId', inventoryController.trackInventory);

// PATCH - Update inventory
router.patch('/:inventoryId', inventoryController.updateInventory);

// POST - Bulk update inventory
router.post('/bulk-update', inventoryController.bulkUpdateInventory);

// GET - Get inventory alerts
router.get('/alerts/list', inventoryController.getInventoryAlerts);

// GET - Get inventory history
router.get('/:inventoryId/history', inventoryController.getInventoryHistory);

module.exports = router;
