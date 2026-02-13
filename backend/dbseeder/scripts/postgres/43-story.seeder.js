/**
 * 🎥 Story Seeder (Phase 4 - Tier 3)
 * Depends on: User
 */

const models = require('../../../models_sql');

async function seedStories() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Story seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Story = models._raw?.Story || models.Story;
    const User = models._raw?.User || models.User;

    if (!Story || !Story.create) throw new Error('Story model not available');
    if (!User || !User.findOne) throw new Error('User model not available');

    const user = await User.findOne({ where: { username: 'seller1' } });
    if (!user) throw new Error('User not found');

    const count = await Story.count();
    if (count > 0) {
      console.log(`✅ Story data already exists (${count} records)`);
      return true;
    }

    const stories = [
      { content: 'Check out our latest collection! 🔥', userId: user.id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      { content: 'New arrivals coming soon! ✨', userId: user.id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }
    ];

    for (const story of stories) {
      await Story.create(story);
      console.log(`✅ Created story`);
    }

    console.log(`✨ Story seeding completed\n`);
    return true;
  } catch (error) {
    console.error('❌ Story seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedStories };
