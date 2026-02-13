/**
 * ⚡ FlashSale Seeder (Phase 1 - Root Model)
 * Seeds the flash_sales table
 * No dependencies
 */

const models = require('../../../models_sql');

const flashSaleData = [
  {
    name: 'Midnight Sale',
    description: 'Midnight flash sale - 3 hours only',
    discountPercentage: 40,
    startTime: new Date(),
    endTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
    isActive: true
  },
  {
    name: 'Lunch Hour Sale',
    description: 'Special lunch time offers',
    discountPercentage: 25,
    startTime: new Date(Date.now() + 12 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 13 * 60 * 60 * 1000),
    isActive: false
  }
];

async function seedFlashSales() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting FlashSale seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const FlashSale = models._raw?.FlashSale || models.FlashSale;
    if (!FlashSale || !FlashSale.create) {
      throw new Error('FlashSale model not available');
    }

    let createdCount = 0;
    const count = await FlashSale.count();
    
    if (count > 0) {
      console.log(`✅ FlashSale data already exists (${count} records)`);
      return true;
    }

    for (const sale of flashSaleData) {
      await FlashSale.create(sale);
      console.log(`✅ Created flash sale: ${sale.title}`);
      createdCount++;
    }

    console.log(`✨ FlashSale seeding completed (${createdCount} new flash sales)\n`);
    return true;
  } catch (error) {
    console.error('❌ FlashSale seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedFlashSales };
