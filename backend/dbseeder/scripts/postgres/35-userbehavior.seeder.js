/**
 * 📝 UserBehavior Seeder (Phase 4 - Tier 3)
 * Depends on: User
 */

const models = require('../../../models_sql');

async function seedUserBehaviors() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting UserBehavior seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const UserBehavior = models._raw?.UserBehavior || models.UserBehavior;
    const User = models._raw?.User || models.User;

    if (!UserBehavior || !UserBehavior.create) throw new Error('UserBehavior model not available');
    if (!User || !User.findAll) throw new Error('User model not available');

    const users = await User.findAll({ limit: 3 });
    if (users.length === 0) throw new Error('No users found');

    let createdCount = 0;
    const count = await UserBehavior.count();
    
    if (count > 0) {
      console.log(`✅ UserBehavior data already exists (${count} records)`);
      return true;
    }

    const behaviors = ['page_view', 'product_click', 'add_to_cart', 'wishlist_add', 'checkout'];

    for (const user of users) {
      for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
        await UserBehavior.create({
          userId: user.id,
          event: behaviors[Math.floor(Math.random() * behaviors.length)],
          metadata: JSON.stringify({ page: '/products', timestamp: new Date() })
        });

        console.log(`✅ Created behavior for: ${user.email}`);
        createdCount++;
      }
    }

    console.log(`✨ UserBehavior seeding completed (${createdCount} new records)\n`);
    return true;
  } catch (error) {
    console.error('❌ UserBehavior seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedUserBehaviors };
