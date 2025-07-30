#!/usr/bin/env node

/**
 * DFashion Database Seeder Execution Script
 * 
 * This script executes the master seeder to populate the database
 * with production-ready data for the DFashion e-commerce platform.
 * 
 * Usage:
 *   node scripts/runSeed.js
 *   npm run seed
 */

const { masterSeed } = require('./masterSeed');

console.log('🚀 Starting DFashion Database Seeding Process...\n');

masterSeed()
  .then(() => {
    console.log('\n✅ Database seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Database seeding failed:', error);
    process.exit(1);
  });
