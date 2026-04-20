const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');

async function checkBothDatabases() {
  try {
    console.log('\n📊 DATABASE INVENTORY REPORT');
    console.log('='.repeat(70));

    // ==================== PostgreSQL ====================
    console.log('\n🔵 PostgreSQL Database (dfashion)\n');
    
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

      // Query all tables
      const [allTables] = await sequelize.query(
        "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast') ORDER BY table_schema, table_name;"
      );

      // Group by schema
      const bySchema = {};
      allTables.forEach(row => {
        const schema = row.table_schema;
        if (!bySchema[schema]) bySchema[schema] = [];
        bySchema[schema].push(row.table_name);
      });

      // Display results
      Object.keys(bySchema).forEach(schema => {
        console.log(`Schema: "${schema}"`);
        console.log(`  Total Tables: ${bySchema[schema].length}\n`);
        console.log('  Tables:');
        bySchema[schema].forEach((t, i) => {
          console.log(`    ${i + 1}. ${t}`);
        });
        console.log();
      });

      await sequelize.close();
    } catch (err) {
      console.error('❌ PostgreSQL Error:', err.message);
    }

    console.log('='.repeat(70));

    // ==================== MongoDB ====================
    console.log('\n🟢 MongoDB Database (dfashion)\n');
    
    try {
      const mongoUri = 'mongodb://localhost:27017/dfashion';
      
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 3000
      });

      console.log('✅ Connected to MongoDB\n');

      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`Total Collections: ${collections.length}\n`);
      console.log('Collections:');
      collections.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.name}`);
      });

      await mongoose.disconnect();
    } catch (err) {
      console.error('⚠️ MongoDB Not Available:', err.message);
      console.log('   (MongoDB may not be running)\n');
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n✨ Database check completed!\n');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

checkBothDatabases();
