/**
 * ✨ StyleInspiration Seeder (Phase 1 - Root Model)
 * Seeds the style_inspiration table
 * No dependencies
 */

const models = require('../../../models_sql');

const styleInspirationData = [
  {
    title: 'Casual Friday Look',
    description: 'Perfect outfit for casual Friday at work',
    imageUrl: 'https://cdn.example.com/style/casual-friday.jpg',
    isPublished: true
  },
  {
    title: 'Date Night Outfit',
    description: 'Elegant evening wear for special occasions',
    imageUrl: 'https://cdn.example.com/style/date-night.jpg',
    isPublished: true
  }
];

async function seedStyleInspirations() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting StyleInspiration seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const StyleInspiration = models._raw?.StyleInspiration || models.StyleInspiration;
    if (!StyleInspiration || !StyleInspiration.create) {
      throw new Error('StyleInspiration model not available');
    }

    let createdCount = 0;
    const count = await StyleInspiration.count();
    
    if (count > 0) {
      console.log(`✅ StyleInspiration data already exists (${count} records)`);
      return true;
    }

    for (const style of styleInspirationData) {
      await StyleInspiration.create(style);
      console.log(`✅ Created style inspiration: ${style.title}`);
      createdCount++;
    }

    console.log(`✨ StyleInspiration seeding completed (${createdCount} new inspirations)\n`);
    return true;
  } catch (error) {
    console.error('❌ StyleInspiration seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedStyleInspirations };
