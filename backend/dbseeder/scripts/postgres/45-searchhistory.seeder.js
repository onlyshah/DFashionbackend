/**
 * 🔍 SearchHistory Seeder (Phase 4 - Tier 3)
 * Depends on: User
 */

const models = require('../../../models_sql');

async function seedSearchHistories() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting SearchHistory seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const SearchHistory = models._raw?.SearchHistory || models.SearchHistory;
    const User = models._raw?.User || models.User;

    if (!SearchHistory || !SearchHistory.create) throw new Error('SearchHistory model not available');

    const users = await User.findAll({ limit: 2 });
    if (users.length === 0) throw new Error('No users found');

    const count = await SearchHistory.count();
    if (count > 0) {
      console.log(`✅ SearchHistory data already exists (${count} records)`);
      return true;
    }

    const searches = ['t-shirt', 'jeans', 'shoes', 'dress', 'jacket'];

    for (const user of users) {
      for (const query of searches) {
        await SearchHistory.create({
          userId: user.id,
          searchQuery: query,
          category: 'fashion',
          searchedAt: new Date()
        });
      }
      console.log(`✅ Created search history for user: ${user.email}`);
    }

    console.log(`✨ SearchHistory seeding completed\n`);
    return true;
  } catch (error) {
    console.error('❌ SearchHistory seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedSearchHistories };
