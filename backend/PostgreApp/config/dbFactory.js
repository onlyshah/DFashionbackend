/**
 * Database Factory
 * Detects and initializes the correct database based on environment variables
 * Supports: PostgreSQL, MySQL, MongoDB
 */

const dbType = (process.env.DB_TYPE || 'mongodb').toLowerCase();

let dbInstance = null;

class DatabaseFactory {
  static getDatabase() {
    if (!dbInstance) {
      dbInstance = DatabaseFactory.initializeDatabase();
    }
    return dbInstance;
  }

  static initializeDatabase() {
    console.log(`[DatabaseFactory] Initializing database: ${dbType}`);

    switch (dbType) {
      case 'postgres':
      case 'postgresql':
        return DatabaseFactory.initPostgreSQL();
      
      case 'mysql':
        return DatabaseFactory.initMySQL();
      
      case 'mongodb':
      case 'mongo':
      default:
        return DatabaseFactory.initMongoDB();
    }
  }

  static initPostgreSQL() {
    try {
      const { Sequelize } = require('sequelize');
      
      const sequelize = new Sequelize(
        process.env.DB_NAME || 'fashion',
        process.env.DB_USER || 'postgres',
        process.env.DB_PASSWORD || 'password',
        {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          dialect: 'postgres',
          logging: process.env.DB_LOGGING === 'true' ? console.log : false
        }
      );

      console.log('[DatabaseFactory] ✅ PostgreSQL connected');
      return {
        type: 'postgres',
        connection: sequelize,
        isRelational: true
      };
    } catch (error) {
      console.error('[DatabaseFactory] ❌ PostgreSQL initialization failed:', error.message);
      throw error;
    }
  }

  static initMySQL() {
    try {
      const { Sequelize } = require('sequelize');
      
      const sequelize = new Sequelize(
        process.env.DB_NAME || 'fashion',
        process.env.DB_USER || 'root',
        process.env.DB_PASSWORD || 'password',
        {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 3306,
          dialect: 'mysql',
          logging: process.env.DB_LOGGING === 'true' ? console.log : false
        }
      );

      console.log('[DatabaseFactory] ✅ MySQL connected');
      return {
        type: 'mysql',
        connection: sequelize,
        isRelational: true
      };
    } catch (error) {
      console.error('[DatabaseFactory] ❌ MySQL initialization failed:', error.message);
      throw error;
    }
  }

  static initMongoDB() {
    try {
      const mongoose = require('mongoose');
      
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion';
      
      mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });

      console.log('[DatabaseFactory] ✅ MongoDB connected');
      return {
        type: 'mongodb',
        connection: mongoose,
        isRelational: false
      };
    } catch (error) {
      console.error('[DatabaseFactory] ❌ MongoDB initialization failed:', error.message);
      throw error;
    }
  }

  static getDatabaseType() {
    return dbType;
  }

  static isRelationalDatabase() {
    const db = DatabaseFactory.getDatabase();
    return db.isRelational;
  }

  static getConnection() {
    const db = DatabaseFactory.getDatabase();
    return db.connection;
  }
}

module.exports = DatabaseFactory;
