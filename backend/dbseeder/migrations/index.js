/**
 * ============================================================================
 * DBSEEDERJS - Centralized Database Seeding Module
 * ============================================================================
 * Purpose: Central hub for all database seeding operations
 * This module coordinates all table seeders and database operations
 * 
 * Usage:
 *   node dbseederjs/index.js              - Run full seeding
 *   node dbseederjs/index.js verify       - Verify seeded data
 *   node dbseederjs/index.js check-schema - Check database schema
 *   node dbseederjs/index.js inspect-users - Inspect user records
 * ============================================================================
 */

const path = require('path');
const PostgreMaster = require('./migrations/PostgreMaster.js');

const args = process.argv.slice(2);
const command = args[0] || 'seed';

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('📦 DBSEEDERJS - Centralized Database Seeding');
console.log('═══════════════════════════════════════════════════════════════════\n');

// Route commands to PostgreMaster
switch(command) {
  case 'verify':
    console.log('🔍 Verifying seeded database...\n');
    // Verify command will be handled by PostgreMaster
    require('./migrations/PostgreMaster.js');
    break;
  
  case 'check-schema':
    console.log('🔗 Checking database schema...\n');
    require('./migrations/PostgreMaster.js');
    break;
  
  case 'inspect-users':
    console.log('👤 Inspecting user records...\n');
    require('./migrations/PostgreMaster.js');
    break;
  
  case 'seed':
  default:
    console.log('🌱 Starting full database seeding...\n');
    require('./migrations/PostgreMaster.js');
    break;
}
