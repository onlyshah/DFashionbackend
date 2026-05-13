#!/usr/bin/env node

/**
 * Category Fields Migration Runner
 * Adds image, icon, description, and sort_order fields to categories table
 * Usage: node migrate-categories.js
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runCategoryMigration() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'dfashion'
  });

  try {
    console.log('🔄 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add-category-fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Running migration: add-category-fields.sql\n');
    await client.query(sql);
    console.log('✅ Migration completed successfully!\n');

    // Verify columns were added
    console.log('📋 Verifying new columns...');
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'categories'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 Categories table structure:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    console.log('\n✨ Database migration completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nMake sure:');
    console.error('  1. PostgreSQL is running');
    console.error('  2. .env file has correct database credentials');
    console.error('  3. The database exists');
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migration
runCategoryMigration().catch(err => {
  console.error(err);
  process.exit(1);
});
