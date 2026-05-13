require('dotenv').config();
const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// PostgreSQL Connection via Sequelize
let sequelize = null;

const connectSequelize = async () => {
  try {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion',
      dialect: 'postgres',
      logging: false, // Set to console.log for debugging
      pool: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000
      },
      dialectOptions: {
        ssl: false,
        application_name: 'dfashion_backend'
      }
    };

    sequelize = new Sequelize(
      dbConfig.database,
      dbConfig.username,
      dbConfig.password,
      {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: dbConfig.dialect,
        logging: dbConfig.logging,
        pool: dbConfig.pool,
        dialectOptions: dbConfig.dialectOptions,
        // Map camelCase properties to snake_case database columns
        underscored: true,
        // Configure timestamp columns
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    );

    // Test connection
    await sequelize.authenticate();
    console.log('✅ PostgreSQL (Sequelize) connected successfully');
    
    return sequelize;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    return null;
  }
};

// Initialize Sequelize if not already initialized
const getSequelize = async () => {
  if (!sequelize) {
    const result = await connectSequelize();
    if (!result) return null;
  }
  return sequelize;
};

module.exports = {
  sequelize,
  Sequelize,
  connectSequelize,
  getSequelize
};
