const { Sequelize } = require('sequelize');
require('dotenv').config();

const DB_NAME = process.env.PGDATABASE || process.env.POSTGRES_DB || 'dfashion';
const DB_USER = process.env.PGUSER || process.env.POSTGRES_USER || 'postgres';
const DB_PASS = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '123';
const DB_HOST = process.env.PGHOST || process.env.POSTGRES_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.PGPORT || process.env.POSTGRES_PORT, 10) || 5432;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: false,
  pool: {
    max: parseInt(process.env.PG_MAX_POOL_SIZE || '10', 10),
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Sequelize authenticated with Postgres');
  } catch (err) {
    console.error('❌ Sequelize failed to authenticate:', err.message || err);
    throw err;
  }
};

module.exports = {
  sequelize,
  Sequelize,
  testConnection
};
