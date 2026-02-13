/**
 * 📂 SubCategory Seeder (Phase 2 - Tier 1)
 * Depends on: Category
 * Creates sub-categories for each main category
 */

const models = require('../../../models_sql');

const subCategoryMapping = {
  'Men': [
    { name: 'T-Shirts', slug: 'mens-tshirts' },
    { name: 'Shirts', slug: 'mens-shirts' },
    { name: 'Pants', slug: 'mens-pants' },
    { name: 'Jackets', slug: 'mens-jackets' }
  ],
  'Women': [
    { name: 'Tops', slug: 'womens-tops' },
    { name: 'Dresses', slug: 'womens-dresses' },
    { name: 'Skirts', slug: 'womens-skirts' },
    { name: 'Blazers', slug: 'womens-blazers' }
  ],
  'Kids': [
    { name: 'Boys', slug: 'kids-boys' },
    { name: 'Girls', slug: 'kids-girls' },
    { name: 'Toddlers', slug: 'kids-toddlers' }
  ],
  'Footwear': [
    { name: 'Casual Shoes', slug: 'casual-shoes' },
    { name: 'Sports Shoes', slug: 'sports-shoes' },
    { name: 'Formal Shoes', slug: 'formal-shoes' },
    { name: 'Sandals', slug: 'sandals' }
  ],
  'Accessories': [
    { name: 'Belts', slug: 'belts' },
    { name: 'Bags', slug: 'bags' },
    { name: 'Watches', slug: 'watches' },
    { name: 'Jewelry', slug: 'jewelry' }
  ]
};

async function seedSubCategories() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting SubCategory seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const SubCategory = models._raw?.SubCategory || models.SubCategory;
    const Category = models._raw?.Category || models.Category;

    if (!SubCategory || !SubCategory.create) throw new Error('SubCategory model not available');
    if (!Category || !Category.findOne) throw new Error('Category model not available');

    let createdCount = 0;

    for (const [catName, subCats] of Object.entries(subCategoryMapping)) {
      const category = await Category.findOne({ where: { name: catName } });
      
      if (!category) {
        console.warn(`⚠️ Category '${catName}' not found. Skipping subcategories.`);
        continue;
      }

      for (const subCat of subCats) {
        const existing = await SubCategory.findOne({
          where: { name: subCat.name, categoryId: category.id }
        });

        if (existing) {
          console.log(`✅ SubCategory '${subCat.name}' already exists (skipping)`);
          continue;
        }

        await SubCategory.create({
          name: subCat.name,
          slug: subCat.slug,
          categoryId: category.id
        });

        console.log(`✅ Created subcategory: ${subCat.name} (under ${catName})`);
        createdCount++;
      }
    }

    console.log(`✨ SubCategory seeding completed (${createdCount} new subcategories)\n`);
    return true;
  } catch (error) {
    console.error('❌ SubCategory seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedSubCategories };
