const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function syncDatabase() {
  try {
    console.log('🔄 Starting database sync...');
    
    const models = require('../models_sql');
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    
    if (!sequelize) {
      throw new Error('Failed to get Sequelize instance');
    }

    const User = models._raw?.User || models.User;
    
    console.log('📊 Syncing User model only (to add new columns)...');
    await User.sync({ alter: true });
    
    console.log('✅ User table synced successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database sync failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

syncDatabase();
