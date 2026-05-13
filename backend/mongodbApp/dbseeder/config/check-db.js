const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');

async function checkDatabases() {
  try {
    console.log('\n📊 Database Tables/Collections Check\n' + '='.repeat(60));

    // ==================== PostgreSQL ====================
    console.log('\n🔵 PostgreSQL Database:');
    
    try {
      // Direct Sequelize connection
      const sequelize = new Sequelize({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '1234',
        database: process.env.DB_NAME || 'dfashion',
        dialect: 'postgres',
        logging: false
      });

      await sequelize.authenticate();
      console.log('✅ Connected to PostgreSQL');

      // Query tables - with raw: true to get plain objects
      const tables = await sequelize.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;",
        { raw: true, type: sequelize.QueryTypes.SELECT }
      );
      
      console.log(`📋 Total Tables: ${tables.length}\n`);
      console.log('Tables List:');
      tables.forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.table_name}`);
      });

      await sequelize.close();
    } catch (err) {
      console.error('❌ PostgreSQL Error:', err.message);
    }

    console.log('\n' + '='.repeat(60));

    // ==================== MongoDB ====================
    console.log('\n🟢 MongoDB Database:');
    
    try {
      const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';
      
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
      });

      console.log('✅ Connected to MongoDB');

      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`📋 Total Collections: ${collections.length}\n`);
      console.log('Collections:');
      collections.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.name}`);
      });

      await mongoose.disconnect();
    } catch (err) {
      console.error('⚠️ MongoDB Error:', err.message);
      console.log('(MongoDB may not be running or not configured)\n');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✨ Database check completed!\n');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

checkDatabases();
