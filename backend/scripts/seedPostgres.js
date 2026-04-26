#!/usr/bin/env node
/**
 * 🌱 PostgreSQL Seeder Runner
 * Runs the master seeder for PostgreSQL database
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Resolve seeder path
const seederPath = path.join(__dirname, '../dbseeder/scripts/postgres/master.seeder.js');

if (!fs.existsSync(seederPath)) {
  console.error(`❌ Seeder not found at: ${seederPath}`);
  process.exit(1);
}

console.log(`\n🌱 Running PostgreSQL Master Seeder...\n`);

// Import and run
try {
  require(seederPath);
} catch (error) {
  console.error(`❌ Seeder execution failed: ${error.message}`);
  process.exit(1);
}
