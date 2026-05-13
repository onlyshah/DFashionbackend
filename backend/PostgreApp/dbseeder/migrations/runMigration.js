#!/usr/bin/env node

const fs = require('fs');
const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'dfashion'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Read migration file
    const migrationPath = require('path').join(__dirname, 'database', 'migrations', '050-create-social-tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Run migration
    console.log('🚀 Running migration: 050-create-social-tables.sql');
    await client.query(sql);
    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
