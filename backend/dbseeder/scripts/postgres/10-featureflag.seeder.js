/**
 * ⚙️ FeatureFlag Seeder (Phase 1 - Root Model)
 * Seeds the feature_flags table
 * No dependencies
 */

const models = require('../../../models_sql');

const flagData = [
  { name: 'new_checkout', description: 'Enable new checkout flow', isEnabled: true },
  { name: 'dark_mode', description: 'Enable dark mode interface', isEnabled: false },
  { name: 'real_time_notifications', description: 'Real-time notification system', isEnabled: true },
  { name: 'advanced_search', description: 'Advanced search features', isEnabled: true },
  { name: 'one_click_checkout', description: 'One-click purchase', isEnabled: false },
  { name: 'product_reviews_v2', description: 'New review system', isEnabled: true },
  { name: 'ai_recommendations', description: 'AI-based product recommendations', isEnabled: true },
  { name: 'loyalty_program', description: 'Loyalty points program', isEnabled: true }
];

async function seedFeatureFlags() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting FeatureFlag seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const FeatureFlag = models._raw?.FeatureFlag || models.FeatureFlag;
    if (!FeatureFlag || !FeatureFlag.create) {
      throw new Error('FeatureFlag model not available');
    }

    let createdCount = 0;
    for (const flag of flagData) {
      const existing = await FeatureFlag.findOne({
        where: { name: flag.name }
      });

      if (existing) {
        console.log(`✅ FeatureFlag '${flag.name}' already exists (skipping)`);
        continue;
      }

      await FeatureFlag.create(flag);
      console.log(`✅ Created feature flag: ${flag.name}`);
      createdCount++;
    }

    console.log(`✨ FeatureFlag seeding completed (${createdCount} new flags)\n`);
    return true;
  } catch (error) {
    console.error('❌ FeatureFlag seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedFeatureFlags };
