/**
 * 🎁 SmartCollection Seeder (Phase 1 - Root Model)
 * Seeds the smart_collections table
 * No dependencies
 */

const models = require('../../../models_sql');

const smartCollectionData = [
  { name: 'Trending Now', slug: 'trending-now', description: 'Currently trending products', rules: { sortBy: 'trending' }, isActive: true },
  { name: 'Best Sellers', slug: 'best-sellers', description: 'Top selling items', rules: { sortBy: 'sales' }, isActive: true },
  { name: 'New Arrivals', slug: 'new-arrivals', description: 'Recently added products', rules: { sortBy: 'newest' }, isActive: true },
  { name: 'On Sale', slug: 'on-sale', description: 'Discounted items', rules: { filter: 'hasDiscount' }, isActive: true }
];

async function seedSmartCollections() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting SmartCollection seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const SmartCollection = models._raw?.SmartCollection || models.SmartCollection;
    if (!SmartCollection || !SmartCollection.create) {
      throw new Error('SmartCollection model not available');
    }

    let createdCount = 0;
    const count = await SmartCollection.count();
    
    if (count > 0) {
      console.log(`✅ SmartCollection data already exists (${count} records)`);
      return true;
    }

    for (const coll of smartCollectionData) {
      await SmartCollection.create(coll);
      console.log(`✅ Created smart collection: ${coll.name}`);
      createdCount++;
    }

    console.log(`✨ SmartCollection seeding completed (${createdCount} new collections)\n`);
    return true;
  } catch (error) {
    console.error('❌ SmartCollection seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedSmartCollections };
