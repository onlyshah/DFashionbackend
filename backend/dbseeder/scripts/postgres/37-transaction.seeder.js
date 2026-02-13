/**
 * 💳 Transaction Seeder (Phase 4 - Tier 3)
 * Depends on: User
 */

const models = require('../../../models_sql');

async function seedTransactions() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Transaction seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Transaction = models._raw?.Transaction || models.Transaction;
    const User = models._raw?.User || models.User;
    const Order = models._raw?.Order || models.Order;

    if (!Transaction || !Transaction.create) throw new Error('Transaction model not available');
    if (!User || !User.findAll) throw new Error('User model not available');

    const users = await User.findAll({ limit: 2 });
    const orders = await Order.findAll({ limit: 3 });

    if (users.length === 0 || orders.length === 0) throw new Error('Users or Orders not found');

    let createdCount = 0;
    const count = await Transaction.count();
    
    if (count > 0) {
      console.log(`✅ Transaction data already exists (${count} records)`);
      return true;
    }

    for (const order of orders) {
      await Transaction.create({
        userId: order.customerId,
        type: 'debit',
        amount: order.totalAmount,
        status: 'completed',
        reference: `ORDER-${order.id}`,
        description: `Payment for order ${order.orderNumber}`
      });

      console.log(`✅ Created transaction for order: ${order.orderNumber}`);
      createdCount++;
    }

    console.log(`✨ Transaction seeding completed (${createdCount} new transactions)\n`);
    return true;
  } catch (error) {
    console.error('❌ Transaction seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedTransactions };
