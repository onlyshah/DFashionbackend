/**
 * ============================================================================
 * DATABASE ADAPTER LAYER
 * ============================================================================
 * Central point for database abstraction
 * Allows switching between PostgreSQL and MongoDB using DB_TYPE environment variable
 * 
 * Usage:
 *   const db = require('./adapters');
 *   const products = await db.product.findAll();
 */

const dbType = process.env.DB_TYPE || 'postgres';

// For now, only PostgreSQL is supported (MongoDB is disabled)
if (dbType === 'mongodb') {
  console.warn('⚠️  MongoDB support is currently DISABLED. Using PostgreSQL instead.');
  console.warn('To re-enable MongoDB, set DB_TYPE=postgres and implement MongoDB adapter.');
}

// Always use PostgreSQL adapter
const adapter = require('./postgresAdapter');

module.exports = adapter;
