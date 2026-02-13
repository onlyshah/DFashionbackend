/**
 * 📊 Analytics Seeder (Phase 1 - Root Model)
 * Seeds the analytics table
 * No dependencies
 */

const models = require('../../../models_sql');

const analyticsData = [
  {
    eventType: 'pageview',
    eventName: 'Home Page View',
    action: 'page_view',
    data: { page: 'home', views: 1000 },
    timestamp: new Date()
  },
  {
    eventType: 'product',
    eventName: 'Product View',
    action: 'product_view',
    data: { category: 'men', views: 500 },
    timestamp: new Date()
  },
  {
    event: 'add_to_cart',
    data: { count: 250 },
    timestamp: new Date()
  },
  {
    event: 'conversion',
    data: { orders: 50, revenue: 100000 },
    timestamp: new Date()
  }
];

async function seedAnalytics() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Analytics seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Analytics = models._raw?.Analytics || models.Analytics;
    if (!Analytics || !Analytics.create) {
      throw new Error('Analytics model not available');
    }

    let createdCount = 0;
    const count = await Analytics.count();
    
    if (count > 0) {
      console.log(`✅ Analytics data already exists (${count} records)`);
      return true;
    }

    for (const record of analyticsData) {
      await Analytics.create(record);
      console.log(`✅ Created analytics: ${record.event}`);
      createdCount++;
    }

    console.log(`✨ Analytics seeding completed (${createdCount} new records)\n`);
    return true;
  } catch (error) {
    console.error('❌ Analytics seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedAnalytics };
