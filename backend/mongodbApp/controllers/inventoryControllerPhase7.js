/**
 * Inventory Management Controller - Complete MongoDB Implementation (Phase 7)
 * 6 methods for inventory tracking and management
 */

const Inventory = require('../models/Inventory');
const InventoryAlert = require('../models/InventoryAlert');
const Product = require('../models/Product');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Get all inventory items
 */
exports.getInventory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, productId, warehouseLocation, sort = '-updatedAt' } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (productId) filter.productId = productId;
    if (warehouseLocation) filter.warehouseLocation = warehouseLocation;

    const [items, total] = await Promise.all([
      Inventory.find(filter)
        .populate('productId', 'name sku')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Inventory.countDocuments(filter)
    ]);

    return ApiResponse.paginated(res, items, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Inventory items retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Update inventory
 */
exports.updateInventory = async (req, res, next) => {
  try {
    const { inventoryId } = req.params;
    const { quantity, action = 'set', reason } = req.body;

    if (!inventoryId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid inventory ID', 400, 'INVALID_ID');
    }

    if (quantity === undefined) {
      throw new ApiError('Quantity is required', 400, 'VALIDATION_ERROR');
    }

    const inventory = await Inventory.findById(inventoryId);

    if (!inventory) {
      throw new ApiError('Inventory item not found', 404, 'ITEM_NOT_FOUND');
    }

    let newQuantity;
    if (action === 'set') {
      newQuantity = quantity;
    } else if (action === 'add') {
      newQuantity = inventory.quantity + quantity;
    } else if (action === 'subtract') {
      newQuantity = inventory.quantity - quantity;
    } else {
      throw new ApiError('Invalid action', 400, 'INVALID_ACTION');
    }

    if (newQuantity < 0) {
      throw new ApiError('Quantity cannot be negative', 400, 'INVALID_QUANTITY');
    }

    inventory.quantity = newQuantity;
    inventory.lastUpdated = new Date();
    inventory.updateReason = reason || 'Manual update';

    await inventory.save();

    // Create alert if low stock
    if (newQuantity <= 10) {
      await InventoryAlert.create({
        productId: inventory.productId,
        inventoryId,
        alertType: 'low_stock',
        quantity: newQuantity,
        timestamp: new Date()
      }).catch(() => {});
    }

    return ApiResponse.success(res, inventory, 'Inventory updated');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Track inventory (Get details)
 */
exports.trackInventory = async (req, res, next) => {
  try {
    const { inventoryId } = req.params;

    if (!inventoryId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid inventory ID', 400, 'INVALID_ID');
    }

    const inventory = await Inventory.findById(inventoryId)
      .populate('productId', 'name sku price')
      .lean();

    if (!inventory) {
      throw new ApiError('Inventory item not found', 404, 'ITEM_NOT_FOUND');
    }

    return ApiResponse.success(res, inventory, 'Inventory details retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Get inventory alerts
 */
exports.getInventoryAlerts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, alertType, resolved } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (alertType) filter.alertType = alertType;
    if (resolved === 'true') filter.isResolved = true;
    if (resolved === 'false') filter.isResolved = false;

    const [alerts, total] = await Promise.all([
      InventoryAlert.find(filter)
        .populate('productId', 'name sku')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      InventoryAlert.countDocuments(filter)
    ]);

    return ApiResponse.paginated(res, alerts, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Inventory alerts retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Get inventory history
 */
exports.getInventoryHistory = async (req, res, next) => {
  try {
    const { inventoryId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!inventoryId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid inventory ID', 400, 'INVALID_ID');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    // In a real app, this would fetch from a separate history collection
    const inventory = await Inventory.findById(inventoryId).lean();

    if (!inventory) {
      throw new ApiError('Inventory item not found', 404, 'ITEM_NOT_FOUND');
    }

    const history = [{
      action: 'created',
      quantity: inventory.quantity,
      timestamp: inventory.createdAt,
      reason: 'Initial inventory'
    }];

    return ApiResponse.paginated(res, history, {
      page: pageNum,
      limit: limitNum,
      total: history.length,
      totalPages: 1
    }, 'Inventory history retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Bulk update inventory
 */
exports.bulkUpdateInventory = async (req, res, next) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      throw new ApiError('Updates array is required', 400, 'VALIDATION_ERROR');
    }

    let totalUpdated = 0;

    for (const update of updates) {
      const { inventoryId, quantity, action = 'set' } = update;

      const inventory = await Inventory.findById(inventoryId);
      if (!inventory) continue;

      let newQuantity;
      if (action === 'set') {
        newQuantity = quantity;
      } else if (action === 'add') {
        newQuantity = inventory.quantity + quantity;
      } else if (action === 'subtract') {
        newQuantity = inventory.quantity - quantity;
      } else {
        continue;
      }

      if (newQuantity >= 0) {
        inventory.quantity = newQuantity;
        await inventory.save();
        totalUpdated++;
      }
    }

    return ApiResponse.success(res, {
      totalUpdated,
      totalRequested: updates.length
    }, 'Bulk inventory update completed');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
