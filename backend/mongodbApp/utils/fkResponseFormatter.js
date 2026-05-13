/**
 * Foreign Key Response Sanitizer & Formatter
 * Standardizes API responses across entire backend
 * Removes raw FK IDs, includes related objects, parses JSON fields
 */

/**
 * Sanitize a single record - parses JSON fields only (SAFE VERSION)
 * @param {Object} record - Sequelize/Mongoose record
 * @param {Object} options - Configuration options
 * @returns {Object} - Formatted response
 */
function sanitizeRecord(record, options = {}) {
  if (!record) return null;

  try {
    const json = record.toJSON ? record.toJSON() : record;
    const sanitized = { ...json };

    // ONLY parse JSON string fields into objects (less aggressive)
    const jsonFields = [
      'shippingAddress', 'shipping_address',
      'billingAddress', 'billing_address',
      'metadata', 'data', 'attributes',
      'settings', 'extra', 'config'
    ];

    jsonFields.forEach(field => {
      if (sanitized[field] && typeof sanitized[field] === 'string') {
        try {
          sanitized[field] = JSON.parse(sanitized[field]);
        } catch (e) {
          // If parsing fails, keep as string
        }
      }
    });

    return sanitized;
  } catch (error) {
    console.error('❌ sanitizeRecord error:', error);
    // Return original if sanitization fails (SAFE FALLBACK)
    return record.toJSON ? record.toJSON() : record;
  }
}

/**
 * Sanitize array of records
 * @param {Array} records - Array of records
 * @param {Object} options - Configuration options
 * @returns {Array} - Formatted records
 */
function sanitizeRecords(records, options = {}) {
  if (!Array.isArray(records)) return [];
  return records.map(record => sanitizeRecord(record, options)).filter(r => r !== null);
}

/**
 * Build comprehensive include clause for a model
 * Maps model name to all its relationships
 * @param {string} modelName - Name of model (e.g., 'Order', 'Product', 'User')
 * @returns {Array} - Sequelize include array
 */
function buildIncludeClause(modelName) {
  const models = require('../models_sql');
  const rawModels = models._raw || models;
  
  const includeMap = {
    'Order': [
      { model: rawModels.User, as: 'customer', attributes: ['id', 'email', 'firstName', 'lastName', 'phone'] },
      { model: rawModels.Payment, as: 'payments', attributes: ['id', 'status', 'amount', 'paymentMethod'], required: false },
      { model: rawModels.Shipment, as: 'shipments', attributes: ['id', 'status', 'trackingNumber'], required: false },
      { model: rawModels.Return, as: 'returns', attributes: ['id', 'status', 'reason'], required: false }
    ],
    'Product': [
      { model: rawModels.Brand, as: 'brand', attributes: ['id', 'name'] },
      { model: rawModels.Category, as: 'category', attributes: ['id', 'name'] },
      { model: rawModels.User, as: 'seller', attributes: ['id', 'firstName', 'lastName', 'email'] },
      { model: rawModels.Inventory, as: 'inventory', attributes: ['id', 'quantity', 'warehouseId'], required: false }
    ],
    'Cart': [
      { model: rawModels.User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'], required: false },
      { model: rawModels.Product, as: 'product', attributes: ['id', 'name', 'price', 'images', 'stock'] }
    ],
    'Payment': [
      { model: rawModels.Order, as: 'order', attributes: ['id', 'orderNumber', 'totalAmount'] }
    ],
    'Shipment': [
      { model: rawModels.Order, as: 'order', attributes: ['id', 'orderNumber'] },
      { model: rawModels.Courier, as: 'courier', attributes: ['id', 'name', 'trackingUrl'] }
    ],
    'ProductComment': [
      { model: rawModels.Product, as: 'product', attributes: ['id', 'name'] },
      { model: rawModels.User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'avatar'] }
    ],
    'Wishlist': [
      { model: rawModels.User, as: 'user', attributes: ['id', 'email'], required: false },
      { model: rawModels.Product, as: 'product', attributes: ['id', 'name', 'price', 'images', 'stock'] }
    ],
    'Post': [
      { model: rawModels.User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'avatar'] }
    ],
    'Story': [
      { model: rawModels.User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'avatar'] }
    ],
    'Reel': [
      { model: rawModels.User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'avatar', 'email'] }
    ],
    'Return': [
      { model: rawModels.Order, as: 'order', attributes: ['id', 'orderNumber', 'status'], required: false },
      { model: rawModels.User, as: 'customer', attributes: ['id', 'firstName', 'lastName', 'email'], required: false }
    ],
    'Inventory': [
      { model: rawModels.Product, as: 'product', attributes: ['id', 'name', 'price'] },
      { model: rawModels.Warehouse, as: 'warehouse', attributes: ['id', 'name', 'location'], required: false }
    ],
    'Ticket': [
      { model: rawModels.User, as: 'user', attributes: ['id', 'name', 'email'], required: false },
      { model: rawModels.SupportReply, as: 'replies', attributes: ['id', 'message', 'created_at'], required: false }
    ],
    'Notification': [
      { model: rawModels.User, as: 'user', attributes: ['id', 'name', 'email'], required: false }
    ],
    'SellerCommission': [
      { model: rawModels.User, as: 'seller', attributes: ['id', 'firstName', 'lastName', 'email'], required: false },
      { model: rawModels.Order, as: 'order', attributes: ['id', 'orderNumber'], required: false }
    ],
    'KYC': [
      { model: rawModels.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'], required: false }
    ]
  };

  return includeMap[modelName] || [];
}

/**
 * Format response for paginated data
 * @param {Array} data - Records
 * @param {Object} pagination - Pagination metadata
 * @param {Object} options - Formatting options
 * @returns {Object} - Formatted response
 */
function formatPaginatedResponse(data, pagination, options = {}) {
  try {
    if (!Array.isArray(data)) {
      console.warn('[FK Formatter] Warning: data is not array', data);
      return {
        data: Array.isArray(data) ? data : [],
        pagination: {
          page: pagination?.page || 1,
          limit: pagination?.limit || 10,
          total: pagination?.total || 0,
          totalPages: pagination?.totalPages || 0
        }
      };
    }

    const formatted = sanitizeRecords(data, options);
    
    // Safety check: if we lost all data, return original
    if (data.length > 0 && formatted.length === 0) {
      console.warn('[FK Formatter] Warning: lost all data during formatting, returning original');
      return {
        data: data,
        pagination: {
          page: pagination?.page || 1,
          limit: pagination?.limit || 10,
          total: pagination?.total || 0,
          totalPages: pagination?.totalPages || 0
        }
      };
    }

    return {
      data: formatted,
      pagination: {
        page: pagination?.page || 1,
        limit: pagination?.limit || 10,
        total: pagination?.total || 0,
        totalPages: pagination?.totalPages || 0
      }
    };
  } catch (error) {
    console.error('[FK Formatter] Error in formatPaginatedResponse:', error);
    // SAFE FALLBACK: return original data if formatting fails
    return {
      data: Array.isArray(data) ? data : [],
      pagination: {
        page: pagination?.page || 1,
        limit: pagination?.limit || 10,
        total: pagination?.total || 0,
        totalPages: pagination?.totalPages || 0
      }
    };
  }
}

/**
 * Format single record response
 * @param {Object} record - Single record
 * @param {Object} options - Formatting options
 * @returns {Object} - Formatted record
 */
function formatSingleResponse(record, options = {}) {
  try {
    return sanitizeRecord(record, options);
  } catch (error) {
    console.error('[FK Formatter] Error in formatSingleResponse:', error);
    // SAFE FALLBACK: return original record if formatting fails
    return record.toJSON ? record.toJSON() : record;
  }
}

/**
 * FK Validation - Check if referenced record exists
 * Usage: await validateFK('User', userId)
 * @param {string} modelName - Name of model to check
 * @param {string|UUID} recordId - ID to check
 * @returns {Promise<boolean>} - true if exists
 */
async function validateFK(modelName, recordId) {
  if (!recordId) return true; // Nullable FK is okay
  
  try {
    const models = require('../models_sql');
    const Model = models._raw?.[modelName] || models[modelName];
    
    if (!Model) return true; // Skip if model not found
    
    const exists = await Model.findByPk(recordId);
    return !!exists;
  } catch (error) {
    console.warn(`[FK Validation] Error checking ${modelName}:`, error.message);
    return true; // Fail safe - allow operation if validation fails
  }
}

/**
 * Multi-FK Validation
 * Usage: await validateMultipleFK([{model: 'User', id: userId}, {model: 'Product', id: productId}])
 * @param {Array} references - Array of {model, id} objects
 * @returns {Promise<{isValid: boolean, errors: Array}>}
 */
async function validateMultipleFK(references) {
  const errors = [];
  
  for (const ref of references) {
    if (!ref.id) continue; // Skip nullable FKs
    
    const isValid = await validateFK(ref.model, ref.id);
    if (!isValid) {
      errors.push(`${ref.model} with ID ${ref.id} not found`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  sanitizeRecord,
  sanitizeRecords,
  buildIncludeClause,
  formatPaginatedResponse,
  formatSingleResponse,
  validateFK,
  validateMultipleFK
};
