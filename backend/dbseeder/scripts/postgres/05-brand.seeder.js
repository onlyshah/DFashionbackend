/**
 * 🏷️ Brand Seeder (Phase 1 - Root Model)
 * Seeds the brands table with fashion brands
 * No dependencies
 */

const models = require('../../../models_sql');
const { createFashionArtwork } = require('../../utils/image-utils');

const brandData = [
  ['Nike', 'Athletic and sports brand'],
  ['Adidas', 'Sports equipment and apparel'],
  ['Puma', 'Sports lifestyle brand'],
  ['Tommy Hilfiger', 'Premium fashion brand'],
  ['Ralph Lauren', 'Luxury brand'],
  ['Calvin Klein', 'Designer brand'],
  ['H&M', 'Fast fashion retailer'],
  ['Zara', 'Fashion brand'],
  ['Forever 21', 'Affordable fashion'],
  ['Gucci', 'Luxury brand'],
  ['Louis Vuitton', 'Premium luxury brand'],
  ['Versace', 'Italian luxury brand'],
  ['Chanel', 'French luxury brand'],
  ['Dior', 'French fashion house'],
  ['Prada', 'Italian luxury brand']
].map(([name, description]) => ({
  name,
  description,
  logoUrl: createFashionArtwork('brands', name, 1, { subtitle: 'Fashion brand', width: 720, height: 720 })
}));
];

async function seedBrands() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Brand seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Brand = models._raw?.Brand || models.Brand;
    if (!Brand || !Brand.create) {
      throw new Error('Brand model not available');
    }

    let createdCount = 0;
    for (const brand of brandData) {
      const existing = await Brand.findOne({
        where: { name: brand.name }
      });

      if (existing) {
        console.log(`✅ Brand '${brand.name}' already exists (skipping)`);
        continue;
      }

      await Brand.create(brand);
      console.log(`✅ Created brand: ${brand.name}`);
      createdCount++;
    }

    console.log(`✨ Brand seeding completed (${createdCount} new brands)\n`);
    return true;
  } catch (error) {
    console.error('❌ Brand seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedBrands };
