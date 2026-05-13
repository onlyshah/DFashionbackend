const { Sequelize } = require('sequelize');

async function checkTables() {
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

    // Direct raw query
    const result = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );

    const tables = result[0];
    console.log(`📋 PostgreSQL Tables: ${tables.length}\n`);
    console.log('Tables in dfashion database:');
    tables.forEach((row, i) => {
      const tableName = typeof row === 'string' ? row : row.table_name;
      console.log(`  ${i + 1}. ${tableName}`);
    });

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTables();
