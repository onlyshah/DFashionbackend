const express = require('express');
const router = express.Router();
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuth');
const inventoryController = require('../controllers/inventoryController');

// All routes require admin authentication
router.use(verifyAdminToken);

// ==================== INVENTORY ROUTES ====================

/**
 * IMPORTANT: Specific routes MUST come BEFORE /:id route to prevent Express
 * from matching /alerts, /history, /suppliers, /warehouses as ID parameters
 */

// SPECIFIC ROUTES (before /:id)

/**
 * GET /api/admin/inventory/stats
 * Get inventory statistics
 */
router.get('/stats', requirePermission('inventory', 'view'), inventoryController.getInventoryStats);

/**
 * GET /api/admin/inventory/alerts/summary
 * Get alert summary statistics
 */
router.get('/alerts/summary', requirePermission('inventory', 'view'), inventoryController.getAlertSummary);

/**
 * GET /api/admin/inventory/alerts
 * Get all inventory alerts
 */
router.get('/alerts', requirePermission('inventory', 'view'), inventoryController.getAlertsList);

/**
 * PUT /api/admin/inventory/alerts/:id
 * Update alert status
 */
router.put('/alerts/:id', requirePermission('inventory', 'edit'), inventoryController.updateAlert);

/**
 * DELETE /api/admin/inventory/alerts/:id
 * Delete alert
 */
router.delete('/alerts/:id', requirePermission('inventory', 'delete'), inventoryController.deleteAlert);

/**
 * GET /api/admin/inventory/history
 * Get inventory transaction history
 */
router.get('/history', requirePermission('inventory', 'view'), inventoryController.getHistoryList);

/**
 * POST /api/admin/inventory/history
 * Log inventory transaction
 */
router.post('/history', requirePermission('inventory', 'create'), inventoryController.createHistoryEntry);

/**
 * GET /api/admin/inventory/suppliers
 * Get all suppliers
 */
router.get('/suppliers', requirePermission('inventory', 'view'), inventoryController.getSuppliers);

/**
 * GET /api/admin/inventory/warehouses
 * Get all warehouses
 */
router.get('/warehouses', requirePermission('inventory', 'view'), inventoryController.getWarehouses);

// GENERIC ROUTES (after all specific routes)

/**
 * GET /api/admin/inventory
 * Get all inventory items with pagination and filters
 */
router.get('/', requirePermission('inventory', 'view'), inventoryController.getInventoryList);

/**
 * POST /api/admin/inventory
 * Create new inventory item
 */
router.post('/', requirePermission('inventory', 'create'), inventoryController.createInventoryItem);

/**
 * GET /api/admin/inventory/:id
 * Get specific inventory item
 */
router.get('/:id', requirePermission('inventory', 'view'), inventoryController.getInventoryItem);

/**
 * PUT /api/admin/inventory/:id
 * Update inventory item
 */
router.put('/:id', requirePermission('inventory', 'edit'), inventoryController.updateInventoryItem);

/**
 * DELETE /api/admin/inventory/:id
 * Delete inventory item
 */
router.delete('/:id', requirePermission('inventory', 'delete'), inventoryController.deleteInventoryItem);

module.exports = router;