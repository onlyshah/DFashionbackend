// Alert Seeder Script - PostgreSQL
// Seeds sample system and user alerts
// Usage: node scripts/alert.seeder.js

require('dotenv').config();
const { getSequelize } = require('../../../config/sequelize');
const modelsModule = require('../../models_sql/');

let sequelize;
let Alert;

const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();
if (!DB_TYPE.includes('postgres')) {
  console.log('⏭️  Skipping alert.seeder - Postgres disabled (DB_TYPE=' + DB_TYPE + ')');
  process.exit(0);
}

const ALERTS_DATA = [
  { type: 'price_drop', title: 'Price Drop Alert', message: 'Product price reduced by 20%', alert_level: 'info', is_active: true, created_at: new Date(Date.now() - 30*24*60*60*1000), expires_at: new Date(Date.now() + 30*24*60*60*1000) },
  { type: 'stock_alert', title: 'Stock Low Warning', message: 'Product stock below minimum threshold', alert_level: 'warning', is_active: true, created_at: new Date(Date.now() - 20*24*60*60*1000), expires_at: new Date(Date.now() + 40*24*60*60*1000) },
  { type: 'maintenance', title: 'System Maintenance', message: 'Scheduled maintenance on Friday 2 AM - 4 AM IST', alert_level: 'warning', is_active: true, created_at: new Date(Date.now() - 10*24*60*60*1000), expires_at: new Date(Date.now() + 5*24*60*60*1000) },
  { type: 'promotion', title: 'New Offer Available', message: 'Special discount on selected items', alert_level: 'info', is_active: true, created_at: new Date(Date.now() - 7*24*60*60*1000), expires_at: new Date(Date.now() + 20*24*60*60*1000) },
  { type: 'security', title: 'Security Update', message: 'Critical security patches applied', alert_level: 'critical', is_active: true, created_at: new Date(Date.now() - 2*24*60*60*1000), expires_at: new Date(Date.now() + 60*24*60*60*1000) }
];

async function seedAlerts() {
  try {
    console.log('🚀 Starting PostgreSQL Alert Seeder...\n');
    sequelize = await getSequelize();
    if (!sequelize) throw new Error('Failed to initialize sequelize');
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // Reinitialize models now that sequelize is connected
    if (modelsModule.reinitializeModels) {
      await modelsModule.reinitializeModels();
    }
    Alert = modelsModule._raw.Alert;
    if (!Alert) throw new Error('Alert model not initialized');

    const existing = await Alert.count();
    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing alerts. Clearing...\n`);
      await Alert.destroy({ where: {} });
    }

    console.log('📝 Seeding alerts...');
    let seededCount = 0;
    for (const alertData of ALERTS_DATA) {
      const alert = await Alert.create(alertData);
      console.log(`  ✓ Created alert: ${alert.type}`);
      seededCount++;
    }

    console.log(`\n✅ Successfully seeded ${seededCount} alerts\n`);
    console.log('═'.repeat(50));
    console.log('ALERT SEEDING COMPLETE');
    console.log('═'.repeat(50));
    console.log('\nSeeded Alerts:');
    ALERTS_DATA.forEach(a => console.log(`  • ${a.type} - ${a.title}`));
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Alert Seeding failed:', error.message);
    process.exit(1);
  }
}

seedAlerts();

