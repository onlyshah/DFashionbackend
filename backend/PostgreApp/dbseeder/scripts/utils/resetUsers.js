const { Client } = require('pg');

async function clearAndReseed() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '1234',
    database: 'dfashion'
  });

  try {
    await client.connect();
    console.log('🔄 Deleting old users...');
    await client.query("DELETE FROM users WHERE email IN ('customer1@example.com', 'customer2@example.com', 'superadmin@example.com', 'admin@example.com', 'seller1@example.com', 'marketing@example.com')");
    console.log('✅ Old users deleted');
    
    await client.end();
    
    // Now run the seeder
    console.log('\n🌱 Running master seeder...');
    const { seedUsers } = require('../dbseeder/scripts/postgres/25-user.seeder');
    // The seeder will be run by the master seeder
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

clearAndReseed();
