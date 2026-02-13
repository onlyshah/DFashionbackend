/**
 * ❤️ Wishlist Seeder (Phase 4 - Tier 3)
 * Depends on: User, Product
 * Creates wish lists for customers
 */

const models = require('../../../models_sql');

async function seedWishlists() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Wishlist seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Wishlist = models._raw?.Wishlist || models.Wishlist;
    const User = models._raw?.User || models.User;
    const Product = models._raw?.Product || models.Product;

    if (!Wishlist || !Wishlist.create) throw new Error('Wishlist model not available');
    if (!User || !User.findOne) throw new Error('User model not available');
    if (!Product || !Product.findAll) throw new Error('Product model not available');

    const customers = await User.findAll({
      where: { username: ['customer1', 'customer2'] }
    });

    if (customers.length === 0) throw new Error('No customer users found');

    const products = await Product.findAll({ limit: 8 });
    if (products.length === 0) throw new Error('No products found');

    let createdCount = 0;

    for (const customer of customers) {
      const itemCount = Math.floor(Math.random() * 3) + 2;
      const selectedProducts = products.slice(0, itemCount);

      for (const product of selectedProducts) {
        const existing = await Wishlist.findOne({
          where: { userId: customer.id, productId: product.id }
        });

        if (existing) {
          console.log(`✅ Wishlist item for ${customer.username} already exists (skipping)`);
          continue;
        }

        await Wishlist.create({
          userId: customer.id,
          productId: product.id,
          addedAt: new Date()
        });

        console.log(`✅ Added to wishlist: ${customer.username} -> ${product.title}`);
        createdCount++;
      }
    }

    console.log(`✨ Wishlist seeding completed (${createdCount} new wishlist items)\n`);
    return true;
  } catch (error) {
    console.error('❌ Wishlist seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedWishlists };
