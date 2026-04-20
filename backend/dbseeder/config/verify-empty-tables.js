const { Sequelize } = require('sequelize');

(async () => {
  const s = new Sequelize({
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: '1234',
    database: 'dfashion',
    dialect: 'postgres',
    logging: false
  });
  
  try {
    await s.authenticate();
    console.log('✅ Connected to PostgreSQL\n');
    
    // Get all tables
    const [tables] = await s.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`📊 Total Tables Found: ${tables.length}\n`);
    console.log('📋 Checking row counts in each table...\n');
    
    let totalRows = 0;
    let emptyTableCount = 0;
    
    for (const table of tables) {
      const tableName = table.table_name;
      const [result] = await s.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
      const rowCount = parseInt(result[0].count);
      totalRows += rowCount;
      
      if (rowCount === 0) {
        emptyTableCount++;
      }
      
      const status = rowCount === 0 ? '⚪ EMPTY' : '🟢 HAS DATA';
      console.log(`${status} | ${tableName}: ${rowCount} rows`);
    }
    
    console.log(`\n========================================`);
    console.log(`📈 Summary:`);
    console.log(`   Total Tables: ${tables.length}`);
    console.log(`   Empty Tables: ${emptyTableCount}`);
    console.log(`   Tables with Data: ${tables.length - emptyTableCount}`);
    console.log(`   Total Rows: ${totalRows}`);
    console.log(`========================================\n`);
    
    if (emptyTableCount === tables.length) {
      console.log('✅ CONFIRMED: All tables are EMPTY and ready for seeding');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
