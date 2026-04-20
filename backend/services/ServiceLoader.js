/**
 * ============================================================================
 * SERVICE LOADER UTILITY - ADAPTER PATTERN
 * ============================================================================
 * Dynamically loads unified services with database adapter abstraction
 * 
 * Current Status: PostgreSQL ONLY (MongoDB disabled)
 * 
 * Services are now unified - no duplication between mongodb/ and postgres/
 * All services use the adapter layer for database operations
 * 
 * Usage:
 *   const cartService = ServiceLoader.loadService('cartService');
 *   const cart = await cartService.getById(cartId);
 */

const path = require('path');

class ServiceLoaderHelper {
  constructor() {
    // Cache for loaded services to avoid repeated requires
    this.serviceCache = new Map();
  }

  /**
   * Load a unified service
   * Services are now in /services/ directory and use adapter pattern
   * @param {string} serviceName - Name of the service (e.g., 'cartService', 'productService')
   * @returns {Object} - The service module
   */
  loadService(serviceName) {
    // Check cache first
    if (this.serviceCache.has(serviceName)) {
      return this.serviceCache.get(serviceName);
    }

    const dbType = process.env.DB_TYPE || 'postgres';

    if (dbType === 'mongodb') {
      console.error('❌ MongoDB is currently DISABLED');
      throw new Error(
        `MongoDB support is disabled. ` +
        `Service: ${serviceName} requires PostgreSQL. ` +
        `Set DB_TYPE=postgres in your .env file.`
      );
    }

    // Load PostgreSQL service
    const servicesDir = path.dirname(__filename);
    
    // Try to load from unified services (new location)
    let servicePath = path.join(servicesDir, `${serviceName}.js`);
    
    try {
      const service = require(servicePath);
      this.serviceCache.set(serviceName, service);
      console.log(`✅ Loaded service: ${serviceName} (PostgreSQL adapter)`);
      return service;
    } catch (error) {
      // Fallback: try postgres subfolder for backward compatibility
      servicePath = path.join(servicesDir, 'postgres', `${serviceName}.js`);
      try {
        const service = require(servicePath);
        this.serviceCache.set(serviceName, service);
        console.log(`✅ Loaded service: ${serviceName} from postgres folder (backward compatible)`);
        return service;
      } catch (fallbackError) {
        const errorMsg = 
          `Service not found: ${serviceName}\n` +
          `Tried:\n` +
          `  1. ${path.join(servicesDir, `${serviceName}.js`)}\n` +
          `  2. ${servicePath}`;
        console.error(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
      }
    }
  }

  /**
   * Check current database type
   */
  getDatabaseType() {
    return process.env.DB_TYPE || 'postgres';
  }

  /**
   * Check if using PostgreSQL
   */
  isPostgres() {
    return (process.env.DB_TYPE || 'postgres') === 'postgres';
  }

  /**
   * Check if using MongoDB (always false now - MongoDB disabled)
   */
  isMongoDB() {
    return false; // MongoDB is disabled
  }

  /**
   * Clear service cache
   * Useful for testing
   */
  clearCache() {
    this.serviceCache.clear();
    console.log('✅ Service cache cleared');
  }

  /**
   * Get cached services info
   */
  getCachedServices() {
    return Array.from(this.serviceCache.keys());
  }
}

// Create singleton instance
const serviceLoader = new ServiceLoaderHelper();

module.exports = serviceLoader;
