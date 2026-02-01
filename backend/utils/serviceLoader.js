/**
 * Service Loader Utility
 * Dynamically loads orchestrator services
 * Orchestrators route to database-specific implementations
 */

const dbType = (process.env.DB_TYPE || 'mongodb').toLowerCase();
const path = require('path');
const fs = require('fs');

class ServiceLoader {
  static getService(serviceName) {
    try {
      // Load orchestrator service from /services directory
      const servicePath = path.join(__dirname, '../services/', `${serviceName}Service.js`);
      
      if (fs.existsSync(servicePath)) {
        return require(servicePath);
      }

      // Fallback: return stub service
      console.warn(`[ServiceLoader] Service '${serviceName}' not found, returning stub`);
      return this.createStubService(serviceName);
      
    } catch (error) {
      console.error(`[ServiceLoader] Error loading ${serviceName}:`, error.message);
      return this.createStubService(serviceName);
    }
  }

  static createStubService(serviceName) {
    return {
      getAll: async () => ({ success: true, data: [] }),
      getById: async () => ({ success: false, data: null }),
      create: async (data) => ({ success: true, data }),
      update: async (id, data) => ({ success: true, data }),
      delete: async (id) => ({ success: true }),
      getAllUsers: async () => ({ success: true, data: [] }),
      getUserById: async () => ({ success: false, data: null }),
      getAllProducts: async () => ({ success: true, data: { products: [] } }),
      getProductById: async () => ({ success: false, data: null })
    };
  }

  static isPostgres() {
    return dbType === 'postgres';
  }

  static isMongoDB() {
    return dbType === 'mongodb' || dbType === 'mongo';
  }

  static getDBType() {
    return dbType;
  }
}

module.exports = ServiceLoader;
