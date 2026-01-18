const { Sequelize } = require('sequelize');
require('dotenv').config();

const DB_NAME = process.env.PGDATABASE || process.env.POSTGRES_DB || 'dfashion';
const DB_USER = process.env.PGUSER || process.env.POSTGRES_USER || 'postgres';
const DB_PASS = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '1234';
const DB_HOST = process.env.PGHOST || process.env.POSTGRES_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.PGPORT || process.env.POSTGRES_PORT, 10) || 5432;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: false
});

async function verifySeedingComplete() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    const tables = [
      'roles', 'users', 'permissions', 'modules', 'role_permissions',
      'departments', 'brands', 'categories', 'products', 
      'warehouses', 'suppliers', 'carts', 'wishlists',
      'orders', 'payments', 'returns', 'shipments',
      'notifications', 'coupons', 'flash_sales', 'campaigns',
      'promotions', 'posts', 'stories', 'reels'
    ];
    
    console.log('\n📊 Database Record Counts:');
    console.log('═'.repeat(50));
    
    let totalRecords = 0;
    for (const table of tables) {
      try {
        const [result] = await sequelize.query(`SELECT COUNT(*) as count FROM "${table}"`);
        const recordCount = parseInt(result[0].count);
        totalRecords += recordCount;
        const status = recordCount > 0 ? '✅' : '⚠️ ';
        console.log(`${status} ${table.padEnd(25)} : ${recordCount}`);
      } catch (e) {
        console.log(`❌ ${table.padEnd(25)} : ERROR`);
      }
    }
    
    console.log('═'.repeat(50));
    console.log(`\n📈 Total Records: ${totalRecords}`);
    console.log('✅ Database seeding verification complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

verifySeedingComplete();
