// Seeder UUID Helper - Provides utilities for getting or generating UUIDs for FK relationships
const { v4: uuidv4 } = require('uuid');

/**
 * Get a pool of existing UUIDs from the database for a given model/table
 * This allows seeders to reference real data instead of hardcoded integers
 */
async function getExistingUUIDs(sequelize, modelName, limit = 100) {
  try {
    if (!sequelize) return null;
    
    // Map model names to table names
    const tableMap = {
      'user': 'users',
      'users': 'users',
      'product': 'products',
      'products': 'products',
      'brand': 'brands',
      'brands': 'brands',
      'category': 'categories',
      'categories': 'categories',
      'warehouse': 'warehouses',
      'warehouses': 'warehouses',
      'courier': 'couriers',
      'couriers': 'couriers',
      'order': 'orders',
      'orders': 'orders',
      'role': 'roles',
      'roles': 'roles'
    };
    
    const tableName = tableMap[modelName.toLowerCase()];
    if (!tableName) {
      console.warn(`⚠️  No table mapping found for model: ${modelName}`);
      return [];
    }
    
    const result = await sequelize.query(
      `SELECT id FROM ${tableName} ORDER BY created_at DESC LIMIT :limit`,
      { replacements: { limit }, raw: true, type: sequelize.QueryTypes.SELECT }
    );
    
    // Handle different possible Sequelize response formats
    const rows = Array.isArray(result) ? result : (result?.rows || []);
    
    if (!Array.isArray(rows) || rows.length === 0) {
      return [];
    }
    
    return rows.map(r => r.id);
  } catch (error) {
    // Silently fail - seeders will use fallback generated UUIDs
    return [];
  }
}

/**
 * Generate an array of UUIDs for testing (fallback when DB has no data)
 */
function generateTestUUIDs(count = 10) {
  return Array.from({ length: count }, () => uuidv4());
}

/**
 * Get a UUID from pool, or generate one if needed
 */
function getOrGenerateUUID(pool, index) {
  if (pool && pool.length > 0) {
    return pool[index % pool.length];
  }
  return uuidv4();
}

module.exports = {
  getExistingUUIDs,
  generateTestUUIDs,
  getOrGenerateUUID,
  uuidv4
};
