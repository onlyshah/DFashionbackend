/**
 * 🔍 SearchSuggestion Seeder (Phase 1 - Root Model)
 * Seeds the search_suggestions table
 * No dependencies
 */

const models = require('../../../models_sql');

const searchSuggestionData = [
  { keyword: 't-shirt', searches: 500, category: 'clothing', isActive: true },
  { keyword: 'jeans', searches: 450, category: 'clothing', isActive: true },
  { keyword: 'summer dress', searches: 380, category: 'clothing', isActive: true },
  { keyword: 'formal wear', searches: 320, category: 'fashion', isActive: true },
  { keyword: 'sports shoes', searches: 290, category: 'footwear', isActive: true },
  { keyword: 'ethnic wear', searches: 270, category: 'fashion', isActive: true },
  { keyword: 'women accessories', searches: 250, category: 'accessories', isActive: true },
  { keyword: 'kids clothing', searches: 200, category: 'fashion', isActive: true }
];

async function seedSearchSuggestions() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting SearchSuggestion seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const SearchSuggestion = models._raw?.SearchSuggestion || models.SearchSuggestion;
    if (!SearchSuggestion || !SearchSuggestion.create) {
      throw new Error('SearchSuggestion model not available');
    }

    let createdCount = 0;
    const count = await SearchSuggestion.count();
    
    if (count > 0) {
      console.log(`✅ SearchSuggestion data already exists (${count} records)`);
      return true;
    }

    for (const suggestion of searchSuggestionData) {
      await SearchSuggestion.create(suggestion);
      console.log(`✅ Created search suggestion: ${suggestion.query}`);
      createdCount++;
    }

    console.log(`✨ SearchSuggestion seeding completed (${createdCount} new suggestions)\n`);
    return true;
  } catch (error) {
    console.error('❌ SearchSuggestion seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedSearchSuggestions };
