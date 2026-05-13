const { Sequelize } = require('sequelize');

async function checkTableData() {
  try {
    const sequelize = new Sequelize({
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '1234',
      database: 'dfashion',
      dialect: 'postgres',
      logging: false
    });

    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // Get all tables
    const result = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );

    // Extract table names from result (each row is an array, first element is table_name)
    const tableNames = result.map(row => row[0]);
    console.log(`📊 Checking data in ${tableNames.length} tables...\n`);

    const results = {
      empty: [],
      withData: []
    };

    // Check each table for row count
    for (const tableName of tableNames) {
      try {
        const countResult = await sequelize.query(`SELECT COUNT(*) as count FROM "${tableName}";`);
        // Extract count from first row, first column
        const rowCount = parseInt(countResult[0][0]) || 0;

        if (rowCount === 0) {
          results.empty.push(tableName);
        } else {
          results.withData.push({ name: tableName, count: rowCount });
        }
      } catch (err) {
        console.error(`Error checking ${tableName}:`, err.message);
      }
    }

    // Display results
    console.log('='.repeat(70));
    console.log(`\n📋 EMPTY TABLES: ${results.empty.length}\n`);
    results.empty.forEach((table, i) => {
      console.log(`  ${i + 1}. ${table} (0 rows)`);
    });

    console.log('\n' + '='.repeat(70));
    console.log(`\n📊 TABLES WITH DATA: ${results.withData.length}\n`);
    results.withData.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.name} (${item.count} rows)`);
    });

    console.log('\n' + '='.repeat(70));
    console.log(`\n📈 SUMMARY:`);
    console.log(`  Total Tables: ${tableNames.length}`);
    console.log(`  Empty Tables: ${results.empty.length} (${((results.empty.length / tableNames.length) * 100).toFixed(1)}%)`);
    console.log(`  Tables with Data: ${results.withData.length} (${((results.withData.length / tableNames.length) * 100).toFixed(1)}%)`);

    const totalRows = results.withData.reduce((sum, item) => sum + item.count, 0);
    console.log(`  Total Rows Across All Tables: ${totalRows}\n`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

checkTableData();
