/**
 * Service Loader Utility
 * Dynamically loads orchestrator services
 * Routes to database-specific implementations based on DB_TYPE
 */

const dbType = (process.env.DB_TYPE || 'postgres').toLowerCase();
const path = require('path');
const fs = require('fs');

class ServiceLoader {
  static getService(serviceName) {
    try {
      // First, try to load database-specific service
      let servicePath;
      if (dbType === 'postgres' || dbType === 'postgresql' || dbType === 'mysql') {
        servicePath = path.join(__dirname, '../services/postgres/', `${this.toPascalCase(serviceName)}.js`);
      } else {
        servicePath = path.join(__dirname, '../services/mongodb/', `${this.toPascalCase(serviceName)}.js`);
      }
      
      if (fs.existsSync(servicePath)) {
        console.log(`[ServiceLoader] Loaded ${dbType} service: ${serviceName}`);
        return require(servicePath);
      }

      // Fallback: try to load from main services directory
      const mainServicePath = path.join(__dirname, '../services/', `${this.toPascalCase(serviceName)}.js`);
      if (fs.existsSync(mainServicePath)) {
        console.log(`[ServiceLoader] Loaded main service: ${serviceName}`);
        return require(mainServicePath);
      }

      // If still not found, return a safe stub
      console.warn(`[ServiceLoader] Service '${serviceName}' not found in ${dbType} services, returning stub`);
      return this.createStubService(serviceName);
      
    } catch (error) {
      console.error(`[ServiceLoader] Error loading ${serviceName}:`, error.message);
      return this.createStubService(serviceName);
    }
  }

  static toPascalCase(str) {
    return str
      .split(/[_-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  static loadService(serviceName) {
    return this.getService(serviceName);
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
    return dbType === 'postgres' || dbType === 'postgresql';
  }

  static isMongoDB() {
    return dbType === 'mongodb' || dbType === 'mongo';
  }

  static getDBType() {
    return dbType;
  }
}

module.exports = ServiceLoader;
