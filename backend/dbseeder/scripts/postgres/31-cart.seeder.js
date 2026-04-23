/**
 * Cart Seeder (Phase 4 - Tier 3)
 * Depends on: User, Product
 * Creates sample shopping carts using the normalized carts + cart_items schema
 */

const { randomUUID } = require('crypto');
const models = require('../../../models_sql');

async function seedCarts() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('Starting Cart seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Cart = models._raw?.Cart || models.Cart;
    const CartItem = models._raw?.CartItem || models.CartItem;
    const User = models._raw?.User || models.User;
    const Product = models._raw?.Product || models.Product;

    if (!Cart || !Cart.create) throw new Error('Cart model not available');
    if (!CartItem || !CartItem.create) throw new Error('CartItem model not available');
    if (!User || !User.findAll) throw new Error('User model not available');
    if (!Product || !Product.findAll) throw new Error('Product model not available');

    const customers = await User.findAll({
      where: { username: ['customer1', 'customer2'] }
    });

    if (customers.length === 0) {
      throw new Error('No customer users found');
    }

    const products = await Product.findAll({ limit: 5 });
    if (products.length === 0) {
      throw new Error('No products found');
    }

    let createdCount = 0;

    for (const customer of customers) {
      let cart = await Cart.findOne({
        where: { userId: customer.id }
      });

      if (!cart) {
        cart = await Cart.create({
          id: randomUUID(),
          userId: customer.id
        });
      }

      const selectedProducts = products.slice(0, Math.min(4, products.length));

      for (let index = 0; index < selectedProducts.length; index++) {
        const product = selectedProducts[index];
        const quantity = (index % 3) + 1;

        const existing = await CartItem.findOne({
          where: { cartId: cart.id, productId: product.id }
        });

        if (existing) {
          console.log(`Cart item for ${customer.username} -> ${product.title || product.name} already exists (skipping)`);
          continue;
        }

        await CartItem.create({
          id: randomUUID(),
          cartId: cart.id,
          productId: product.id,
          quantity,
          price: product.price || 0
        });

        console.log(`Added to cart: ${customer.username} -> ${product.title || product.name} (Qty: ${quantity})`);
        createdCount++;
      }
    }

    console.log(`Cart seeding completed (${createdCount} new cart items)\n`);
    return true;
  } catch (error) {
    console.error('Cart seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedCarts };
