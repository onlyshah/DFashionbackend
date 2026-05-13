// Product Infrastructure Seeder Script
// Orchestrates: Brand, SubCategory, Supplier, Warehouse
// Usage: node scripts/product-infrastructure.seeder.js
// ============================================================================

require('dotenv').config();
const mongoose = require('mongoose');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping product-infrastructure.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

// Import seeders
const seedBrand = require('../seeders/Brand');
const seedSubCategory = require('../seeders/SubCategory');
const seedSupplier = require('../seeders/Supplier');
const seedWarehouse = require('../seeders/Warehouse');

async function seedProductInfrastructure() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('\n' + '═'.repeat(70));
    console.log('🏭 PRODUCT INFRASTRUCTURE SEEDING');
    console.log('═'.repeat(70) + '\n');

    // Phase 1: Brand (no dependencies)
    console.log('⏳ Phase 1/4: Seeding Brands...');
    await seedBrand();
    console.log('✅ Brands seeded\n');

    // Phase 2: SubCategory (depends on Category - must run after category.seeder.js)
    console.log('⏳ Phase 2/4: Seeding Sub-Categories...');
    await seedSubCategory();
    console.log('✅ Sub-Categories seeded\n');

    // Phase 3: Warehouse (no dependencies)
    console.log('⏳ Phase 3/4: Seeding Warehouses...');
    await seedWarehouse();
    console.log('✅ Warehouses seeded\n');

    // Phase 4: Supplier (no dependencies)
    console.log('⏳ Phase 4/4: Seeding Suppliers...');
    await seedSupplier();
    console.log('✅ Suppliers seeded\n');

    console.log('═'.repeat(70));
    console.log('✅ Product Infrastructure seeding completed successfully!');
    console.log('═'.repeat(70) + '\n');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Product Infrastructure seeding failed!');
    console.error('Error:', err.message);
    if (err.stack) console.error(err.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedProductInfrastructure();
