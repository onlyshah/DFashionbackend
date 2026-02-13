/**
 * 📦 Order Seeder (Phase 4 - Tier 3)
 * Depends on: User
 * Creates sample orders
 */

const models = require('../../../models_sql');

async function seedOrders() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Order seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Order = models._raw?.Order || models.Order;
    const User = models._raw?.User || models.User;
    const Product = models._raw?.Product || models.Product;

    if (!Order || !Order.create) throw new Error('Order model not available');
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
    const products = await Product.findAll({ limit: 10 });

    if (products.length === 0) {
      throw new Error('No products found');
    }

    let createdCount = 0;
    let orderNum = 1;

    for (const customer of customers) {
      // Create 2-3 orders per customer
      const orderCount = Math.floor(Math.random() * 2) + 2;

      for (let i = 0; i < orderCount; i++) {
        const orderNumber = `ORD-${Date.now()}-${orderNum}`;
        const existing = await Order.findOne({
          where: { orderNumber: orderNumber }
        });

        if (existing) {
          console.log(`✅ Order ${orderNumber} already exists (skipping)`);
          orderNum++;
          continue;
        }

        // Select random products for order
        const itemCount = Math.floor(Math.random() * 2) + 1;
        const orderItems = [];
        let totalAmount = 0;

        for (let j = 0; j < itemCount; j++) {
          const product = products[Math.floor(Math.random() * products.length)];
          const quantity = Math.floor(Math.random() * 3) + 1;
          const itemPrice = (product.discountPrice || product.price) * quantity;
          totalAmount += itemPrice;

          orderItems.push({
            productId: product.id,
            productTitle: product.title,
            quantity: quantity,
            price: product.discountPrice || product.price
          });
        }

        const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
        const paymentStatuses = ['pending', 'paid', 'failed'];

        await Order.create({
          orderNumber: orderNumber,
          customerId: customer.id,
          userId: customer.id,
          items: JSON.stringify(orderItems),
          totalAmount: totalAmount,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          paymentStatus: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)],
          paymentMethod: 'card',
          shippingAddress: JSON.stringify({
            name: customer.firstName + ' ' + customer.lastName,
            phone: customer.phone,
            address: '123 Main Street',
            city: 'Delhi',
            state: 'Delhi',
            zipCode: '110001'
          }),
          notes: null
        });

        console.log(`✅ Created order: ${orderNumber} for ${customer.email} (Amount: ₹${totalAmount})`);
        createdCount++;
        orderNum++;
      }
    }

    console.log(`✨ Order seeding completed (${createdCount} new orders)\n`);
    return true;
  } catch (error) {
    console.error('❌ Order seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedOrders };
