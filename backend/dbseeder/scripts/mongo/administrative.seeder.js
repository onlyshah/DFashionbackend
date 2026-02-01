// Administrative & Audit Seeder Script
// Orchestrates: AuditLog, Department, Ticket, Transaction
// Usage: node scripts/administrative.seeder.js
// ============================================================================

require('dotenv').config();
const mongoose = require('mongoose');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping administrative.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

// Import seeders
const seedAuditLog = require('../seeders/AuditLog');
const seedDepartment = require('../seeders/Department');
const seedTicket = require('../seeders/Ticket');
const seedTransaction = require('../seeders/Transaction');

async function seedAdministrative() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('\n' + '═'.repeat(70));
    console.log('📋 ADMINISTRATIVE & AUDIT SEEDING');
    console.log('═'.repeat(70) + '\n');

    // Phase 1: Department (no dependencies)
    console.log('⏳ Phase 1/4: Seeding Departments...');
    await seedDepartment();
    console.log('✅ Departments seeded\n');

    // Phase 2: AuditLog (independent)
    console.log('⏳ Phase 2/4: Seeding Audit Logs...');
    await seedAuditLog();
    console.log('✅ Audit Logs seeded\n');

    // Phase 3: Ticket (depends on Department, User)
    console.log('⏳ Phase 3/4: Seeding Support Tickets...');
    await seedTicket();
    console.log('✅ Support Tickets seeded\n');

    // Phase 4: Transaction (depends on Order, User)
    console.log('⏳ Phase 4/4: Seeding Transactions...');
    await seedTransaction();
    console.log('✅ Transactions seeded\n');

    console.log('═'.repeat(70));
    console.log('✅ Administrative seeding completed successfully!');
    console.log('═'.repeat(70) + '\n');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Administrative seeding failed!');
    console.error('Error:', err.message);
    if (err.stack) console.error(err.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedAdministrative();
