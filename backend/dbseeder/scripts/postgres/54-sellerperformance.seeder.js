/**
 * SELLER PERFORMANCE SEEDER
 * Seeds seller metrics and performance data
 */

const models = require('../../../models_sql');
const { v4: uuidv4 } = require('uuid');

async function seedSellerPerformances() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting SellerPerformance seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const SellerPerformance = models._raw?.SellerPerformance || models.SellerPerformance;
    const User = models._raw?.User || models.User;

    if (!SellerPerformance || !SellerPerformance.create) throw new Error('SellerPerformance model not available');

    const sellers = await User.findAll({ limit: 5 });

    if (sellers.length === 0) {
      console.log('⚠️  Skipping SellerPerformance seeding - no users found');
      return true;
    }

    const count = await SellerPerformance.count();
    if (count > 0) {
      console.log(`✅ SellerPerformance data already exists (${count} records)`);
      return true;
    }

    const performances = sellers.map((seller, idx) => ({
      id: uuidv4(),
      sellerId: seller.id,
      month: new Date(Date.now() - idx * 30 * 24 * 60 * 60 * 1000),
      totalOrders: Math.floor(Math.random() * 500) + 50,
      totalRevenue: Math.floor(Math.random() * 100000) + 10000,
      avgRating: (Math.random() * 2 + 3).toFixed(1),
      totalReviews: Math.floor(Math.random() * 200),
      returnRate: (Math.random() * 10).toFixed(2),
      conversionRate: (Math.random() * 5 + 2).toFixed(2),
      customerSatisfaction: (Math.random() * 30 + 70).toFixed(1)
    }));

    let createdCount = 0;
    for (const perf of performances) {
      try {
        await SellerPerformance.create(perf);
        createdCount++;
      } catch (err) {
        console.log(`⚠️  Performance creation skipped: ${err.message}`);
      }
    }

    console.log(`✨ SellerPerformance seeding completed (${createdCount} new performances)\n`);
    return true;
  } catch (error) {
    console.error('❌ SellerPerformance seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedSellerPerformances };
