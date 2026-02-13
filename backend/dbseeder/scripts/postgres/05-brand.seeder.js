/**
 * 🏷️ Brand Seeder (Phase 1 - Root Model)
 * Seeds the brands table with fashion brands
 * No dependencies
 */

const models = require('../../../models_sql');

const brandData = [
  { name: 'Nike', logoUrl: 'https://example.com/logos/nike.png', description: 'Athletic and sports brand' },
  { name: 'Adidas', logoUrl: 'https://example.com/logos/adidas.png', description: 'Sports equipment and apparel' },
  { name: 'Puma', logoUrl: 'https://example.com/logos/puma.png', description: 'Sports lifestyle brand' },
  { name: 'Tommy Hilfiger', logoUrl: 'https://example.com/logos/tommy.png', description: 'Premium fashion brand' },
  { name: 'Ralph Lauren', logoUrl: 'https://example.com/logos/ralph-lauren.png', description: 'Luxury brand' },
  { name: 'Calvin Klein', logoUrl: 'https://example.com/logos/calvin-klein.png', description: 'Designer brand' },
  { name: 'H&M', logoUrl: 'https://example.com/logos/hm.png', description: 'Fast fashion retailer' },
  { name: 'Zara', logoUrl: 'https://example.com/logos/zara.png', description: 'Fashion brand' },
  { name: 'Forever 21', logoUrl: 'https://example.com/logos/forever21.png', description: 'Affordable fashion' },
  { name: 'Gucci', logoUrl: 'https://example.com/logos/gucci.png', description: 'Luxury brand' },
  { name: 'Louis Vuitton', logoUrl: null, description: 'Premium luxury brand' },
  { name: 'Versace', logoUrl: null, description: 'Italian luxury brand' },
  { name: 'Chanel', logoUrl: null, description: 'French luxury brand' },
  { name: 'Dior', logoUrl: null, description: 'French fashion house' },
  { name: 'Prada', logoUrl: null, description: 'Italian luxury brand' }
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
