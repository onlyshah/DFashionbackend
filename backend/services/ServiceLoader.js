/**
 * Service Loader Utility
 * Dynamically loads the correct database service based on DB_TYPE
 */

const path = require('path');

class ServiceLoaderHelper {
  /**
   * Load a service from the correct database folder
   * @param {string} serviceName - Name of the service (without extension)
   * @returns {Object} - The service module
   */
  static loadService(serviceName) {
    const isPostgres = this.isPostgres();
    const dbType = isPostgres ? 'postgres' : 'mongodb';
    // Use __filename to get absolute path to this file, then navigate to db folder
    const servicesDir = path.dirname(__filename); // /backend/services
    const servicePath = path.join(servicesDir, dbType, `${serviceName}.js`);
    
    try {
      return require(servicePath);
    } catch (error) {
      console.error(`Failed to load service: ${serviceName} from ${dbType}`, error.message);
      throw new Error(`Service ${serviceName} not found in ${dbType} folder`);
    }
  }

  /**
   * Check if using PostgreSQL
   */
  static isPostgres() {
    return process.env.DB_TYPE === 'postgres';
  }

  /**
   * Check if using MongoDB
   */
  static isMongoDB() {
    return process.env.DB_TYPE === 'mongodb' || process.env.DB_TYPE !== 'postgres';
  }
}

module.exports = ServiceLoaderHelper;
