/**
 * 🔐 Session Seeder (Phase 4 - Tier 3)
 * Depends on: User
 */

const models = require('../../../models_sql');

async function seedSessions() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Session seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Session = models._raw?.Session || models.Session;
    const User = models._raw?.User || models.User;

    if (!Session || !Session.create) throw new Error('Session model not available');
    if (!User || !User.findAll) throw new Error('User model not available');

    const users = await User.findAll({ limit: 3 });
    if (users.length === 0) throw new Error('No users found');

    let createdCount = 0;
    const count = await Session.count();
    
    if (count > 0) {
      console.log(`✅ Session data already exists (${count} records)`);
      return true;
    }

    for (const user of users) {
      await Session.create({
        userId: user.id,
        token: `token_${user.id}_${Date.now()}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
        ipAddress: '192.168.1.1',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      console.log(`✅ Created session for: ${user.email}`);
      createdCount++;
    }

    console.log(`✨ Session seeding completed (${createdCount} new sessions)\n`);
    return true;
  } catch (error) {
    console.error('❌ Session seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedSessions };
