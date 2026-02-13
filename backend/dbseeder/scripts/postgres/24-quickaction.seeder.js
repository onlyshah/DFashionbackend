/**
 * ⚡ QuickAction Seeder (Phase 1 - Root Model)
 * Seeds the quick_actions table
 * No dependencies
 */

const models = require('../../../models_sql');

const quickActionData = [
  { name: 'View Cart', url: '/cart', icon: 'shopping-cart', position: 1, isActive: true },
  { name: 'My Orders', url: '/orders', icon: 'list', position: 2, isActive: true },
  { name: 'Wishlist', url: '/wishlist', icon: 'heart', position: 3, isActive: true },
  { name: 'Help', url: '/help', icon: 'question-circle', position: 4, isActive: true },
  { name: 'Account', url: '/account', icon: 'user', position: 5, isActive: true }
];

async function seedQuickActions() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting QuickAction seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const QuickAction = models._raw?.QuickAction || models.QuickAction;
    if (!QuickAction || !QuickAction.create) {
      throw new Error('QuickAction model not available');
    }

    let createdCount = 0;
    const count = await QuickAction.count();
    
    if (count > 0) {
      console.log(`✅ QuickAction data already exists (${count} records)`);
      return true;
    }

    for (const action of quickActionData) {
      await QuickAction.create(action);
      console.log(`✅ Created quick action: ${action.name}`);
      createdCount++;
    }

    console.log(`✨ QuickAction seeding completed (${createdCount} new actions)\n`);
    return true;
  } catch (error) {
    console.error('❌ QuickAction seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedQuickActions };
