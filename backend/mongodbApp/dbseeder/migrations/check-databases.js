const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');

async function checkDatabases() {
  try {
    console.log('📊 Checking Database Tables/Collections...\n');

    // ==================== PostgreSQL ====================
    console.log('🔵 PostgreSQL Database:');
    const sequelize = new Sequelize({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DB || 'dfashion',
      dialect: 'postgres',
      logging: false
    });

    try {
      await sequelize.authenticate();
      console.log('✅ Connected to PostgreSQL');

      // Get all tables
      const [tables] = await sequelize.sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);

      console.log(`📋 Total Tables in PostgreSQL: ${tables.length}`);
      console.log('\nTables:');
      tables.forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.table_name}`);
      });
    } catch (err) {
      console.error('❌ PostgreSQL Error:', err.message);
    } finally {
      await sequelize.close();
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // ==================== MongoDB ====================
    console.log('🟢 MongoDB Database:');
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

    try {
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
      });

      console.log('✅ Connected to MongoDB');

      // Get all collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`📋 Total Collections in MongoDB: ${collections.length}`);
      console.log('\nCollections:');
      collections.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.name}`);
      });

      await mongoose.disconnect();
    } catch (err) {
      console.error('❌ MongoDB Error:', err.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');
    console.log('✨ Database check completed!');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

checkDatabases();
