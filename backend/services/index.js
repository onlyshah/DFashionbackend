/**
 * Service Loader - Smart Router for Database-Specific Implementations
 * 
 * This module intercepts service requires and automatically routes to the 
 * correct database implementation (PostgreSQL or MongoDB) based on DB_TYPE.
 * 
 * Usage in controllers:
 *   const service = require('../services/serviceName');
 *   // Automatically loads from postgres/ or mongodb/ based on DB_TYPE
 */

const path = require('path');
const ServiceLoader = require('./utils/serviceLoader');

// Store the actual require function
const originalRequire = require.extensions['.js'];

// Intercept .js requires in the services folder
require.extensions['.js'] = function(module, filename) {
  // If this is NOT a database-specific implementation, use normal require
  if (!filename.includes('\\services\\') || 
      filename.includes('\\services\\postgres\\') || 
      filename.includes('\\services\\mongodb\\') ||
      filename.includes('\\services\\utils\\')) {
    return originalRequire(module, filename);
  }

  // If a service requires from ../services/serviceName, route to correct DB
  const isPostgres = ServiceLoader.isPostgres();
  const dbType = isPostgres ? 'postgres' : 'mongodb';
  const serviceName = path.basename(filename);
  const dbSpecificPath = path.join(path.dirname(filename), dbType, serviceName);

  return originalRequire(module, dbSpecificPath);
};

/**
 * Smart require function for use in code:
 * const userService = createServiceProxy('userService');
 */
function createServiceProxy(serviceName) {
  const isPostgres = ServiceLoader.isPostgres();
  const dbType = isPostgres ? 'postgres' : 'mongodb';
  const servicePath = path.join(__dirname, dbType, `${serviceName}.js`);
  
  try {
    return require(servicePath);
  } catch (error) {
    console.error(`Failed to load ${serviceName} from ${dbType}:`, error.message);
    throw new Error(`Service ${serviceName} not found in ${dbType} folder`);
  }
}

module.exports = {
  createServiceProxy,
  isPostgres: () => ServiceLoader.isPostgres()
};
