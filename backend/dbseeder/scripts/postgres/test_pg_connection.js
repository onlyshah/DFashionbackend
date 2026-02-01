require('dotenv').config();
const { Client } = require('pg');

const POSTGRES_URI = process.env.POSTGRES_URI || 'postgres://postgres:1234@localhost:5432/dfashion';

async function testConnection() {
  const client = new Client({ connectionString: POSTGRES_URI });
  try {
    await client.connect();
    console.log('✅ Successfully connected to PostgreSQL 18!');
    await client.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();
