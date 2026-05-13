// Permission & Role Configuration Seeder Script
// Orchestrates: Permission, Role (SQL variants for PostgreSQL)
// Usage: node scripts/permission-role-config.seeder.js
// ============================================================================

require('dotenv').config();
const mongoose = require('mongoose');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping permission-role-config.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

// Import seeders
const seedPermission = require('../seeders/Permission');
const seedRole = require('../seeders/Role');

async function seedPermissionRoleConfig() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('\n' + '═'.repeat(70));
    console.log('🔐 PERMISSION & ROLE CONFIGURATION SEEDING');
    console.log('═'.repeat(70) + '\n');

    // Phase 1: Permission (depends on Module)
    // Must run after module.seeder.js
    console.log('⏳ Phase 1/2: Seeding Permissions...');
    await seedPermission();
    console.log('✅ Permissions seeded\n');

    // Phase 2: Role (depends on Module)
    // Must run after module.seeder.js
    console.log('⏳ Phase 2/2: Seeding Roles (SQL variant)...');
    await seedRole();
    console.log('✅ Roles seeded\n');

    console.log('═'.repeat(70));
    console.log('✅ Permission & Role Configuration seeding completed successfully!');
    console.log('═'.repeat(70) + '\n');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Permission & Role Configuration seeding failed!');
    console.error('Error:', err.message);
    if (err.stack) console.error(err.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedPermissionRoleConfig();
