/**
 * Repository Factory
 * Instantiates the correct repository implementation based on active database
 * Ensures single responsibility and consistent database access
 */

const DatabaseFactory = require('../config/dbFactory');
const RelationalRepository = require('./implementations/RelationalRepository');
const MongoRepository = require('./implementations/MongoRepository');

class RepositoryFactory {
  static repositoryCache = new Map();

  /**
   * Detect if a model is Mongoose or Sequelize
   * @param {Object} model - The model to check
   * @returns {string} 'sequelize' or 'mongoose'
   */
  static detectModelType(model) {
    if (!model) {
      throw new Error('[RepositoryFactory] Cannot detect model type: model is null/undefined');
    }
    
    // Check for wrapped Sequelize model (has _sequelize property)
    if (model._sequelize && typeof model._sequelize.findAndCountAll === 'function') {
      return 'sequelize';
    }
    
    // Check for Sequelize model indicators FIRST (more distinctive)
    // Sequelize models have these properties
    if (model.sequelize && typeof model.sequelize.query === 'function') {
      return 'sequelize';
    }
    
    // Check for Sequelize methods that are very distinctive
    if (typeof model.findAndCountAll === 'function' && 
        typeof model.findByPk === 'function') {
      return 'sequelize';
    }
    
    // Check for Mongoose model indicators
    // Mongoose models have these properties and collection is very distinctive
    if (model.collection && typeof model.collection === 'object') {
      return 'mongoose';
    }
    
    // Check by presence of Mongoose-specific methods
    if (typeof model.find === 'function' && 
        typeof model.findById === 'function' && 
        typeof model.countDocuments === 'function' &&
        !model.sequelize) {
      // Could be wrapped Sequelize or Mongoose - check if this is actually a wrapper
      // If it has _sequelize, it's a wrapped Sequelize model
      if (model._sequelize) {
        return 'sequelize';
      }
      return 'mongoose';
    }
    
    // Fallback to database type setting
    const db = DatabaseFactory.getDatabase();
    console.log(`[RepositoryFactory] Model type detection inconclusive, model constructor: ${model.constructor?.name}, using DB type: ${db.type}`);
    return db.isRelational ? 'sequelize' : 'mongoose';
  }

  /**
   * Get or create repository for entity
   * @param {string} entityName - Entity/model name
   * @param {Object} model - Sequelize or Mongoose model
   * @returns {BaseRepository} Repository implementation
   */
  static getRepository(entityName, model) {
    const cacheKey = `${entityName}`;
    
    if (this.repositoryCache.has(cacheKey)) {
      return this.repositoryCache.get(cacheKey);
    }

    const modelType = this.detectModelType(model);
    const db = DatabaseFactory.getDatabase();
    let repository;

    console.log(`[RepositoryFactory] Creating repository for ${entityName}`);
    console.log(`[RepositoryFactory] Detected model type: ${modelType}`);
    console.log(`[RepositoryFactory] Active database: ${db.type}`);

    if (modelType === 'sequelize') {
      // PostgreSQL or MySQL using Sequelize
      repository = new RelationalRepository(model, entityName);
      console.log(`[RepositoryFactory] ✅ Created RelationalRepository for ${entityName}`);
    } else if (modelType === 'mongoose') {
      // MongoDB using Mongoose
      repository = new MongoRepository(model);
      console.log(`[RepositoryFactory] ✅ Created MongoRepository for ${entityName}`);
    } else {
      throw new Error(
        `[RepositoryFactory] Cannot determine model type for ${entityName}. ` +
        `Model must be either a Sequelize or Mongoose model.`
      );
    }

    this.repositoryCache.set(cacheKey, repository);
    return repository;
  }

  /**
   * Clear repository cache (useful for testing)
   */
  static clearCache() {
    this.repositoryCache.clear();
  }

  /**
   * Get database type info
   * @returns {string} 'postgres', 'mysql', or 'mongodb'
   */
  static getDatabaseType() {
    return DatabaseFactory.getDatabaseType();
  }

  /**
   * Check if using relational database
   * @returns {boolean}
   */
  static isRelational() {
    return DatabaseFactory.isRelationalDatabase();
  }
}

module.exports = RepositoryFactory;
