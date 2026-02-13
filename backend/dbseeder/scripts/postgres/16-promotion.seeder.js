/**
 * 🎯 Promotion Seeder (Phase 1 - Root Model)
 * Seeds the promotions table
 * No dependencies
 */

const models = require('../../../models_sql');

const promotionData = [
  {
    title: 'Summer Sale',
    description: 'Up to 50% off on summer collection',
    discount: 50,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true
  },
  {
    title: 'Flash Sale',
    description: '24-hour flash sale on selected items',
    discount: 30,
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    isActive: true
  }
];

async function seedPromotions() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Promotion seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Promotion = models._raw?.Promotion || models.Promotion;
    if (!Promotion || !Promotion.create) {
      throw new Error('Promotion model not available');
    }

    let createdCount = 0;
    const count = await Promotion.count();
    
    if (count > 0) {
      console.log(`✅ Promotion data already exists (${count} records)`);
      return true;
    }

    for (const promo of promotionData) {
      await Promotion.create(promo);
      console.log(`✅ Created promotion: ${promo.title}`);
      createdCount++;
    }

    console.log(`✨ Promotion seeding completed (${createdCount} new promotions)\n`);
    return true;
  } catch (error) {
    console.error('❌ Promotion seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedPromotions };
