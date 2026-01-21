// Check database schema
require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'dfashion',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function checkSchema() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Get categories columns
    const [categoryColumns] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'categories' ORDER BY ordinal_position`
    );
    
    console.log('📋 Categories Table Columns:');
    categoryColumns.forEach(col => console.log('   -', col.column_name));

    // Check if sub_categories table exists
    const [tableExists] = await sequelize.query(
      `SELECT EXISTS(SELECT 1 FROM information_schema.tables 
       WHERE table_name = 'sub_categories');`
    );
    
    console.log('\n📊 Sub-Categories Table Exists:', tableExists[0].exists);
    
    if (tableExists[0].exists) {
      const [subCatColumns] = await sequelize.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'sub_categories' ORDER BY ordinal_position`
      );
      
      console.log('\n📋 Sub-Categories Table Columns:');
      subCatColumns.forEach(col => console.log('   -', col.column_name));
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
