/**
 * 💬 ProductComment Seeder (Phase 4 - Tier 3)
 * Depends on: Product, User
 */

const models = require('../../../models_sql');

async function seedProductComments() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting ProductComment seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const ProductComment = models._raw?.ProductComment || models.ProductComment;
    const Product = models._raw?.Product || models.Product;
    const User = models._raw?.User || models.User;

    if (!ProductComment || !ProductComment.create) throw new Error('ProductComment model not available');

    const products = await Product.findAll({ limit: 3 });
    const user = await User.findOne({ where: { username: 'customer1' } });

    if (products.length === 0 || !user) throw new Error('Products or user not found');

    const count = await ProductComment.count();
    if (count > 0) {
      console.log(`✅ ProductComment data already exists (${count} records)`);
      return true;
    }

    for (const product of products) {
      await ProductComment.create({
        productId: product.id,
        userId: user.id,
        rating: Math.floor(Math.random() * 3) + 3,
        comment: 'Great product, highly recommended!',
        isVerified: true
      });

      console.log(`✅ Created comment for product: ${product.title}`);
    }

    console.log(`✨ ProductComment seeding completed\n`);
    return true;
  } catch (error) {
    console.error('❌ ProductComment seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedProductComments };
