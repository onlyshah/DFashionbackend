// Coupon Seeder Script - PostgreSQL
// Seeds sample coupons and discount codes
// Usage: node scripts/coupon.seeder.js

require('dotenv').config();
const { getSequelize } = require('../../../config/sequelize');
const modelsModule = require('../../../models_sql');

let sequelize;
let Coupon;

const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();
if (!DB_TYPE.includes('postgres')) {
  console.log('⏭️  Skipping coupon.seeder - Postgres disabled (DB_TYPE=' + DB_TYPE + ')');
  process.exit(0);
}

const COUPONS_DATA = [
  { code: 'WELCOME10', description: 'Welcome discount', discount_type: 'percentage', discount_value: 10, max_uses: 100, used_count: 0, valid_from: new Date(), valid_until: new Date(Date.now() + 30*24*60*60*1000), is_active: true },
  { code: 'SUMMER20', description: 'Summer sale', discount_type: 'percentage', discount_value: 20, max_uses: 50, used_count: 0, valid_from: new Date(), valid_until: new Date(Date.now() + 60*24*60*60*1000), is_active: true },
  { code: 'FLAT500', description: 'Flat 500 discount', discount_type: 'fixed', discount_value: 500, max_uses: 200, used_count: 0, valid_from: new Date(), valid_until: new Date(Date.now() + 45*24*60*60*1000), is_active: true },
  { code: 'FREESHIP', description: 'Free shipping', discount_type: 'percentage', discount_value: 100, min_purchase: 2000, max_uses: 150, used_count: 0, valid_from: new Date(), valid_until: new Date(Date.now() + 90*24*60*60*1000), is_active: true },
  { code: 'VIP30', description: 'VIP members discount', discount_type: 'percentage', discount_value: 30, min_purchase: 5000, max_uses: 500, used_count: 0, valid_from: new Date(), valid_until: new Date(Date.now() + 180*24*60*60*1000), is_active: true }
];

async function seedCoupons() {
  try {
    console.log('🚀 Starting PostgreSQL Coupon Seeder...\n');
    sequelize = await getSequelize();
    if (!sequelize) throw new Error('Failed to initialize sequelize');
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // Reinitialize models now that sequelize is connected
    if (modelsModule.reinitializeModels) {
      await modelsModule.reinitializeModels();
    }
    Coupon = modelsModule._raw.Coupon;
    if (!Coupon) throw new Error('Coupon model not initialized');
    
    const existing = await Coupon.count();
    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing coupons. Clearing...\n`);
      await Coupon.destroy({ where: {} });
    }

    console.log('📝 Seeding coupons...');
    let seededCount = 0;
    for (const couponData of COUPONS_DATA) {
      const coupon = await Coupon.create(couponData);
      console.log(`  ✓ Created coupon: ${coupon.code}`);
      seededCount++;
    }

    console.log(`\n✅ Successfully seeded ${seededCount} coupons\n`);
    console.log('═'.repeat(50));
    console.log('COUPON SEEDING COMPLETE');
    console.log('═'.repeat(50));
    console.log('\nSeeded Coupons:');
    COUPONS_DATA.forEach(c => console.log(`  • ${c.code} - ${c.description}`));
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Coupon Seeding failed:', error.message);
    process.exit(1);
  }
}

seedCoupons();
