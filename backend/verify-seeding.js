const { sequelize } = require('./models_sql');
const models = require('./models_sql');

async function verifySeed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');
    
    let total = 0;
    console.log('📊 Complete Record Counts:\n');
    
    // Get all models
    const modelKeys = Object.keys(models).filter(k => k !== 'sequelize' && k !== 'Sequelize');
    
    for (const key of modelKeys.sort()) {
      const model = models[key];
      if (model.count && typeof model.count === 'function') {
        const count = await model.count().catch(() => 0);
        if (count > 0) {
          console.log(`  ${key}: ${count}`);
          total += count;
        }
      }
    }
    
    console.log(`\n✅ Total: ${total} records seeded`);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sequelize.close();
  }
}

verifySeed();
