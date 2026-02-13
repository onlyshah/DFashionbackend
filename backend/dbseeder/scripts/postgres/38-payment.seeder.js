/**
 * 💰 Payment Seeder (Phase 5 - Tier 4)
 * Depends on: Order
 */

const models = require('../../../models_sql');

async function seedPayments() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Payment seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Payment = models._raw?.Payment || models.Payment;
    const Order = models._raw?.Order || models.Order;

    if (!Payment || !Payment.create) throw new Error('Payment model not available');
    if (!Order || !Order.findAll) throw new Error('Order model not available');

    const orders = await Order.findAll();
    if (orders.length === 0) throw new Error('No orders found');

    let createdCount = 0;

    for (const order of orders) {
      const existing = await Payment.findOne({ where: { orderId: order.id } });

      if (existing) {
        console.log(`✅ Payment for order ${order.orderNumber} already exists (skipping)`);
        continue;
      }

      await Payment.create({
        orderId: order.id,
        amount: order.totalAmount,
        paymentMethod: 'card',
        transactionId: `TXN-${order.id}-${Date.now()}`,
        status: 'completed',
        paymentGateway: 'Stripe',
        metadata: JSON.stringify({ orderId: order.id })
      });

      console.log(`✅ Created payment for order: ${order.orderNumber}`);
      createdCount++;
    }

    console.log(`✨ Payment seeding completed (${createdCount} new payments)\n`);
    return true;
  } catch (error) {
    console.error('❌ Payment seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedPayments };
