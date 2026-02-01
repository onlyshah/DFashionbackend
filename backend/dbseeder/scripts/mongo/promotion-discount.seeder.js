// Promotion & Discount Seeder Script
// Orchestrates: Campaign, Coupon, FlashSale, Promotion
// Usage: node scripts/promotion-discount.seeder.js
// ============================================================================

require('dotenv').config();
const mongoose = require('mongoose');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping promotion-discount.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

// Import seeders
const seedCoupon = require('../seeders/Coupon');
const seedCampaign = require('../seeders/Campaign');
const seedFlashSale = require('../seeders/FlashSale');
const seedPromotion = require('../seeders/Promotion');

async function seedPromotionDiscount() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('\n' + '═'.repeat(70));
    console.log('🎁 PROMOTION & DISCOUNT SEEDING');
    console.log('═'.repeat(70) + '\n');

    // Phase 1: Campaign (no dependencies)
    console.log('⏳ Phase 1/4: Seeding Campaigns...');
    await seedCampaign();
    console.log('✅ Campaigns seeded\n');

    // Phase 2: Coupon (no dependencies)
    console.log('⏳ Phase 2/4: Seeding Coupons...');
    await seedCoupon();
    console.log('✅ Coupons seeded\n');

    // Phase 3: FlashSale (no dependencies)
    console.log('⏳ Phase 3/4: Seeding Flash Sales...');
    await seedFlashSale();
    console.log('✅ Flash Sales seeded\n');

    // Phase 4: Promotion (no dependencies)
    console.log('⏳ Phase 4/4: Seeding Promotions...');
    await seedPromotion();
    console.log('✅ Promotions seeded\n');

    console.log('═'.repeat(70));
    console.log('✅ Promotion & Discount seeding completed successfully!');
    console.log('═'.repeat(70) + '\n');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Promotion & Discount seeding failed!');
    console.error('Error:', err.message);
    if (err.stack) console.error(err.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedPromotionDiscount();
