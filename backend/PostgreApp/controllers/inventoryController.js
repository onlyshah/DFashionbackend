/**
 * ============================================================================
 * INVENTORY CONTROLLER - PostgreSQL/Sequelize Version
 * ============================================================================
 * Purpose: Stock/inventory management, alerts, warehouse operations
 * Database: PostgreSQL via Sequelize ORM
 * Methods: 14
 */

const { Op } = require('sequelize');
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.getInventoryStats = async (req, res) => {
  try {
    const totalItems = await models.Inventory?.count({ where: { status: 'active' } }) || 0;
    const lowStock = await models.Inventory?.count({ where: { status: 'active', quantity: { [Op.lte]: 10 } } }) || 0;
    const outOfStock = await models.Inventory?.count({ where: { status: 'active', quantity: 0 } }) || 0;
    const totalValue = (totalItems * 100).toFixed(2);

    return ApiResponse.success(res, { totalItems, lowStock, outOfStock, totalValue }, 'Inventory stats retrieved');
  } catch (error) {
    console.error('❌ getInventoryStats error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getInventoryList = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'active', warehouse, sku, product } = req.query;
    const skip = (page - 1) * limit;

    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    });
    await client.connect();

    let whereClause = 'i.status = $1';
    let paramCount = 2;
    let params = [status || 'active'];

    if (warehouse) { whereClause += ` AND i.warehouse_id = $${paramCount}`; params.push(parseInt(warehouse)); paramCount++; }
    if (sku) { whereClause += ` AND i.sku ILIKE $${paramCount}`; params.push(`%${sku}%`); paramCount++; }
    if (product) { whereClause += ` AND i.product_id = $${paramCount}`; params.push(parseInt(product)); paramCount++; }

    const countRes = await client.query(`SELECT COUNT(*) as count FROM inventories i WHERE ${whereClause}`, params);
    const total = parseInt(countRes.rows[0]?.count || 0);

    params.push(limit, skip);
    const itemsRes = await client.query(`
      SELECT i.id, i.product_id, i.warehouse_id, i.sku, i.quantity, i.minimum_level, i.maximum_level, i.status, i.notes, i.last_updated,
             w.id as wh_id, w.name as wh_name, p.id as p_id, p.name as p_name, p.sku as p_sku, p.price
      FROM inventories i LEFT JOIN warehouses w ON i.warehouse_id = w.id LEFT JOIN products p ON i.product_id = p.id
      WHERE ${whereClause} ORDER BY i.last_updated DESC LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `, params);

    await client.end();

    const data = itemsRes.rows.map(item => ({
      id: item.id, product_id: item.product_id, warehouse_id: item.warehouse_id, sku: item.sku,
      quantity: item.quantity, minimum_level: item.minimum_level, maximum_level: item.maximum_level, status: item.status, notes: item.notes,
      warehouse: { id: item.wh_id, name: item.wh_name },
      product: { id: item.p_id, name: item.p_name, sku: item.p_sku, price: item.price }
    }));

    return ApiResponse.paginated(res, data, 
      { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
      'Inventory list retrieved');
  } catch (error) {
    console.error('❌ getInventoryList error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.createInventoryItem = async (req, res) => {
  try {
    const { product, warehouse, sku, quantity, minimumLevel, maximumLevel } = req.body;

    if (!product || !warehouse || !sku) {
      return ApiResponse.error(res, 'Missing required fields', 422);
    }

    const existing = await models.Inventory?.findOne({ where: { sku } });
    if (existing) return ApiResponse.error(res, 'SKU already exists', 409);

    const item = await models.Inventory?.create({
      product_id: product, warehouse_id: warehouse, sku, quantity: quantity || 0,
      minimum_level: minimumLevel || 10, maximum_level: maximumLevel || 1000, status: 'active'
    });

    return ApiResponse.created(res, item, 'Inventory item created');
  } catch (error) {
    console.error('❌ createInventoryItem error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    });
    await client.connect();

    const res_query = await client.query(`
      SELECT i.id, i.product_id, i.warehouse_id, i.sku, i.quantity, i.minimum_level, i.maximum_level, i.status,
             w.id as wh_id, w.name as wh_name, w.location, w.city, p.id as p_id, p.name as p_name, p.sku as p_sku
      FROM inventories i LEFT JOIN warehouses w ON i.warehouse_id = w.id LEFT JOIN products p ON i.product_id = p.id
      WHERE i.id = $1
    `, [parseInt(id)]);

    await client.end();

    if (res_query.rows.length === 0) return ApiResponse.notFound(res, 'Inventory item');

    const item = res_query.rows[0];
    return ApiResponse.success(res, {
      id: item.id, product_id: item.product_id, warehouse_id: item.warehouse_id, sku: item.sku,
      quantity: item.quantity, minimum_level: item.minimum_level, maximum_level: item.maximum_level, status: item.status,
      warehouse: { id: item.wh_id, name: item.wh_name, location: item.location, city: item.city },
      product: { id: item.p_id, name: item.p_name, sku: item.p_sku }
    }, 'Inventory item retrieved');
  } catch (error) {
    console.error('❌ getInventoryItem error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, minimumLevel, maximumLevel, status, notes } = req.body;

    const item = await models.Inventory?.findByPk(id);
    if (!item) return ApiResponse.notFound(res, 'Inventory item');

    await item.update({
      quantity: quantity !== undefined ? quantity : item.quantity,
      minimum_level: minimumLevel || item.minimum_level,
      maximum_level: maximumLevel || item.maximum_level,
      status: status || item.status,
      notes: notes || item.notes
    });

    return ApiResponse.success(res, item, 'Inventory item updated');
  } catch (error) {
    console.error('❌ updateInventoryItem error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await models.Inventory?.findByPk(id);
    if (!item) return ApiResponse.notFound(res, 'Inventory item');

    await item.destroy();
    return ApiResponse.success(res, {}, 'Inventory item deleted');
  } catch (error) {
    console.error('❌ deleteInventoryItem error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getAlertSummary = async (req, res) => {
  try {
    const critical = await models.InventoryAlert?.count({ where: { type: 'critical' } }) || 0;
    const warning = await models.InventoryAlert?.count({ where: { type: 'warning' } }) || 0;
    const info = await models.InventoryAlert?.count({ where: { type: 'info' } }) || 0;

    return ApiResponse.success(res, { critical, warning, info }, 'Alert summary retrieved');
  } catch (error) {
    console.error('❌ getAlertSummary error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getAlertsList = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'pending', type } = req.query;
    const skip = (page - 1) * limit;

    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    });
    await client.connect();

    let whereClause = 'ia.status = $1';
    let paramCount = 2;
    let params = [status || 'pending'];

    if (type) { whereClause += ` AND ia.type = $${paramCount}`; params.push(type); paramCount++; }

    const countRes = await client.query(`SELECT COUNT(*) as count FROM inventory_alerts ia WHERE ${whereClause}`, params);
    const total = parseInt(countRes.rows[0]?.count || 0);

    params.push(limit, skip);
    const alertsRes = await client.query(`
      SELECT ia.id, ia.type, ia.product_id, ia.warehouse_id, ia.status, ia.message, ia.current_quantity, ia.minimum_level, ia.created_at,
             p.id as p_id, p.name as p_name, w.id as w_id, w.name as w_name
      FROM inventory_alerts ia LEFT JOIN products p ON ia.product_id = p.id LEFT JOIN warehouses w ON ia.warehouse_id = w.id
      WHERE ${whereClause} ORDER BY ia.created_at DESC LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `, params);

    await client.end();

    const data = alertsRes.rows.map(alert => ({
      id: alert.id, type: alert.type, status: alert.status, message: alert.message,
      current_quantity: alert.current_quantity, minimum_level: alert.minimum_level, created_at: alert.created_at,
      product: { id: alert.p_id, name: alert.p_name },
      warehouse: { id: alert.w_id, name: alert.w_name }
    }));

    return ApiResponse.paginated(res, data, 
      { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
      'Alerts retrieved');
  } catch (error) {
    console.error('❌ getAlertsList error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.updateAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, acknowledged } = req.body;

    const alert = await models.InventoryAlert?.findByPk(id);
    if (!alert) return ApiResponse.notFound(res, 'Alert');

    await alert.update({
      status: status || 'pending',
      ...(acknowledged && { acknowledged_at: new Date(), acknowledged_by: req.user?.id })
    });

    return ApiResponse.success(res, alert, 'Alert updated');
  } catch (error) {
    console.error('❌ updateAlert error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await models.InventoryAlert?.findByPk(id);
    if (!alert) return ApiResponse.notFound(res, 'Alert');

    await alert.destroy();
    return ApiResponse.success(res, {}, 'Alert deleted');
  } catch (error) {
    console.error('❌ deleteAlert error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getHistoryList = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, warehouse, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (type) where.type = type;
    if (warehouse) where.warehouse_id = warehouse;
    if (startDate) where.timestamp = { [Op.gte]: new Date(startDate) };
    if (endDate) where.timestamp = { ...(where.timestamp || {}), [Op.lte]: new Date(endDate) };

    const { count, rows } = await models.InventoryHistory?.findAndCountAll({
      where, limit: parseInt(limit), offset: skip, order: [['timestamp', 'DESC']]
    }) || { count: 0, rows: [] };

    return ApiResponse.paginated(res, rows, 
      { page: parseInt(page), limit: parseInt(limit), total: count, totalPages: Math.ceil(count / parseInt(limit)) },
      'History retrieved');
  } catch (error) {
    console.error('❌ getHistoryList error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.createHistoryEntry = async (req, res) => {
  try {
    const { transactionId, product, type, quantity, warehouse, reference, referenceType, notes } = req.body;

    if (!transactionId || !product || !type || !quantity || !warehouse) {
      return ApiResponse.error(res, 'Missing required fields', 422);
    }

    const entry = await models.InventoryHistory?.create({
      transaction_id: transactionId, product_id: product, type, quantity,
      warehouse_id: warehouse, reference, reference_type: referenceType || 'Purchase',
      user_id: req.user?.id, notes
    });

    return ApiResponse.created(res, entry, 'History entry created');
  } catch (error) {
    console.error('❌ createHistoryEntry error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getWarehouses = async (req, res) => {
  try {
    const warehouses = await models.Warehouse?.findAll({ raw: true }) || [];
    return ApiResponse.success(res, warehouses, 'Warehouses retrieved');
  } catch (error) {
    console.error('❌ getWarehouses error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getSuppliers = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'active' } = req.query;
    const { limit: validated_limit, offset } = { limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit) };

    const { count, rows } = await models.Supplier?.findAndCountAll({
      where: { status }, limit: validated_limit, offset, order: [['createdAt', 'DESC']]
    }) || { count: 0, rows: [] };

    return ApiResponse.paginated(res, rows, 
      { page: parseInt(page), limit: validated_limit, total: count, totalPages: Math.ceil(count / validated_limit) },
      'Suppliers retrieved');
  } catch (error) {
    console.error('❌ getSuppliers error:', error);
    return ApiResponse.serverError(res, error);
  }
};


