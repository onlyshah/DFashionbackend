// Compliance Seeder Script - PostgreSQL
// Seeds compliance records and regulatory tracking data
// Usage: node scripts/compliance.seeder.js

require('dotenv').config();
const { getSequelize } = require('../../../config/sequelize');
const modelsModule = require('../../../models_sql');

let sequelize;
let Compliance;

const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();
if (!DB_TYPE.includes('postgres')) {
  console.log('⏭️  Skipping compliance.seeder - Postgres disabled (DB_TYPE=' + DB_TYPE + ')');
  process.exit(0);
}

let sequelize;

const COMPLIANCE_DATA = [
  { policy_name: 'Data Privacy Policy', policy_type: 'GDPR', status: 'active', version: '2.1', last_reviewed: new Date(Date.now() - 30*24*60*60*1000), next_review_date: new Date(Date.now() + 150*24*60*60*1000), is_active: true },
  { policy_name: 'Terms of Service', policy_type: 'TOS', status: 'active', version: '1.5', last_reviewed: new Date(Date.now() - 60*24*60*60*1000), next_review_date: new Date(Date.now() + 120*24*60*60*1000), is_active: true },
  { policy_name: 'Cookie Consent Policy', policy_type: 'Cookie', status: 'active', version: '1.2', last_reviewed: new Date(Date.now() - 90*24*60*60*1000), next_review_date: new Date(Date.now() + 90*24*60*60*1000), is_active: true },
  { policy_name: 'Return & Refund Policy', policy_type: 'Commerce', status: 'active', version: '2.0', last_reviewed: new Date(Date.now() - 45*24*60*60*1000), next_review_date: new Date(Date.now() + 135*24*60*60*1000), is_active: true },
  { policy_name: 'Accessibility Compliance', policy_type: 'A11Y', status: 'active', version: '1.0', last_reviewed: new Date(Date.now() - 30*24*60*60*1000), next_review_date: new Date(Date.now() + 150*24*60*60*1000), is_active: true }
];

async function seedCompliance() {
  try {
    console.log('🚀 Starting PostgreSQL Compliance Seeder...\n');
    sequelize = await getSequelize();
    if (!sequelize) throw new Error('Failed to initialize sequelize');
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // Reinitialize models now that sequelize is connected
    if (modelsModule.reinitializeModels) {
      await modelsModule.reinitializeModels();
    }
    Compliance = modelsModule._raw.Compliance;
    if (!Compliance) throw new Error('Compliance model not initialized');

    const existing = await Compliance.count();
    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing compliance records. Clearing...\n`);
      await Compliance.destroy({ where: {} });
    }

    console.log('📝 Seeding compliance records...');
    let seededCount = 0;
    for (const complianceData of COMPLIANCE_DATA) {
      const compliance = await Compliance.create(complianceData);
      console.log(`  ✓ Created compliance record: ${compliance.policy_name}`);
      seededCount++;
    }

    console.log(`\n✅ Successfully seeded ${seededCount} compliance records\n`);
    console.log('═'.repeat(50));
    console.log('COMPLIANCE SEEDING COMPLETE');
    console.log('═'.repeat(50));
    console.log('\nSeeded Compliance Records:');
    COMPLIANCE_DATA.forEach(c => console.log(`  • ${c.policy_name} (${c.policy_type})`));
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Compliance Seeding failed:', error.message);
    process.exit(1);
  }
}

seedCompliance();
