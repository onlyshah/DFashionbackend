/**
 * 📂 Category Seeder (Phase 1 - Root Model)
 * Seeds the categories table with fashion categories
 * No dependencies
 */

const models = require('../../../models_sql');

const categoryData = [
  { name: 'Men', slug: 'men', description: 'Men fashion and apparel' },
  { name: 'Women', slug: 'women', description: 'Women fashion and apparel' },
  { name: 'Kids', slug: 'kids', description: 'Kids and children clothing' },
  { name: 'Accessories', slug: 'accessories', description: 'Fashion accessories' },
  { name: 'Footwear', slug: 'footwear', description: 'Shoes and footwear' },
  { name: 'Sportswear', slug: 'sportswear', description: 'Sports and athletic wear' },
  { name: 'Ethnic Wear', slug: 'ethnic-wear', description: 'Traditional and ethnic clothing' },
  { name: 'Western Wear', slug: 'western-wear', description: 'Western style clothing' },
  { name: 'Formal Wear', slug: 'formal-wear', description: 'Formal and business attire' },
  { name: 'Casual Wear', slug: 'casual-wear', description: 'Casual everyday clothing' }
];

async function seedCategories() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Category seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Category = models._raw?.Category || models.Category;
    if (!Category || !Category.create) {
      throw new Error('Category model not available');
    }

    let createdCount = 0;
    for (const cat of categoryData) {
      const existing = await Category.findOne({
        where: { name: cat.name }
      });

      if (existing) {
        console.log(`✅ Category '${cat.name}' already exists (skipping)`);
        continue;
      }

      await Category.create(cat);
      console.log(`✅ Created category: ${cat.name}`);
      createdCount++;
    }

    console.log(`✨ Category seeding completed (${createdCount} new categories)\n`);
    return true;
  } catch (error) {
    console.error('❌ Category seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedCategories };
