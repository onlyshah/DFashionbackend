// Feature Flag Seeder Script - PostgreSQL
// Seeds feature flags for feature toggles and A/B testing
// Usage: node scripts/feature-flag.seeder.js

require('dotenv').config();
const { getSequelize } = require('../../../config/sequelize');
const modelsModule = require('../../../models_sql');

let sequelize;
let FeatureFlag;

const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();
if (!DB_TYPE.includes('postgres')) {
  console.log('⏭️  Skipping feature-flag.seeder - Postgres disabled (DB_TYPE=' + DB_TYPE + ')');
  process.exit(0);
}

let sequelize;

const FLAGS_DATA = [
  { name: 'new_checkout_ui', description: 'New checkout user interface', enabled: true, rollout_percentage: 100, environment: 'production', created_at: new Date(Date.now() - 60*24*60*60*1000), updated_at: new Date() },
  { name: 'live_shopping', description: 'Live shopping feature', enabled: true, rollout_percentage: 75, environment: 'production', created_at: new Date(Date.now() - 45*24*60*60*1000), updated_at: new Date() },
  { name: 'recommendation_engine', description: 'AI-powered product recommendations', enabled: true, rollout_percentage: 50, environment: 'production', created_at: new Date(Date.now() - 30*24*60*60*1000), updated_at: new Date() },
  { name: 'augmented_reality', description: 'AR try-on feature', enabled: false, rollout_percentage: 10, environment: 'staging', created_at: new Date(Date.now() - 20*24*60*60*1000), updated_at: new Date() },
  { name: 'subscription_service', description: 'Subscription box feature', enabled: false, rollout_percentage: 0, environment: 'development', created_at: new Date(Date.now() - 15*24*60*60*1000), updated_at: new Date() }
];

async function seedFlags() {
  try {
    console.log('🚀 Starting PostgreSQL Feature Flag Seeder...\n');
    sequelize = await getSequelize();
    if (!sequelize) throw new Error('Failed to initialize sequelize');
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // Reinitialize models now that sequelize is connected
    if (modelsModule.reinitializeModels) {
      await modelsModule.reinitializeModels();
    }
    FeatureFlag = modelsModule._raw.FeatureFlag;
    if (!FeatureFlag) throw new Error('FeatureFlag model not initialized');

    const existing = await FeatureFlag.count();
    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing flags. Clearing...\n`);
      await FeatureFlag.destroy({ where: {} });
    }

    console.log('📝 Seeding feature flags...');
    let seededCount = 0;
    for (const flagData of FLAGS_DATA) {
      const flag = await FeatureFlag.create(flagData);
      console.log(`  ✓ Created flag: ${flag.name}`);
      seededCount++;
    }

    console.log(`\n✅ Successfully seeded ${seededCount} feature flags\n`);
    console.log('═'.repeat(50));
    console.log('FEATURE FLAG SEEDING COMPLETE');
    console.log('═'.repeat(50));
    console.log('\nSeeded Flags:');
    FLAGS_DATA.forEach(f => console.log(`  • ${f.name} - ${f.description} (${f.enabled ? 'enabled' : 'disabled'})`));
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Feature Flag Seeding failed:', error.message);
    process.exit(1);
  }
}

seedFlags();
