/**
 * 📂 Category Seeder (Phase 1 - Root Model)
 * Seeds the categories table with fashion categories
 * No dependencies
 */

const models = require('../../../models_sql');

const categoryData = [
  { name: 'Men', slug: 'men', description: 'Men fashion and apparel', image: '/uploads/categories/men.svg', icon: '👔', sortOrder: 1 },
  { name: 'Women', slug: 'women', description: 'Women fashion and apparel', image: '/uploads/categories/women.svg', icon: '👗', sortOrder: 2 },
  { name: 'Kids', slug: 'kids', description: 'Kids and children clothing', image: '/uploads/categories/kids.svg', icon: '👶', sortOrder: 3 },
  { name: 'Accessories', slug: 'accessories', description: 'Fashion accessories', image: '/uploads/categories/accessories.svg', icon: '💍', sortOrder: 4 },
  { name: 'Footwear', slug: 'footwear', description: 'Shoes and footwear', image: '/uploads/categories/shoes.svg', icon: '👟', sortOrder: 5 },
  { name: 'Sportswear', slug: 'sportswear', description: 'Sports and athletic wear', image: '/uploads/categories/sportswear.svg', icon: '⚽', sortOrder: 6 },
  { name: 'Ethnic Wear', slug: 'ethnic-wear', description: 'Traditional and ethnic clothing', image: '/uploads/categories/ethnic-wear.svg', icon: '🥻', sortOrder: 7 },
  { name: 'Western Wear', slug: 'western-wear', description: 'Western style clothing', image: '/uploads/categories/western-wear.svg', icon: '🤠', sortOrder: 8 },
  { name: 'Formal Wear', slug: 'formal-wear', description: 'Formal and business attire', image: '/uploads/categories/formal-wear.svg', icon: '🎩', sortOrder: 9 },
  { name: 'Casual Wear', slug: 'casual-wear', description: 'Casual everyday clothing', image: '/uploads/categories/casual-wear.svg', icon: '👕', sortOrder: 10 }
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
        // Update existing category with image and icon if missing
        const needsUpdate = !existing.image || !existing.icon;
        if (needsUpdate) {
          await existing.update({
            image: cat.image,
            icon: cat.icon,
            sortOrder: cat.sortOrder,
            description: cat.description || existing.description
          });
          console.log(`✅ Updated category '${cat.name}' with image and icon`);
        } else {
          console.log(`✅ Category '${cat.name}' already exists (skipping)`);
        }
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
