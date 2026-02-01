require('dotenv').config();
const { Sequelize } = require('sequelize');

let sequelizeInstance = null;

const connectPostgres = async () => {
  try {
    if (sequelizeInstance) {
      return sequelizeInstance;
    }

    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    };

    sequelizeInstance = new Sequelize(
      dbConfig.database,
      dbConfig.username,
      dbConfig.password,
      {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: 'postgres',
        logging: process.env.DB_LOGGING === 'true' ? console.log : false,
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
      }
    );

    // Test connection
    await sequelizeInstance.authenticate();
    console.log('✅ PostgreSQL (Sequelize) connected successfully');
    
    // Initialize models now that Sequelize is connected
    try {
      const models = require('../models_sql');
      if (models.reinitializeModels) {
        await models.reinitializeModels();
        console.log('✅ Models reinitialized after PostgreSQL connection');
      }
    } catch (err) {
      console.warn('⚠️  Warning: Could not reinitialize models:', err.message);
      // Continue anyway - models will load when needed
    }
    
    return sequelizeInstance;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    return null;
  }
};

const getPostgresConnection = async () => {
  if (!sequelizeInstance) {
    await connectPostgres();
  }
  return sequelizeInstance;
};

module.exports = {
  connectPostgres,
  getPostgresConnection,
  sequelizeInstance: () => sequelizeInstance,
  setSequelizeInstance: (instance) => { sequelizeInstance = instance; }
};
