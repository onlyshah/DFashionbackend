// Seller Management Seeder Script
// Orchestrates: SellerCommission, SellerPerformance
// Usage: node scripts/seller-management.seeder.js
// ============================================================================

require('dotenv').config();
const mongoose = require('mongoose');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping seller-management.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

// Import seeders
const seedSellerCommission = require('../seeders/SellerCommission');
const seedSellerPerformance = require('../seeders/SellerPerformance');

async function seedSellerManagement() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('\n' + '═'.repeat(70));
    console.log('👥 SELLER MANAGEMENT SEEDING');
    console.log('═'.repeat(70) + '\n');

    // Phase 1: SellerPerformance (depends on User/Seller)
    // Must run after sellers.seeder.js
    console.log('⏳ Phase 1/2: Seeding Seller Performance...');
    await seedSellerPerformance();
    console.log('✅ Seller Performance seeded\n');

    // Phase 2: SellerCommission (depends on Seller, Order)
    // Must run after sellers.seeder.js and order.seeder.js
    console.log('⏳ Phase 2/2: Seeding Seller Commission...');
    await seedSellerCommission();
    console.log('✅ Seller Commission seeded\n');

    console.log('═'.repeat(70));
    console.log('✅ Seller Management seeding completed successfully!');
    console.log('═'.repeat(70) + '\n');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seller Management seeding failed!');
    console.error('Error:', err.message);
    if (err.stack) console.error(err.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedSellerManagement();
