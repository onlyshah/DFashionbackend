// Test PostgreSQL Connection
// Usage: node scripts/testPostgres.js

require('dotenv').config();
const { connectPostgres, pgPool } = require('../config/postgres');

async function testConnection() {
  console.log('========================================');
  console.log('PostgreSQL Connection Test');
  console.log('========================================\n');

  // Log connection params
  console.log('📋 Connection Parameters:');
  console.log(`   Host: ${process.env.PGHOST || process.env.POSTGRES_HOST || '127.0.0.1'}`);
  console.log(`   Port: ${process.env.PGPORT || process.env.POSTGRES_PORT || '5432'}`);
  console.log(`   User: ${process.env.PGUSER || process.env.POSTGRES_USER || 'postgres'}`);
  console.log(`   Database: ${process.env.PGDATABASE || process.env.POSTGRES_DB || 'dfashion'}`);
  console.log(`   Pool Size: ${process.env.PG_MAX_POOL_SIZE || '10'}\n`);

  try {
    console.log('🔌 Attempting connection...');
    const pool = await connectPostgres();

    // Test 1: Simple query
    console.log('\n✅ Connection successful!\n');

    console.log('🧪 Test 1: Current timestamp');
    const result1 = await pool.query('SELECT NOW() as current_time');
    console.log(`   Result: ${result1.rows[0].current_time}\n`);

    // Test 2: Table list
    console.log('🧪 Test 2: List existing tables');
    const result2 = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    if (result2.rows.length === 0) {
      console.log('   No tables found (database is empty)\n');
    } else {
      console.log(`   Found ${result2.rows.length} table(s):`);
      result2.rows.forEach(row => console.log(`     - ${row.table_name}`));
      console.log();
    }

    // Test 3: Version
    console.log('🧪 Test 3: PostgreSQL version');
    const result3 = await pool.query('SELECT version()');
    console.log(`   ${result3.rows[0].version}\n`);

    console.log('========================================');
    console.log('✅ All tests passed!');
    console.log('========================================');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    console.error('\n📌 Troubleshooting:');
    console.error('   1. Ensure PostgreSQL is running locally');
    console.error('   2. Check .env file for correct credentials');
    console.error('   3. Verify database exists: dfashion');
    console.error('   4. Ensure user has required permissions\n');

    process.exit(1);
  }
}

testConnection();
