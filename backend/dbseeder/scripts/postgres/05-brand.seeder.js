/**
 * 🏷️ Brand Seeder (Phase 1 - Root Model)
 * Seeds the brands table with fashion brands
 * No dependencies
 */

const models = require('../../../models_sql');

const brandData = [
  { name: 'Nike', logoUrl: '/uploads/brands/nike.png', description: 'Athletic and sports brand' },
  { name: 'Adidas', logoUrl: '/uploads/brands/adidas.png', description: 'Sports equipment and apparel' },
  { name: 'Puma', logoUrl: '/uploads/brands/puma.png', description: 'Sports lifestyle brand' },
  { name: 'Tommy Hilfiger', logoUrl: '/uploads/brands/tommy-hilfiger.png', description: 'Premium fashion brand' },
  { name: 'Ralph Lauren', logoUrl: '/uploads/brands/ralph-lauren.png', description: 'Luxury brand' },
  { name: 'Calvin Klein', logoUrl: '/uploads/brands/calvin-klein.png', description: 'Designer brand' },
  { name: 'H&M', logoUrl: '/uploads/brands/hm.png', description: 'Fast fashion retailer' },
  { name: 'Zara', logoUrl: '/uploads/brands/zara.png', description: 'Fashion brand' },
  { name: 'Forever 21', logoUrl: '/uploads/brands/forever21.png', description: 'Affordable fashion' },
  { name: 'Gucci', logoUrl: '/uploads/brands/gucci.png', description: 'Luxury brand' },
  { name: 'Louis Vuitton', logoUrl: '/uploads/brands/louis-vuitton.png', description: 'Premium luxury brand' },
  { name: 'Versace', logoUrl: '/uploads/brands/versace.png', description: 'Italian luxury brand' },
  { name: 'Chanel', logoUrl: '/uploads/brands/chanel.png', description: 'French luxury brand' },
  { name: 'Dior', logoUrl: '/uploads/brands/dior.png', description: 'French fashion house' },
  { name: 'Prada', logoUrl: '/uploads/brands/prada.png', description: 'Italian luxury brand' }
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
