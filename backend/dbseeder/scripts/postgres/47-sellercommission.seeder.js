/**
 * 💰 SellerCommission Seeder (Phase 5 - Tier 4)
 * Depends on: User (seller), Order
 */

const models = require('../../../models_sql');

async function seedSellerCommissions() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting SellerCommission seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const SellerCommission = models._raw?.SellerCommission || models.SellerCommission;
    const User = models._raw?.User || models.User;
    const Order = models._raw?.Order || models.Order;

    if (!SellerCommission || !SellerCommission.create) throw new Error('SellerCommission model not available');

    const seller = await User.findOne({ where: { username: 'seller1' } });
    const orders = await Order.findAll({ limit: 3 });

    if (!seller || orders.length === 0) throw new Error('Seller or Orders not found');

    let createdCount = 0;

    for (const order of orders) {
      const existing = await SellerCommission.findOne({
        where: { sellerId: seller.id, orderId: order.id }
      });

      if (existing) {
        console.log(`✅ Commission for seller already exists (skipping)`);
        continue;
      }

      const commissionRate = 0.10; // 10%
      const commissionAmount = order.totalAmount * commissionRate;

      await SellerCommission.create({
        sellerId: seller.id,
        orderId: order.id,
        commissionPercent: commissionRate * 100,
        commissionAmount: commissionAmount,
        status: 'pending'
      });

      console.log(`✅ Created commission for order: ${order.orderNumber}`);
      createdCount++;
    }

    console.log(`✨ SellerCommission seeding completed (${createdCount} new commissions)\n`);
    return true;
  } catch (error) {
    console.error('❌ SellerCommission seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedSellerCommissions };
