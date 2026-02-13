/**
 * 📈 TrendingSearch Seeder (Phase 1 - Root Model)
 * Seeds the trending_searches table
 * No dependencies
 */

const models = require('../../../models_sql');

const trendingSearchData = [
  { query: 'summer collection', searchCount: 5000 },
  { query: 'cotton shirts', searchCount: 3200 },
  { query: 'black jeans', searchCount: 2800 },
  { query: 'casual shoes', searchCount: 2100 },
  { query: 'formal dresses', searchCount: 1900 }
];

async function seedTrendingSearches() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting TrendingSearch seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const TrendingSearch = models._raw?.TrendingSearch || models.TrendingSearch;
    if (!TrendingSearch || !TrendingSearch.create) {
      throw new Error('TrendingSearch model not available');
    }

    let createdCount = 0;
    const count = await TrendingSearch.count();
    
    if (count > 0) {
      console.log(`✅ TrendingSearch data already exists (${count} records)`);
      return true;
    }

    for (const trend of trendingSearchData) {
      await TrendingSearch.create(trend);
      console.log(`✅ Created trending search: ${trend.query}`);
      createdCount++;
    }

    console.log(`✨ TrendingSearch seeding completed (${createdCount} new trends)\n`);
    return true;
  } catch (error) {
    console.error('❌ TrendingSearch seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedTrendingSearches };
