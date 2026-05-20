// Inventory Management Seeder Script
// Orchestrates: Inventory, InventoryAlert, InventoryHistory
// Usage: node scripts/inventory-management.seeder.js
// ============================================================================

require('dotenv').config();
const mongoose = require('mongoose');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping inventory-management.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

// Import seeders
const seedInventory = require('../seeders/Inventory');
const seedInventoryAlert = require('../seeders/InventoryAlert');
const seedInventoryHistory = require('../seeders/InventoryHistory');

async function seedInventoryManagement() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('\n' + '═'.repeat(70));
    console.log('📦 INVENTORY MANAGEMENT SEEDING');
    console.log('═'.repeat(70) + '\n');

    // Phase 1: Inventory (depends on Product, Warehouse)
    // Must run after product.seeder.js and product-infrastructure.seeder.js
    console.log('⏳ Phase 1/3: Seeding Inventory...');
    await seedInventory();
    console.log('✅ Inventory seeded\n');

    // Phase 2: InventoryAlert (depends on Inventory, Product)
    console.log('⏳ Phase 2/3: Seeding Inventory Alerts...');
    await seedInventoryAlert();
    console.log('✅ Inventory Alerts seeded\n');

    // Phase 3: InventoryHistory (depends on Inventory)
    console.log('⏳ Phase 3/3: Seeding Inventory History...');
    await seedInventoryHistory();
    console.log('✅ Inventory History seeded\n');

    console.log('═'.repeat(70));
    console.log('✅ Inventory Management seeding completed successfully!');
    console.log('═'.repeat(70) + '\n');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Inventory Management seeding failed!');
    console.error('Error:', err.message);
    if (err.stack) console.error(err.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedInventoryManagement();

