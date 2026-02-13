/**
 * 🎨 Banner Seeder (Phase 1 - Root Model)
 * Seeds the banners table with promotional banners
 * No dependencies
 */

const models = require('../../../models_sql');

const bannerData = [
  {
    title: 'Summer Collection',
    imageUrl: 'https://cdn.example.com/banners/summer.jpg',
    link: '/collections/summer',
    position: 'header',
    isActive: true
  },
  {
    title: 'New Arrivals',
    imageUrl: 'https://cdn.example.com/banners/new-arrivals.jpg',
    link: '/new-arrivals',
    position: 'footer',
    isActive: true
  },
  {
    title: 'Clearance Sale',
    imageUrl: 'https://cdn.example.com/banners/clearance.jpg',
    link: '/sale',
    position: 'sidebar',
    isActive: true
  }
];

async function seedBanners() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Banner seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Banner = models._raw?.Banner || models.Banner;
    if (!Banner || !Banner.create) {
      throw new Error('Banner model not available');
    }

    let createdCount = 0;
    const count = await Banner.count();
    
    if (count > 0) {
      console.log(`✅ Banner data already exists (${count} records)`);
      return true;
    }

    for (const banner of bannerData) {
      await Banner.create(banner);
      console.log(`✅ Created banner: ${banner.title}`);
      createdCount++;
    }

    console.log(`✨ Banner seeding completed (${createdCount} new banners)\n`);
    return true;
  } catch (error) {
    console.error('❌ Banner seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedBanners };
