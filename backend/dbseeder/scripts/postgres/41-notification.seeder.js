/**
 * 🔔 Notification Seeder (Phase 4 - Tier 3)
 * Depends on: User
 */

const models = require('../../../models_sql');

async function seedNotifications() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Notification seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Notification = models._raw?.Notification || models.Notification;
    const User = models._raw?.User || models.User;

    if (!Notification || !Notification.create) throw new Error('Notification model not available');
    if (!User || !User.findAll) throw new Error('User model not available');

    const users = await User.findAll({ limit: 2 });
    if (users.length === 0) throw new Error('No users found');

    let createdCount = 0;
    const count = await Notification.count();
    
    if (count > 0) {
      console.log(`✅ Notification data already exists (${count} records)`);
      return true;
    }

    for (const user of users) {
      await Notification.create({
        userId: user.id,
        type: 'order_update',
        title: 'Order Shipped',
        message: 'Your order has been shipped',
        read: false
      });

      console.log(`✅ Created notification for: ${user.email}`);
      createdCount++;
    }

    console.log(`✨ Notification seeding completed (${createdCount} new notifications)\n`);
    return true;
  } catch (error) {
    console.error('❌ Notification seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedNotifications };
