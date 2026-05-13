const models = require('../models_sql');

(async () => {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('DB connection failed');
    
    // Add the missing logoUrl column to brands if it doesn't exist
    await sequelize.query(`
      ALTER TABLE brands ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500)
    `);
    console.log('✅ Added logo_url column to brands table');
    
    // Verify it exists
    const columns = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'brands' 
      AND column_name LIKE '%logo%'
    `, { type: require('sequelize').QueryTypes.SELECT });
    
    console.log('Verified columns:');
    columns.forEach(c => console.log('  ' + c.column_name + ': ' + c.data_type));
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
