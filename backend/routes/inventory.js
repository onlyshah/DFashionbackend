const express = require('express');
const router = express.Router();
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuth');
const models = require('../models');
const { Inventory, InventoryAlert, InventoryHistory, Product } = models;

// All routes require admin authentication
router.use(verifyAdminToken);

// ==================== INVENTORY ROUTES ====================

/**
 * GET /api/admin/inventory
 * Get all inventory items with pagination and filters
 */
router.get('/', requirePermission('inventory', 'view'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'active', warehouse, sku, product } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { status };
    if (warehouse) filter.warehouseId = warehouse;
    if (sku) filter.sku = sku;
    if (product) filter.productId = product;

    // Fetch inventory with pagination
    const items = await Inventory.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ lastUpdated: -1 })
      .lean()
      .exec() || [];

    const total = await Inventory.countDocuments(filter);

    res.json({
      success: true,
      data: items,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/inventory/stats
 * Get inventory statistics
 */
router.get('/stats', requirePermission('inventory', 'view'), async (req, res) => {
  try {
    const [totalItems, lowStock, outOfStock] = await Promise.all([
      Inventory.countDocuments({ status: 'active' }),
      Inventory.countDocuments({ status: 'active', quantity: { $lte: 10 } }),
      Inventory.countDocuments({ status: 'active', quantity: 0 })
    ]);

    // For simplicity, return placeholder total value
    const totalValue = (totalItems * 100).toFixed(2); // Placeholder calculation

    res.json({
      success: true,
      data: {
        totalItems,
        lowStock,
        outOfStock,
        totalValue
      }
    });
  } catch (error) {
    console.error('Get inventory stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory stats',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/inventory/:id
 * Get specific inventory item
 */
router.get('/:id', requirePermission('inventory', 'view'), async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Get inventory item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory item',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/inventory
 * Create new inventory item
 */
router.post('/', requirePermission('inventory', 'create'), async (req, res) => {
  try {
    const { product, warehouse, sku, quantity, minimumLevel, maximumLevel } = req.body;

    // Validate required fields
    if (!product || !warehouse || !sku) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: product, warehouse, sku'
      });
    }

    // Check if SKU already exists
    const existing = await Inventory.findOne({ sku });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
    }

    const item = new Inventory({
      product,
      warehouse,
      sku,
      quantity: quantity || 0,
      minimumLevel: minimumLevel || 10,
      maximumLevel: maximumLevel || 1000
    });

    await item.save();
    await item.populate(['product', 'warehouse']);

    res.status(201).json({
      success: true,
      message: 'Inventory item created',
      data: item
    });
  } catch (error) {
    console.error('Create inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create inventory item',
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/inventory/:id
 * Update inventory item
 */
router.put('/:id', requirePermission('inventory', 'edit'), async (req, res) => {
  try {
    const { quantity, minimumLevel, maximumLevel, status, notes } = req.body;

    const item = await Inventory.findByIdAndUpdate(
      req.params.id,
      {
        quantity,
        minimumLevel,
        maximumLevel,
        status,
        notes,
        lastUpdated: Date.now()
      },
      { new: true }
    ).populate(['product', 'warehouse']);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      message: 'Inventory item updated',
      data: item
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update inventory item',
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/inventory/:id
 * Delete inventory item
 */
router.delete('/:id', requirePermission('inventory', 'delete'), async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      message: 'Inventory item deleted'
    });
  } catch (error) {
    console.error('Delete inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inventory item',
      error: error.message
    });
  }
});

// ==================== INVENTORY ALERTS ROUTES ====================

/**
 * GET /api/admin/inventory/alerts
 * Get all inventory alerts
 */
router.get('/alerts', requirePermission('inventory', 'view'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'pending', type } = req.query;
    const skip = (page - 1) * limit;

    const filter = { status };
    if (type) filter.type = type;

    const alerts = await InventoryAlert.find(filter)
      .populate('product', 'name')
      .populate('warehouse', 'name')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .lean();

    const total = await InventoryAlert.countDocuments(filter);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/inventory/alerts/summary
 * Get alert summary statistics
 */
router.get('/alerts/summary', requirePermission('inventory', 'view'), async (req, res) => {
  try {
    const [critical, warning, info] = await Promise.all([
      InventoryAlert.countDocuments({ type: 'critical' }),
      InventoryAlert.countDocuments({ type: 'warning' }),
      InventoryAlert.countDocuments({ type: 'info' })
    ]);

    res.json({
      success: true,
      data: { critical, warning, info }
    });
  } catch (error) {
    console.error('Get alert summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alert summary',
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/inventory/alerts/:id
 * Update alert status
 */
router.put('/alerts/:id', requirePermission('inventory', 'edit'), async (req, res) => {
  try {
    const { status, acknowledged } = req.body;

    const update = { status: status || 'pending' };
    if (acknowledged) {
      update.status = 'acknowledged';
      update.acknowledgedBy = req.user._id;
      update.acknowledgedAt = Date.now();
    }

    const alert = await InventoryAlert.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).populate(['product', 'warehouse']);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.json({
      success: true,
      message: 'Alert updated',
      data: alert
    });
  } catch (error) {
    console.error('Update alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update alert',
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/inventory/alerts/:id
 * Delete alert
 */
router.delete('/alerts/:id', requirePermission('inventory', 'delete'), async (req, res) => {
  try {
    const alert = await InventoryAlert.findByIdAndDelete(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.json({
      success: true,
      message: 'Alert deleted'
    });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete alert',
      error: error.message
    });
  }
});

// ==================== INVENTORY HISTORY ROUTES ====================

/**
 * GET /api/admin/inventory/history
 * Get inventory transaction history
 */
router.get('/history', requirePermission('inventory', 'view'), async (req, res) => {
  try {
    const { page = 1, limit = 20, type, warehouse, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (type) filter.type = type;
    if (warehouse) filter.warehouse = warehouse;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const history = await InventoryHistory.find(filter)
      .populate('product', 'name')
      .populate('warehouse', 'name')
      .populate('user', 'username fullName')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ timestamp: -1 })
      .lean();

    const total = await InventoryHistory.countDocuments(filter);

    res.json({
      success: true,
      data: history,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch history',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/inventory/history
 * Log inventory transaction
 */
router.post('/history', requirePermission('inventory', 'create'), async (req, res) => {
  try {
    const { transactionId, product, type, quantity, warehouse, reference, referenceType, notes } = req.body;

    // Validate required fields
    if (!transactionId || !product || !type || !quantity || !warehouse) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const entry = new InventoryHistory({
      transactionId,
      product,
      type,
      quantity,
      warehouse,
      reference,
      referenceType: referenceType || 'Purchase',
      user: req.user._id,
      notes
    });

    await entry.save();
    await entry.populate(['product', 'warehouse', 'user']);

    res.status(201).json({
      success: true,
      message: 'Inventory transaction recorded',
      data: entry
    });
  } catch (error) {
    console.error('Create history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record inventory transaction',
      error: error.message
    });
  }
});

module.exports = router;
