// Data Governance Seeder Script - PostgreSQL
// Seeds data governance and GDPR compliance records
// Usage: node scripts/data-governance.seeder.js

require('dotenv').config();
const { getSequelize } = require('../../../config/sequelize');
const modelsModule = require('../../models_sql/');

let sequelize;
let DataGovernance;

const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();
if (!DB_TYPE.includes('postgres')) {
  console.log('⏭️  Skipping data-governance.seeder - Postgres disabled (DB_TYPE=' + DB_TYPE + ')');
  process.exit(0);
}

let sequelize;

const DATA_GOVERNANCE = [
  { data_category: 'Personal Information', classification: 'PII', retention_days: 2555, has_data_processing_agreement: true, is_active: true, created_at: new Date(Date.now() - 180*24*60*60*1000) },
  { data_category: 'Payment Information', classification: 'Sensitive', retention_days: 2555, has_data_processing_agreement: true, is_active: true, created_at: new Date(Date.now() - 150*24*60*60*1000) },
  { data_category: 'Order History', classification: 'PII', retention_days: 1825, has_data_processing_agreement: true, is_active: true, created_at: new Date(Date.now() - 120*24*60*60*1000) },
  { data_category: 'Marketing Consent', classification: 'Consent', retention_days: 912, has_data_processing_agreement: true, is_active: true, created_at: new Date(Date.now() - 90*24*60*60*1000) },
  { data_category: 'System Logs', classification: 'Internal', retention_days: 365, has_data_processing_agreement: false, is_active: true, created_at: new Date(Date.now() - 60*24*60*60*1000) }
];

async function seedDataGovernance() {
  try {
    console.log('🚀 Starting PostgreSQL Data Governance Seeder...\n');
    sequelize = await getSequelize();
    if (!sequelize) throw new Error('Failed to initialize sequelize');
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // Reinitialize models now that sequelize is connected
    if (modelsModule.reinitializeModels) {
      await modelsModule.reinitializeModels();
    }
    DataGovernance = modelsModule._raw.DataGovernance;
    if (!DataGovernance) throw new Error('DataGovernance model not initialized');

    const existing = await DataGovernance.count();
    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing governance records. Clearing...\n`);
      await DataGovernance.destroy({ where: {} });
    }

    console.log('📝 Seeding data governance records...');
    let seededCount = 0;
    for (const govData of DATA_GOVERNANCE) {
      const governance = await DataGovernance.create(govData);
      console.log(`  ✓ Created governance record: ${governance.data_category}`);
      seededCount++;
    }

    console.log(`\n✅ Successfully seeded ${seededCount} governance records\n`);
    console.log('═'.repeat(50));
    console.log('DATA GOVERNANCE SEEDING COMPLETE');
    console.log('═'.repeat(50));
    console.log('\nSeeded Governance Records:');
    DATA_GOVERNANCE.forEach(d => console.log(`  • ${d.data_category} (${d.classification})`));
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Data Governance Seeding failed:', error.message);
    process.exit(1);
  }
}

seedDataGovernance();

