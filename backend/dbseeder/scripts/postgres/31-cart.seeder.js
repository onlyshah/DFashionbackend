/**
 * 🛒 Cart Seeder (Phase 4 - Tier 3)
 * Depends on: User, Product
 * Creates sample shopping carts
 */

const models = require('../../../models_sql');

async function seedCarts() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Cart seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Cart = models._raw?.Cart || models.Cart;
    const User = models._raw?.User || models.User;
    const Product = models._raw?.Product || models.Product;

    if (!Cart || !Cart.create) throw new Error('Cart model not available');
    if (!User || !User.findOne) throw new Error('User model not available');
    if (!Product || !Product.findAll) throw new Error('Product model not available');

    // Get customer users
    const customers = await User.findAll({
      where: { username: ['customer1', 'customer2'] }
    });

    if (customers.length === 0) {
      throw new Error('No customer users found');
    }

    // Get some products
    const products = await Product.findAll({ limit: 5 });

    if (products.length === 0) {
      throw new Error('No products found');
    }

    let createdCount = 0;

    for (const customer of customers) {
      // Create 1-2 cart items per customer
      const itemCount = Math.floor(Math.random() * 2) + 1;
      const selectedProducts = products.slice(0, itemCount);

      for (const product of selectedProducts) {
        const existing = await Cart.findOne({
          where: { userId: customer.id, productId: product.id }
        });

        if (existing) {
          console.log(`✅ Cart item for ${customer.username} -> ${product.title} already exists (skipping)`);
          continue;
        }

        const quantity = Math.floor(Math.random() * 3) + 1;

        await Cart.create({
          userId: customer.id,
          productId: product.id,
          quantity: quantity,
          addedAt: new Date()
        });

        console.log(`✅ Added to cart: ${customer.username} -> ${product.title} (Qty: ${quantity})`);
        createdCount++;
      }
    }

    console.log(`✨ Cart seeding completed (${createdCount} new cart items)\n`);
    return true;
  } catch (error) {
    console.error('❌ Cart seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedCarts };
