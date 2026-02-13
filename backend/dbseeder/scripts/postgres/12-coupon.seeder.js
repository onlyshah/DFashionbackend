/**
 * 🎟️ Coupon Seeder (Phase 1 - Root Model)
 * Seeds the coupons table
 * No dependencies
 */

const models = require('../../../models_sql');

const couponData = [
  {
    code: 'WELCOME10',
    description: 'Welcome discount 10% off',
    discountType: 'percentage',
    discountValue: 10,
    maxUses: 1000,
    usesCount: 0,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true
  },
  {
    code: 'SAVE20',
    description: '₹20 off on orders above ₹500',
    discountType: 'fixed',
    discountValue: 20,
    maxUses: 500,
    usesCount: 0,
    expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    isActive: true
  },
  {
    code: 'SHIPPING50',
    description: '50% off on shipping',
    discountType: 'percentage',
    discountValue: 50,
    maxUses: 2000,
    usesCount: 0,
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    isActive: true
  }
];

async function seedCoupons() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Coupon seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Coupon = models._raw?.Coupon || models.Coupon;
    if (!Coupon || !Coupon.create) {
      throw new Error('Coupon model not available');
    }

    let createdCount = 0;
    for (const coupon of couponData) {
      const existing = await Coupon.findOne({
        where: { code: coupon.code }
      });

      if (existing) {
        console.log(`✅ Coupon '${coupon.code}' already exists (skipping)`);
        continue;
      }

      await Coupon.create(coupon);
      console.log(`✅ Created coupon: ${coupon.code}`);
      createdCount++;
    }

    console.log(`✨ Coupon seeding completed (${createdCount} new coupons)\n`);
    return true;
  } catch (error) {
    console.error('❌ Coupon seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedCoupons };
