/**
 * 🎁 Reward Seeder (Phase 4 - Tier 3)
 * Depends on: User
 */

const models = require('../../../models_sql');

async function seedRewards() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Reward seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Reward = models._raw?.Reward || models.Reward;
    const User = models._raw?.User || models.User;

    if (!Reward || !Reward.create) throw new Error('Reward model not available');

    const users = await User.findAll({ limit: 2 });
    if (users.length === 0) throw new Error('No users found');

    const count = await Reward.count();
    if (count > 0) {
      console.log(`✅ Reward data already exists (${count} records)`);
      return true;
    }

    for (const user of users) {
      await Reward.create({
        userId: user.id,
        points: Math.floor(Math.random() * 500) + 100,
        type: 'purchase',
        description: 'Reward points from purchase',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });

      console.log(`✅ Created reward for user: ${user.email}`);
    }

    console.log(`✨ Reward seeding completed\n`);
    return true;
  } catch (error) {
    console.error('❌ Reward seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedRewards };
