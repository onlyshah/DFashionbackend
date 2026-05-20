// Logistics & Shipping Seeder Script
// Orchestrates: Courier, Shipment, ShippingCharge
// Usage: node scripts/logistics-shipping.seeder.js
// ============================================================================

require('dotenv').config();
const mongoose = require('mongoose');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping logistics-shipping.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

// Import seeders
const seedCourier = require('../seeders/Courier');
const seedShippingCharge = require('../seeders/ShippingCharge');
const seedShipment = require('../seeders/Shipment');

async function seedLogisticsShipping() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('\n' + '═'.repeat(70));
    console.log('🚚 LOGISTICS & SHIPPING SEEDING');
    console.log('═'.repeat(70) + '\n');

    // Phase 1: Courier (no dependencies)
    console.log('⏳ Phase 1/3: Seeding Couriers...');
    await seedCourier();
    console.log('✅ Couriers seeded\n');

    // Phase 2: ShippingCharge (depends on Courier)
    console.log('⏳ Phase 2/3: Seeding Shipping Charges...');
    await seedShippingCharge();
    console.log('✅ Shipping Charges seeded\n');

    // Phase 3: Shipment (depends on Order, Courier)
    // Must run after order.seeder.js
    console.log('⏳ Phase 3/3: Seeding Shipments...');
    await seedShipment();
    console.log('✅ Shipments seeded\n');

    console.log('═'.repeat(70));
    console.log('✅ Logistics & Shipping seeding completed successfully!');
    console.log('═'.repeat(70) + '\n');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Logistics & Shipping seeding failed!');
    console.error('Error:', err.message);
    if (err.stack) console.error(err.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedLogisticsShipping();

