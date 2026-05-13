/**
 * Foreign Key Validation Utility
 * Validates that referenced records exist before creating/updating dependent records
 * Prevents orphan records and provides clear error messages
 */

const DbType = (process.env.DB_TYPE || 'postgres').toLowerCase();
const models = DbType.includes('postgres') ? require('../models_sql') : require('../models');

/**
 * Validate FK existence for a single reference
 * @param {string} modelName - Name of the model to check (e.g., 'User', 'Product', 'Order')
 * @param {string|UUIDv4} recordId - ID of the record to validate
 * @returns {Promise<boolean>} - true if record exists, false otherwise
 */
async function validateForeignKey(modelName, recordId) {
  try {
    if (!recordId) return true; // Nullable FK is okay
    
    const modelRaw = models._raw && models._raw[modelName] ? models._raw[modelName] : models[modelName];
    if (!modelRaw) {
      console.warn(`[FK Validation] Model ${modelName} not found`);
      return true; // Skip validation if model not found
    }

    const record = await modelRaw.findByPk(recordId);
    return !!record;
  } catch (error) {
    console.error(`[FK Validation] Error validating ${modelName}:`, error.message);
    return false; // Fail safe
  }
}

/**
 * Validate multiple FK references
 * @param {Array} fkReferences - Array of {model, id, field} objects
 * @returns {Promise<Object>} - {isValid: boolean, errors: Array<string>}
 */
async function validateMultipleForeignKeys(fkReferences) {
  const errors = [];

  for (const ref of fkReferences) {
    if (!ref.id) continue; // Skip if ID is null (nullable FK)

    const exists = await validateForeignKey(ref.model, ref.id);
    if (!exists) {
      errors.push(`${ref.model} with ID ${ref.id} not found (${ref.field})`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate FK before creating order
 * @param {Object} orderData - Order data to validate
 * @returns {Promise<Object>} - {isValid: boolean, error: string|null}
 */
async function validateOrderFK(orderData) {
  const customerId = orderData.customerId || orderData.userId;
  if (!customerId) {
    return { isValid: false, error: 'customerId or userId is required' };
  }

  const hasCustomer = await validateForeignKey('User', customerId);
  if (!hasCustomer) {
    return { isValid: false, error: `Customer with ID ${customerId} not found` };
  }

  return { isValid: true, error: null };
}

/**
 * Validate FK before creating cart item
 * @param {Object} cartItemData - Cart item data to validate
 * @returns {Promise<Object>} - {isValid: boolean, error: string|null}
 */
async function validateCartItemFK(cartItemData) {
  const references = [
    { model: 'User', id: cartItemData.userId, field: 'userId' },
    { model: 'Product', id: cartItemData.productId, field: 'productId' }
  ];

  const result = await validateMultipleForeignKeys(references);
  if (!result.isValid) {
    return { isValid: false, error: result.errors.join('; ') };
  }

  return { isValid: true, error: null };
}

/**
 * Validate FK before creating payment
 * @param {Object} paymentData - Payment data to validate
 * @returns {Promise<Object>} - {isValid: boolean, error: string|null}
 */
async function validatePaymentFK(paymentData) {
  const hasOrder = await validateForeignKey('Order', paymentData.orderId);
  if (!hasOrder) {
    return { isValid: false, error: `Order with ID ${paymentData.orderId} not found` };
  }

  return { isValid: true, error: null };
}

/**
 * Validate FK before creating shipment
 * @param {Object} shipmentData - Shipment data to validate
 * @returns {Promise<Object>} - {isValid: boolean, error: string|null}
 */
async function validateShipmentFK(shipmentData) {
  const references = [
    { model: 'Order', id: shipmentData.orderId, field: 'orderId' },
    { model: 'Courier', id: shipmentData.courierId, field: 'courierId' } // nullable
  ];

  const result = await validateMultipleForeignKeys(references);
  if (!result.isValid) {
    return { isValid: false, error: result.errors.join('; ') };
  }

  return { isValid: true, error: null };
}

/**
 * Validate FK before creating product comment
 * @param {Object} commentData - Comment data to validate
 * @returns {Promise<Object>} - {isValid: boolean, error: string|null}
 */
async function validateProductCommentFK(commentData) {
  const references = [
    { model: 'Product', id: commentData.productId, field: 'productId' },
    { model: 'User', id: commentData.userId, field: 'userId' }
  ];

  const result = await validateMultipleForeignKeys(references);
  if (!result.isValid) {
    return { isValid: false, error: result.errors.join('; ') };
  }

  return { isValid: true, error: null };
}

module.exports = {
  validateForeignKey,
  validateMultipleForeignKeys,
  validateOrderFK,
  validateCartItemFK,
  validatePaymentFK,
  validateShipmentFK,
  validateProductCommentFK
};
