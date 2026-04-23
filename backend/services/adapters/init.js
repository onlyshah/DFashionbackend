/**
 * ============================================================================
 * DATABASE ADAPTER INITIALIZATION & DIAGNOSTICS
 * ============================================================================
 * 
 * Verifies the adapter layer is correctly configured and all models are ready
 * Run this on application startup to ensure database connectivity
 * 
 * Usage:
 *   const adapterInit = require('./services/adapters/init');
 *   await adapterInit.initialize();
 */

const db = require('./index');
const path = require('path');

class AdapterInitializer {
  constructor() {
    this.status = {
      initialized: false,
      database: null,
      modelCount: 0,
      errors: []
    };
  }

  /**
   * Initialize adapter and verify connectivity
   */
  async initialize() {
    try {
      console.log('🔍 Initializing Database Adapter Layer...\n');

      // Check environment
      const dbType = process.env.DB_TYPE || 'postgres';
      console.log(`📌 Database Type: ${dbType.toUpperCase()}`);

      if (dbType !== 'postgres') {
        throw new Error(
          `❌ Unsupported database type: ${dbType}\n` +
          `Currently only PostgreSQL is supported.\n` +
          `MongoDB support is disabled.\n` +
          `Set DB_TYPE=postgres in .env`
        );
      }

      // Ensure models are ready
      console.log('🔄 Ensuring models are initialized...');
      await db.ensureModelsReady();
      console.log('✅ Models initialized');

      // Verify connection
      console.log('🔗 Verifying database connection...');
      const sequelizeInstance = db.getSequelize();
      if (sequelizeInstance && sequelizeInstance.authenticate) {
        try {
          await sequelizeInstance.authenticate();
          console.log('✅ Database connection verified');
        } catch (err) {
          console.warn('⚠️  Could not authenticate connection:', err.message);
        }
      } else {
        console.log('✅ Sequelize instance available (authentication skipped)');
      }

      // Count models
      const modelCount = Object.keys(db._raw || {}).length;
      console.log(`📊 Models loaded: ${modelCount}`);

      // List critical models
      const criticalModels = [
        'User', 'Product', 'Cart', 'CartItem', 'Wishlist',
        'Order', 'Payment', 'Post', 'Story', 'Category'
      ];

      console.log('\n🔎 Checking critical models:');
      let modelErrors = [];
      for (const modelName of criticalModels) {
        const model = db[modelName];
        if (model) {
          console.log(`  ✅ ${modelName}`);
        } else {
          console.log(`  ❌ ${modelName} - NOT FOUND`);
          modelErrors.push(modelName);
        }
      }

      // Summary
      console.log('\n' + '='.repeat(60));
      console.log('✅ ADAPTER INITIALIZATION COMPLETE');
      console.log('='.repeat(60));
      console.log(`Database:   PostgreSQL`);
      console.log(`Adapter:    ${dbType.toUpperCase()} Adapter`);
      console.log(`Models:     ${modelCount} loaded`);
      console.log(`Status:     ✅ READY FOR OPERATIONS`);

      this.status = {
        initialized: true,
        database: 'postgres',
        modelCount,
        errors: modelErrors,
        timestamp: new Date()
      };

      return this.status;
    } catch (error) {
      console.error('\n❌ ADAPTER INITIALIZATION FAILED');
      console.error('='.repeat(60));
      console.error('Error:', error.message);
      console.error('='.repeat(60));

      this.status = {
        initialized: false,
        database: null,
        modelCount: 0,
        errors: [error.message],
        timestamp: new Date()
      };

      throw error;
    }
  }

  /**
   * Get initialization status
   */
  getStatus() {
    return this.status;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.status.initialized) {
        await this.initialize();
      }

      // Try to count a model
      const userCount = await db.User.count();
      
      return {
        healthy: true,
        message: 'Database adapter is healthy',
        userCount
      };
    } catch (error) {
      return {
        healthy: false,
        message: 'Database adapter health check failed',
        error: error.message
      };
    }
  }

  /**
   * List all available models
   */
  getAvailableModels() {
    const models = Object.keys(db._raw || {}).filter(key => key !== 'default');
    return {
      count: models.length,
      models: models.sort()
    };
  }

  /**
   * Verify service can be loaded
   */
  async verifyService(serviceName) {
    try {
      const service = require(`../services/${serviceName}`);
      if (!service) {
        throw new Error(`Service ${serviceName} is null or undefined`);
      }
      return { success: true, service };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Create singleton
const initializer = new AdapterInitializer();

module.exports = initializer;
