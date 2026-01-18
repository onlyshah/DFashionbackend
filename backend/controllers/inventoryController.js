/**
 * Inventory Controller
 * Handles all business logic for inventory management
 * Model → Controller → Routes pattern
 */

const dbType = (process.env.DB_TYPE || '').toLowerCase();
const models = dbType === 'postgres' ? require('../models_sql') : require('../models')();
const { Inventory, InventoryAlert, InventoryHistory, Product, Warehouse, Supplier } = models;

// Helper to safely execute model operations
const safeExec = async (operation, defaultValue = null) => {
  try {
    return await operation();
  } catch (error) {
    console.error('Model operation error:', error.message, error.stack);
    if (defaultValue !== null) return defaultValue;
    throw error;
  }
};

// ==================== INVENTORY OPERATIONS ====================

/**
 * Get inventory statistics (total items, low stock, out of stock)
 */
exports.getInventoryStats = async (req, res) => {
  try {
    console.log('[inventoryController] getInventoryStats - Inventory model:', Inventory ? 'EXISTS' : 'NOT FOUND');
    console.log('[inventoryController] Inventory.count type:', typeof Inventory?.count);
    
    const totalItems = await safeExec(
      () => Inventory ? Inventory.count({ where: { status: 'active' } }) : Promise.resolve(0),
      0
    );
    console.log('[inventoryController] totalItems count result:', totalItems);
    
    const lowStock = await safeExec(
      () => Inventory ? Inventory.count({ where: { status: 'active', quantity: { [require('sequelize').Op.lte]: 10 } } }) : Promise.resolve(0),
      0
    );
    const outOfStock = await safeExec(
      () => Inventory ? Inventory.count({ where: { status: 'active', quantity: 0 } }) : Promise.resolve(0),
      0
    );

    const totalValue = (totalItems * 100).toFixed(2);

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
    console.error('Get inventory stats error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory stats',
      error: error.message
    });
  }
};

/**
 * Get all inventory items with pagination and filters
 */
exports.getInventoryList = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'active', warehouse, sku, product } = req.query;
    const skip = (page - 1) * limit;

    const filter = { status };
    if (warehouse) filter.warehouseId = warehouse;
    if (sku) filter.sku = sku;
    if (product) filter.productId = product;

    console.log('[inventoryController] getInventoryList - filter:', filter);
    console.log('[inventoryController] Inventory.findAll type:', typeof Inventory?.findAll);

    const items = await safeExec(
      () => Inventory ? Inventory.findAll({
        where: filter,
        offset: skip,
        limit: parseInt(limit),
        order: [['lastUpdated', 'DESC']],
        raw: true
      }) : Promise.resolve([]),
      []
    ) || [];
    
    console.log('[inventoryController] items result:', items?.length || 0, 'items');

    const total = await safeExec(
      () => Inventory ? Inventory.count({ where: filter }) : Promise.resolve(0),
      0
    );
    
    console.log('[inventoryController] total count:', total);

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
    console.error('Get inventory error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory',
      error: error.message
    });
  }
};

/**
 * Create new inventory item
 */
exports.createInventoryItem = async (req, res) => {
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
    const existing = await safeExec(
      () => Inventory.findOne({ sku }),
      null
    );
    
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
    console.error('Create inventory error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create inventory item',
      error: error.message
    });
  }
};

/**
 * Get specific inventory item by ID
 */
exports.getInventoryItem = async (req, res) => {
  try {
    const item = await safeExec(
      () => Inventory.findById(req.params.id),
      null
    );

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
    console.error('Get inventory item error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory item',
      error: error.message
    });
  }
};

/**
 * Update inventory item
 */
exports.updateInventoryItem = async (req, res) => {
  try {
    const { quantity, minimumLevel, maximumLevel, status, notes } = req.body;

    const item = await safeExec(
      () => Inventory.findByIdAndUpdate(
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
      ).populate(['product', 'warehouse']),
      null
    );

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
    console.error('Update inventory error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to update inventory item',
      error: error.message
    });
  }
};

/**
 * Delete inventory item
 */
exports.deleteInventoryItem = async (req, res) => {
  try {
    const item = await safeExec(
      () => Inventory.findByIdAndDelete(req.params.id),
      null
    );

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
    console.error('Delete inventory error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inventory item',
      error: error.message
    });
  }
};

// ==================== INVENTORY ALERTS OPERATIONS ====================

/**
 * Get alert summary statistics
 */
exports.getAlertSummary = async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const critical = await safeExec(
      () => InventoryAlert ? InventoryAlert.count({ where: { type: 'critical' } }) : Promise.resolve(0),
      0
    );
    const warning = await safeExec(
      () => InventoryAlert ? InventoryAlert.count({ where: { type: 'warning' } }) : Promise.resolve(0),
      0
    );
    const info = await safeExec(
      () => InventoryAlert ? InventoryAlert.count({ where: { type: 'info' } }) : Promise.resolve(0),
      0
    );

    res.json({
      success: true,
      data: { critical, warning, info }
    });
  } catch (error) {
    console.error('Get alert summary error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alert summary',
      error: error.message
    });
  }
};

/**
 * Get all inventory alerts with pagination
 */
exports.getAlertsList = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'pending', type } = req.query;
    const skip = (page - 1) * limit;

    const filter = { status };
    if (type) filter.type = type;

    console.log('[getAlertsList] Filter:', filter);
    console.log('[getAlertsList] InventoryAlert exists:', !!InventoryAlert);
    console.log('[getAlertsList] InventoryAlert.findAll type:', typeof InventoryAlert?.findAll);

    const alerts = await safeExec(
      () => InventoryAlert ? InventoryAlert.findAll({
        where: filter,
        offset: skip,
        limit: parseInt(limit),
        order: [['created_at', 'DESC']],
        raw: true
      }) : Promise.resolve([]),
      []
    );
    
    console.log('[getAlertsList] Alerts result:', alerts?.length || 0);

    const total = await safeExec(
      () => InventoryAlert ? InventoryAlert.count({ where: filter }) : Promise.resolve(0),
      0
    );
    
    console.log('[getAlertsList] Total count:', total);

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
    console.error('Get alerts error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message
    });
  }
};

/**
 * Update alert status
 */
exports.updateAlert = async (req, res) => {
  try {
    const { status, acknowledged } = req.body;

    const update = { status: status || 'pending' };
    if (acknowledged) {
      update.status = 'acknowledged';
      update.acknowledgedBy = req.user.id;
      update.acknowledgedAt = new Date();
    }

    const alert = await safeExec(
      () => InventoryAlert ? InventoryAlert.update(update, {
        where: { id: req.params.id },
        returning: true
      }).then(result => result[1][0]) : Promise.resolve(null),
      null
    );

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
    console.error('Update alert error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to update alert',
      error: error.message
    });
  }
};

/**
 * Delete alert
 */
exports.deleteAlert = async (req, res) => {
  try {
    const destroyed = await safeExec(
      () => InventoryAlert ? InventoryAlert.destroy({ where: { id: req.params.id } }) : Promise.resolve(0),
      0
    );

    if (destroyed === 0) {
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
    console.error('Delete alert error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to delete alert',
      error: error.message
    });
  }
};

// ==================== INVENTORY HISTORY OPERATIONS ====================

/**
 * Get inventory transaction history with filters
 */
exports.getHistoryList = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, warehouse, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;
    const { Op } = require('sequelize');

    const filter = {};
    if (type) filter.type = type;
    if (warehouse) filter.warehouseId = warehouse;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp[Op.gte] = new Date(startDate);
      if (endDate) filter.timestamp[Op.lte] = new Date(endDate);
    }

    const history = await safeExec(
      () => InventoryHistory ? InventoryHistory.findAll({
        where: filter,
        offset: skip,
        limit: parseInt(limit),
        order: [['timestamp', 'DESC']],
        raw: true
      }) : Promise.resolve([]),
      []
    );

    const total = await safeExec(
      () => InventoryHistory ? InventoryHistory.count({ where: filter }) : Promise.resolve(0),
      0
    );

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
    console.error('Get history error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch history',
      error: error.message
    });
  }
};

/**
 * Log inventory transaction
 */
exports.createHistoryEntry = async (req, res) => {
  try {
    const { transactionId, product, type, quantity, warehouse, reference, referenceType, notes } = req.body;

    // Validate required fields
    if (!transactionId || !product || !type || !quantity || !warehouse) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const entry = await safeExec(
      () => InventoryHistory ? InventoryHistory.create({
        transactionId,
        productId: product,
        type,
        quantity,
        warehouseId: warehouse,
        reference,
        referenceType: referenceType || 'Purchase',
        userId: req.user.id,
        notes
      }) : Promise.resolve(null),
      null
    );

    if (!entry) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create history entry'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Inventory transaction recorded',
      data: entry
    });
  } catch (error) {
    console.error('Create history error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to record inventory transaction',
      error: error.message
    });
  }
};

// ==================== WAREHOUSES OPERATIONS ====================

/**
 * Get all warehouses
 */
exports.getWarehouses = async (req, res) => {
  try {
    const warehouses = await safeExec(
      () => Warehouse ? Warehouse.findAll({ raw: true }) : Promise.resolve([]),
      []
    );

    res.json({
      success: true,
      data: warehouses
    });
  } catch (error) {
    console.error('Get warehouses error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warehouses',
      error: error.message
    });
  }
};

// ==================== SUPPLIERS OPERATIONS ====================

/**
 * Get all suppliers
 */
exports.getSuppliers = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'active' } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;

    const suppliers = await safeExec(
      () => Supplier ? Supplier.findAll({
        where: filter,
        offset: skip,
        limit: parseInt(limit),
        order: [['createdAt', 'DESC']],
        raw: true
      }) : Promise.resolve([]),
      []
    );

    const total = await safeExec(
      () => Supplier ? Supplier.count({ where: filter }) : Promise.resolve(0),
      0
    );

    res.json({
      success: true,
      data: suppliers,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get suppliers error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch suppliers',
      error: error.message
    });
  }
};
