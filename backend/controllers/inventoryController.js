/**
 * Inventory Controller
 * Handles all business logic for inventory management
 * Model → Controller → Routes pattern
 */

const dbType = (process.env.DB_TYPE || '').toLowerCase();
const models = dbType === 'postgres' ? require('../models_sql') : require('../models');
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
 * Includes warehouse and product details via joins
 */
exports.getInventoryList = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'active', warehouse, sku, product } = req.query;
    const skip = (page - 1) * limit;

    console.log('[inventoryController] getInventoryList - filters:', { page, limit, status, warehouse, sku, product });

    // Use raw query with joins to include warehouse and product details
    const db = require('../config').getSequelize?.() || null;
    const sequelize = db;
    let items = [];

    if (sequelize) {
      try {
        // Build query with joins using raw SQL for better performance
        const query = `
          SELECT 
            i.id,
            i.product_id,
            i.warehouse_id,
            i.sku,
            i.quantity,
            i.minimum_level,
            i.maximum_level,
            i.status,
            i.notes,
            i.last_updated,
            i.last_movement,
            i.created_at,
            i.updated_at,
            w.id as warehouse_id_ref,
            w.name as warehouse_name,
            w.location as warehouse_location,
            w.city as warehouse_city,
            w.manager as warehouse_manager,
            p.id as product_id_ref,
            p.name as product_name,
            p.sku as product_sku,
            p.price as product_price
          FROM inventories i
          LEFT JOIN warehouses w ON i.warehouse_id = w.id
          LEFT JOIN products p ON i.product_id = p.id
          WHERE i.status = :status
            ${warehouse ? 'AND i.warehouse_id = :warehouse' : ''}
            ${sku ? 'AND i.sku ILIKE :sku' : ''}
            ${product ? 'AND i.product_id = :product' : ''}
          ORDER BY i.last_updated DESC
          LIMIT :limit OFFSET :offset
        `;
        
        const params = {
          status: status || 'active',
          warehouse: warehouse ? parseInt(warehouse) : null,
          sku: sku ? `%${sku}%` : null,
          product: product ? parseInt(product) : null,
          limit: parseInt(limit),
          offset: skip
        };

        const rawItems = await sequelize.query(query, {
          replacements: params,
          type: sequelize.QueryTypes.SELECT,
          raw: true
        });

        console.log('[inventoryController] Query returned', rawItems.length, 'items');

        // Transform response to include nested warehouse and product objects
        items = rawItems.map(item => ({
          id: item.id,
          product_id: item.product_id,
          warehouse_id: item.warehouse_id,
          sku: item.sku,
          quantity: item.quantity,
          minimum_level: item.minimum_level,
          reorderLevel: item.minimum_level,  // Alias for frontend
          maximum_level: item.maximum_level,
          status: item.status,
          notes: item.notes,
          lastUpdated: item.last_updated,
          lastMovement: item.last_movement,
          created_at: item.created_at,
          updated_at: item.updated_at,
          // Nested warehouse object
          warehouse: {
            id: item.warehouse_id_ref,
            name: item.warehouse_name || 'Unknown Warehouse',
            location: item.warehouse_location,
            city: item.warehouse_city,
            manager: item.warehouse_manager
          },
          // Nested product object
          product: {
            id: item.product_id_ref,
            name: item.product_name || 'Unknown Product',
            sku: item.product_sku,
            price: item.product_price
          }
        }));
      } catch (joinError) {
        console.warn('[inventoryController] Raw join query failed:', joinError.message);
        // Fallback: get basic inventory data
        const whereClause = `WHERE status = '${status || 'active'}'`;
        const fallbackQuery = `SELECT * FROM inventories ${whereClause} ORDER BY last_updated DESC LIMIT ${limit} OFFSET ${skip}`;
        items = (await sequelize.query(fallbackQuery, { type: sequelize.QueryTypes.SELECT, raw: true })) || [];
      }
    }
    
    console.log('[inventoryController] Final items count:', items.length);

    // Get total count with same filters
    let total = 0;
    try {
      const countQuery = `
        SELECT COUNT(*) as count FROM inventories i
        WHERE i.status = :status
          ${warehouse ? 'AND i.warehouse_id = :warehouse' : ''}
          ${sku ? 'AND i.sku ILIKE :sku' : ''}
          ${product ? 'AND i.product_id = :product' : ''}
      `;
      
      const params = {
        status: status || 'active',
        warehouse: warehouse ? parseInt(warehouse) : null,
        sku: sku ? `%${sku}%` : null,
        product: product ? parseInt(product) : null
      };

      const countResult = await sequelize.query(countQuery, {
        replacements: params,
        type: sequelize.QueryTypes.SELECT,
        raw: true
      });
      
      total = parseInt(countResult[0]?.count || 0);
    } catch (countError) {
      console.warn('[inventoryController] Count query failed:', countError.message);
      total = items.length;
    }
    
    console.log('[inventoryController] Total count:', total);

    res.json({
      success: true,
      data: items,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('[inventoryController] Get inventory error:', error.message, error.stack);
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

    // validate product and warehouse foreign keys
    if (dbType === 'postgres') {
      const sqlModels = require('../models_sql');
      const prod = await sqlModels.Product.findByPk(product);
      if (!prod) {
        return res.status(400).json({ success: false, message: 'Product not found' });
      }
      const wh = await sqlModels.Warehouse.findByPk(warehouse);
      if (!wh) {
        return res.status(400).json({ success: false, message: 'Warehouse not found' });
      }
    } else {
      const prod = await Inventory.db ? await models.Product.findById(product) : null;
      if (!prod) {
        return res.status(400).json({ success: false, message: 'Product not found' });
      }
      const wh = await models.Warehouse.findById(warehouse);
      if (!wh) {
        return res.status(400).json({ success: false, message: 'Warehouse not found' });
      }
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
    const db = require('../config').getSequelize?.() || null;
    const sequelize = db;
    let item = null;

    if (sequelize) {
      // Use raw SQL with joins for better data enrichment
      try {
        const query = `
          SELECT 
            i.id,
            i.product_id,
            i.warehouse_id,
            i.sku,
            i.quantity,
            i.minimum_level,
            i.maximum_level,
            i.status,
            i.notes,
            i.last_updated,
            i.last_movement,
            i.created_at,
            i.updated_at,
            w.id as warehouse_id_ref,
            w.name as warehouse_name,
            w.location as warehouse_location,
            w.address as warehouse_address,
            w.city as warehouse_city,
            w.state as warehouse_state,
            w.zip_code as warehouse_zip,
            w.country as warehouse_country,
            w.manager as warehouse_manager,
            w.phone as warehouse_phone,
            w.email as warehouse_email,
            p.id as product_id_ref,
            p.name as product_name,
            p.sku as product_sku,
            p.price as product_price,
            p.description as product_description
          FROM inventories i
          LEFT JOIN warehouses w ON i.warehouse_id = w.id
          LEFT JOIN products p ON i.product_id = p.id
          WHERE i.id = :id
        `;

        const result = await sequelize.query(query, {
          replacements: { id: parseInt(req.params.id) },
          type: sequelize.QueryTypes.SELECT,
          raw: true
        });

        if (result.length > 0) {
          const rawItem = result[0];
          item = {
            id: rawItem.id,
            product_id: rawItem.product_id,
            warehouse_id: rawItem.warehouse_id,
            sku: rawItem.sku,
            quantity: rawItem.quantity,
            minimum_level: rawItem.minimum_level,
            reorderLevel: rawItem.minimum_level,  // Alias
            maximum_level: rawItem.maximum_level,
            status: rawItem.status,
            notes: rawItem.notes,
            lastUpdated: rawItem.last_updated,
            lastMovement: rawItem.last_movement,
            created_at: rawItem.created_at,
            updated_at: rawItem.updated_at,
            warehouse: {
              id: rawItem.warehouse_id_ref,
              name: rawItem.warehouse_name || 'Unknown Warehouse',
              location: rawItem.warehouse_location,
              address: rawItem.warehouse_address,
              city: rawItem.warehouse_city,
              state: rawItem.warehouse_state,
              zipCode: rawItem.warehouse_zip,
              country: rawItem.warehouse_country,
              manager: rawItem.warehouse_manager,
              phone: rawItem.warehouse_phone,
              email: rawItem.warehouse_email
            },
            product: {
              id: rawItem.product_id_ref,
              name: rawItem.product_name || 'Unknown Product',
              sku: rawItem.product_sku,
              price: rawItem.product_price,
              description: rawItem.product_description
            }
          };
        }
      } catch (joinError) {
        console.warn('[inventoryController] Raw join query failed for getInventoryItem:', joinError.message);
        // Fallback: basic query
        const basicQuery = `SELECT * FROM inventories WHERE id = :id`;
        const result = await sequelize.query(basicQuery, {
          replacements: { id: parseInt(req.params.id) },
          type: sequelize.QueryTypes.SELECT,
          raw: true
        });
        item = result.length > 0 ? result[0] : null;
      }
    }

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
    console.error('[inventoryController] Get inventory item error:', error.message, error.stack);
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

    console.log('[getAlertsList] Loading alerts with filters:', { status, type, page, limit });

    const db = require('../config').getSequelize?.() || null;
    const sequelize = db;
    let alerts = [];

    if (sequelize) {
      try {
        // Use raw SQL with LEFT JOINs to include product and warehouse details
        const query = `
          SELECT 
            ia.id,
            ia.type,
            ia.product_id,
            ia.warehouse_id,
            ia.status,
            ia.message,
            ia.current_quantity,
            ia.minimum_level,
            ia.created_at,
            ia.updated_at,
            p.id as product_id_ref,
            p.name as product_name,
            w.id as warehouse_id_ref,
            w.name as warehouse_name,
            w.location as warehouse_location,
            w.city as warehouse_city
          FROM inventory_alerts ia
          LEFT JOIN products p ON ia.product_id = p.id
          LEFT JOIN warehouses w ON ia.warehouse_id = w.id
          WHERE ia.status = :status
            ${type ? 'AND ia.type = :type' : ''}
          ORDER BY ia.created_at DESC
          LIMIT :limit OFFSET :offset
        `;
        
        const params = {
          status: status || 'pending',
          type: type || null,
          limit: parseInt(limit),
          offset: skip
        };

        const rawAlerts = await sequelize.query(query, {
          replacements: params,
          type: sequelize.QueryTypes.SELECT,
          raw: true
        });

        // Transform response to include nested objects
        alerts = rawAlerts.map(alert => ({
          id: alert.id,
          type: alert.type,
          status: alert.status,
          message: alert.message,
          current_quantity: alert.current_quantity,
          minimum_level: alert.minimum_level,
          created_at: alert.created_at,
          updated_at: alert.updated_at,
          product: {
            id: alert.product_id_ref,
            name: alert.product_name || 'Unknown Product'
          },
          warehouse: {
            id: alert.warehouse_id_ref,
            name: alert.warehouse_name || 'Unknown Warehouse',
            location: alert.warehouse_location,
            city: alert.warehouse_city
          }
        }));
      } catch (joinError) {
        console.warn('[getAlertsList] Raw join query failed, using fallback:', joinError.message);
        const fallbackQuery = `SELECT * FROM inventory_alerts WHERE status = :status ${type ? 'AND type = :type' : ''} ORDER BY created_at DESC LIMIT :limit OFFSET :offset`;
        const params = { status: status || 'pending', type: type || null, limit: parseInt(limit), offset: skip };
        alerts = (await sequelize.query(fallbackQuery, { replacements: params, type: sequelize.QueryTypes.SELECT, raw: true })) || [];
      }
    }
    
    console.log('[getAlertsList] Alerts result:', alerts?.length || 0);

    // Get total count
    let total = 0;
    if (sequelize) {
      try {
        const countQuery = `SELECT COUNT(*) as count FROM inventory_alerts WHERE status = :status ${type ? 'AND type = :type' : ''}`;
        const params = { status: status || 'pending', type: type || null };
        const countResult = await sequelize.query(countQuery, { replacements: params, type: sequelize.QueryTypes.SELECT, raw: true });
        total = parseInt(countResult[0]?.count || 0);
      } catch (e) {
        console.warn('[getAlertsList] Count query failed:', e.message);
        total = alerts.length;
      }
    }
    
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

    console.log('[getHistoryList] Loading history with filters:', { type, warehouse, page, limit });

    const db = require('../config').getSequelize?.() || null;
    const sequelize = db;
    let history = [];

    if (sequelize) {
      try {
        // Use raw SQL with LEFT JOINs for product, warehouse, and user details
        const query = `
          SELECT 
            ih.id,
            ih.transaction_id,
            ih.product_id,
            ih.warehouse_id,
            ih.type,
            ih.quantity,
            ih.reference,
            ih.reference_type,
            ih.user_id,
            ih.notes,
            ih.timestamp,
            ih.created_at,
            p.id as product_id_ref,
            p.name as product_name,
            w.id as warehouse_id_ref,
            w.name as warehouse_name,
            w.location as warehouse_location,
            w.city as warehouse_city,
            u.id as user_id_ref,
            u.username as user_name,
            u.first_name,
            u.last_name
          FROM inventory_histories ih
          LEFT JOIN products p ON ih.product_id = p.id
          LEFT JOIN warehouses w ON ih.warehouse_id = w.id
          LEFT JOIN users u ON ih.user_id = u.id
          WHERE 1=1
            ${type ? 'AND ih.type = :type' : ''}
            ${warehouse ? 'AND ih.warehouse_id = :warehouse' : ''}
            ${startDate ? 'AND ih.timestamp >= :startDate' : ''}
            ${endDate ? 'AND ih.timestamp <= :endDate' : ''}
          ORDER BY ih.timestamp DESC
          LIMIT :limit OFFSET :offset
        `;
        
        const params = {
          type: type || null,
          warehouse: warehouse ? parseInt(warehouse) : null,
          startDate: startDate || null,
          endDate: endDate || null,
          limit: parseInt(limit),
          offset: skip
        };

        const rawHistory = await sequelize.query(query, {
          replacements: params,
          type: sequelize.QueryTypes.SELECT,
          raw: true
        });

        // Transform response to include nested objects
        history = rawHistory.map(record => ({
          id: record.id,
          transaction_id: record.transaction_id,
          type: record.type,
          quantity: record.quantity,
          reference: record.reference,
          reference_type: record.reference_type,
          notes: record.notes,
          timestamp: record.timestamp,
          created_at: record.created_at,
          product: {
            id: record.product_id_ref,
            name: record.product_name || 'Unknown Product'
          },
          warehouse: {
            id: record.warehouse_id_ref,
            name: record.warehouse_name || 'Unknown Warehouse',
            location: record.warehouse_location,
            city: record.warehouse_city
          },
          user: {
            id: record.user_id_ref,
            username: record.user_name,
            firstName: record.first_name,
            lastName: record.last_name,
            fullName: `${record.first_name || ''} ${record.last_name || ''}`.trim()
          }
        }));
      } catch (joinError) {
        console.warn('[getHistoryList] Raw join query failed, using fallback:', joinError.message);
        const fallbackQuery = `SELECT * FROM inventory_histories WHERE 1=1 ${type ? 'AND type = :type' : ''} ${warehouse ? 'AND warehouse_id = :warehouse' : ''} ORDER BY timestamp DESC LIMIT :limit OFFSET :offset`;
        const params = { type: type || null, warehouse: warehouse ? parseInt(warehouse) : null, limit: parseInt(limit), offset: skip };
        history = (await sequelize.query(fallbackQuery, { replacements: params, type: sequelize.QueryTypes.SELECT, raw: true })) || [];
      }
    }

    // Get total count
    let total = 0;
    if (sequelize) {
      try {
        const countQuery = `SELECT COUNT(*) as count FROM inventory_histories WHERE 1=1 ${type ? 'AND type = :type' : ''} ${warehouse ? 'AND warehouse_id = :warehouse' : ''}`;
        const params = { type: type || null, warehouse: warehouse ? parseInt(warehouse) : null };
        const countResult = await sequelize.query(countQuery, { replacements: params, type: sequelize.QueryTypes.SELECT, raw: true });
        total = parseInt(countResult[0]?.count || 0);
      } catch (e) {
        console.warn('[getHistoryList] Count query failed:', e.message);
        total = history.length;
      }
    }

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
    const db = require('../config').getSequelize?.() || null;
    const sequelize = db;
    let warehouses = [];

    if (sequelize) {
      try {
        // Use raw SQL to join with users for manager details
        const query = `
          SELECT 
            w.id,
            w.name,
            w.location,
            w.address,
            w.city,
            w.state,
            w.country,
            w.postal_code,
            w.phone,
            w.manager_id,
            w.is_active,
            w.created_at,
            w.updated_at,
            u.id as manager_id_ref,
            u.username as manager_username,
            u.first_name as manager_first_name,
            u.last_name as manager_last_name,
            u.email as manager_email
          FROM warehouses w
          LEFT JOIN users u ON w.manager_id = u.id
          ORDER BY w.created_at DESC
        `;

        const rawWarehouses = await sequelize.query(query, {
          type: sequelize.QueryTypes.SELECT,
          raw: true
        });

        // Transform response to include manager details
        warehouses = rawWarehouses.map(warehouse => ({
          id: warehouse.id,
          name: warehouse.name,
          location: warehouse.location,
          address: warehouse.address,
          city: warehouse.city,
          state: warehouse.state,
          country: warehouse.country,
          postal_code: warehouse.postal_code,
          phone: warehouse.phone,
          is_active: warehouse.is_active,
          created_at: warehouse.created_at,
          updated_at: warehouse.updated_at,
          manager: warehouse.manager_id_ref ? {
            id: warehouse.manager_id_ref,
            username: warehouse.manager_username,
            firstName: warehouse.manager_first_name,
            lastName: warehouse.manager_last_name,
            email: warehouse.manager_email,
            fullName: `${warehouse.manager_first_name || ''} ${warehouse.manager_last_name || ''}`.trim()
          } : null,
          manager_id: warehouse.manager_id
        }));
      } catch (joinError) {
        console.warn('[getWarehouses] Raw join query failed, using fallback:', joinError.message);
        const fallbackQuery = `SELECT * FROM warehouses ORDER BY created_at DESC`;
        warehouses = (await sequelize.query(fallbackQuery, { type: sequelize.QueryTypes.SELECT, raw: true })) || [];
      }
    } else {
      warehouses = await safeExec(
        () => Warehouse ? Warehouse.findAll({ raw: true }) : Promise.resolve([]),
        []
      );
    }

    res.json({
      success: true,
      data: warehouses
    });
  } catch (error) {
    console.error('[getWarehouses] Error:', error.message, error.stack);
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

    console.log('[getSuppliers] Loading suppliers with filters:', { status, page, limit });

    const db = require('../config').getSequelize?.() || null;
    const sequelize = db;
    let suppliers = [];
    let total = 0;

    if (sequelize) {
      try {
        // Use raw SQL to get suppliers with all fields
        const query = `
          SELECT 
            id,
            name,
            email,
            phone,
            address,
            city,
            state,
            "zipCode" as zip_code,
            country,
            "contactPerson" as contact_person,
            website,
            "companyRegistration" as company_registration,
            "taxId" as tax_id,
            "paymentTerms" as payment_terms,
            "minimumOrderQuantity" as minimum_order_quantity,
            "leadTime" as lead_time,
            status,
            rating,
            notes,
            "createdAt" as created_at,
            "updatedAt" as updated_at
          FROM suppliers
          WHERE status = :status
          ORDER BY "createdAt" DESC
          LIMIT :limit OFFSET :offset
        `;

        const countQuery = `SELECT COUNT(*) as count FROM suppliers WHERE status = :status`;
        const params = {
          status: status || 'active',
          limit: parseInt(limit),
          offset: skip
        };

        const rawSuppliers = await sequelize.query(query, {
          replacements: params,
          type: sequelize.QueryTypes.SELECT,
          raw: true
        });

        const countResult = await sequelize.query(countQuery, {
          replacements: { status: status || 'active' },
          type: sequelize.QueryTypes.SELECT,
          raw: true
        });

        total = parseInt(countResult[0]?.count || 0);

        // Transform response to include contact information
        suppliers = rawSuppliers.map(supplier => ({
          id: supplier.id,
          name: supplier.name,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          city: supplier.city,
          state: supplier.state,
          zipCode: supplier.zip_code,
          country: supplier.country,
          website: supplier.website,
          companyRegistration: supplier.company_registration,
          taxId: supplier.tax_id,
          paymentTerms: supplier.payment_terms,
          minimumOrderQuantity: supplier.minimum_order_quantity,
          leadTime: supplier.lead_time,
          status: supplier.status,
          rating: supplier.rating,
          notes: supplier.notes,
          created_at: supplier.created_at,
          updated_at: supplier.updated_at,
          contact: {
            person: supplier.contact_person,
            email: supplier.email,
            phone: supplier.phone
          }
        }));
      } catch (joinError) {
        console.warn('[getSuppliers] Raw query failed, using fallback:', joinError.message);
        const fallbackQuery = `SELECT * FROM suppliers WHERE status = :status ORDER BY "createdAt" DESC LIMIT :limit OFFSET :offset`;
        const params = { status: status || 'active', limit: parseInt(limit), offset: skip };
        suppliers = (await sequelize.query(fallbackQuery, { replacements: params, type: sequelize.QueryTypes.SELECT, raw: true })) || [];
        total = suppliers.length;
      }
    } else {
      const filter = {};
      if (status) filter.status = status;

      suppliers = await safeExec(
        () => Supplier ? Supplier.findAll({
          where: filter,
          offset: skip,
          limit: parseInt(limit),
          order: [['createdAt', 'DESC']],
          raw: true
        }) : Promise.resolve([]),
        []
      );

      total = await safeExec(
        () => Supplier ? Supplier.count({ where: filter }) : Promise.resolve(0),
        0
      );
    }

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
    console.error('[getSuppliers] Error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch suppliers',
      error: error.message
    });
  }
};
