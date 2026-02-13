/**
 * ↩️ Return Seeder (Phase 5 - Tier 4)
 * Depends on: Order, User
 */

const models = require('../../../models_sql');

async function seedReturns() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Return seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Return = models._raw?.Return || models.Return;
    const Order = models._raw?.Order || models.Order;

    if (!Return || !Return.create) throw new Error('Return model not available');
    if (!Order || !Order.findAll) throw new Error('Order model not available');

    const orders = await Order.findAll({ where: { status: 'delivered' }, limit: 2 });

    if (orders.length === 0) {
      console.log(`⚠️ No delivered orders found. Skipping return seeding.`);
      return true;
    }

    let createdCount = 0;

    for (const order of orders) {
      const existing = await Return.findOne({ where: { orderId: order.id } });

      if (existing) {
        console.log(`✅ Return for order ${order.orderNumber} already exists (skipping)`);
        continue;
      }

      await Return.create({
        orderId: order.id,
        userId: order.customerId,
        reason: 'Product not as expected',
        status: 'pending',
        refundAmount: order.totalAmount * 0.9,
        requestedDate: new Date()
      });

      console.log(`✅ Created return for order: ${order.orderNumber}`);
      createdCount++;
    }

    console.log(`✨ Return seeding completed (${createdCount} new returns)\n`);
    return true;
  } catch (error) {
    console.error('❌ Return seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedReturns };
