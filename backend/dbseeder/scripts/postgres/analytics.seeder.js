// Analytics Seeder Script - PostgreSQL
// Seeds analytics and tracking data
// Usage: node scripts/analytics.seeder.js

require('dotenv').config();
const { getSequelize } = require('../../../config/sequelize');
const modelsModule = require('../../../models_sql');

let sequelize;
let Analytics;

const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();
if (!DB_TYPE.includes('postgres')) {
  console.log('⏭️  Skipping analytics.seeder - Postgres disabled (DB_TYPE=' + DB_TYPE + ')');
  process.exit(0);
}

let sequelize;

const ANALYTICS_DATA = [
  { event_type: 'page_view', event_name: 'Homepage Viewed', event_count: 5234, conversion_rate: 12.5, tracking_date: new Date(Date.now() - 30*24*60*60*1000) },
  { event_type: 'product_view', event_name: 'Product Viewed', event_count: 18934, conversion_rate: 8.3, tracking_date: new Date(Date.now() - 30*24*60*60*1000) },
  { event_type: 'add_to_cart', event_name: 'Item Added to Cart', event_count: 3421, conversion_rate: 15.2, tracking_date: new Date(Date.now() - 30*24*60*60*1000) },
  { event_type: 'checkout_initiated', event_name: 'Checkout Started', event_count: 2156, conversion_rate: 45.8, tracking_date: new Date(Date.now() - 30*24*60*60*1000) },
  { event_type: 'purchase', event_name: 'Order Completed', event_count: 987, conversion_rate: 100, tracking_date: new Date(Date.now() - 30*24*60*60*1000) }
];

async function seedAnalytics() {
  try {
    console.log('🚀 Starting PostgreSQL Analytics Seeder...\n');
    sequelize = await getSequelize();
    if (!sequelize) throw new Error('Failed to initialize sequelize');
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // Reinitialize models now that sequelize is connected
    if (modelsModule.reinitializeModels) {
      await modelsModule.reinitializeModels();
    }
    Analytics = modelsModule._raw.Analytics;
    if (!Analytics) throw new Error('Analytics model not initialized');

    const existing = await Analytics.count();
    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing analytics records. Clearing...\n`);
      await Analytics.destroy({ where: {} });
    }

    console.log('📝 Seeding analytics records...');
    let seededCount = 0;
    for (const analyticsData of ANALYTICS_DATA) {
      const analytics = await Analytics.create(analyticsData);
      console.log(`  ✓ Created analytics record: ${analytics.event_name}`);
      seededCount++;
    }

    console.log(`\n✅ Successfully seeded ${seededCount} analytics records\n`);
    console.log('═'.repeat(50));
    console.log('ANALYTICS SEEDING COMPLETE');
    console.log('═'.repeat(50));
    console.log('\nSeeded Analytics Records:');
    ANALYTICS_DATA.forEach(a => console.log(`  • ${a.event_name} - ${a.event_count} events`));
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Analytics Seeding failed:', error.message);
    process.exit(1);
  }
}

seedAnalytics();
