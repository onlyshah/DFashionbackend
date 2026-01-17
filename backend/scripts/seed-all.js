#!/usr/bin/env node

/**
 * Master Seeder Runner - Coordinates all database seeders
 * Usage: node scripts/seed-all.js [--full] [--roles] [--permissions] [--users] [--products]
 * 
 * Examples:
 *   node seed-all.js              # Runs roles, permissions, and role-permission seeders
 *   node seed-all.js --full       # Runs full PostgreMaster seeder
 *   node seed-all.js --roles      # Runs only roles seeder
 *   node seed-all.js --permissions # Runs only permissions seeder
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPTS_DIR = __dirname;
const args = process.argv.slice(2);

// Define seeder scripts
const seeders = {
  roles: {
    file: 'role.seeder.postgres.js',
    name: '🔐 Roles',
    description: 'Seeds 4 standard roles (super_admin, admin, manager, customer)'
  },
  permissions: {
    file: 'permission.seeder.postgres.js',
    name: '🔑 Permissions',
    description: 'Seeds 22 permissions across 8 modules'
  },
  rolePermissions: {
    file: 'role-permission.seeder.postgres.js',
    name: '🔗 Role-Permission Mapping',
    description: 'Maps permissions to roles'
  },
  full: {
    file: 'PostgreMaster.js',
    name: '📊 Full Database',
    description: 'Complete seeding of all tables (44 tables)'
  },
  users: {
    file: 'PostgreMaster.js',
    name: '👥 Users & Auth',
    description: 'Seeds users and authentication data'
  },
  products: {
    file: 'PostgreMaster.js',
    name: '📦 Products & Catalog',
    description: 'Seeds products, categories, and brands'
  }
};

// Determine which seeders to run
let toRun = [];

if (args.includes('--full')) {
  toRun = ['full'];
} else if (args.includes('--users')) {
  toRun = ['users'];
} else if (args.includes('--products')) {
  toRun = ['products'];
} else if (args.includes('--roles')) {
  toRun = ['roles'];
} else if (args.includes('--permissions')) {
  toRun = ['permissions'];
} else {
  // Default: run RBAC seeders only
  toRun = ['roles', 'permissions', 'rolePermissions'];
}

function runSeeder(key) {
  return new Promise((resolve, reject) => {
    const seeder = seeders[key];
    const scriptPath = path.join(SCRIPTS_DIR, seeder.file);

    if (!fs.existsSync(scriptPath)) {
      reject(new Error(`Script not found: ${scriptPath}`));
      return;
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`▶️  Running: ${seeder.name}`);
    console.log(`   📄 File: ${seeder.file}`);
    console.log(`   📝 ${seeder.description}`);
    console.log('─'.repeat(60));

    const child = spawn('node', [scriptPath], {
      cwd: SCRIPTS_DIR,
      stdio: 'inherit',
      env: { ...process.env }
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${seeder.name} completed successfully\n`);
        resolve();
      } else {
        reject(new Error(`${seeder.name} failed with exit code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function runAll() {
  try {
    console.log('\n' + '═'.repeat(60));
    console.log('🚀 STARTING MASTER SEEDER');
    console.log('═'.repeat(60));
    console.log(`\n📋 Will run ${toRun.length} seeder(s):\n`);

    toRun.forEach((key, idx) => {
      const seeder = seeders[key];
      console.log(`${idx + 1}. ${seeder.name} - ${seeder.description}`);
    });

    console.log('');

    // Run seeders sequentially
    for (const key of toRun) {
      await runSeeder(key);
    }

    console.log('═'.repeat(60));
    console.log('🎉 ALL SEEDERS COMPLETED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   ✅ Completed ${toRun.length} seeder(s)`);
    console.log(`   📅 Timestamp: ${new Date().toLocaleString()}`);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('\n' + '═'.repeat(60));
    console.error('❌ SEEDING FAILED');
    console.error('═'.repeat(60));
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║         MASTER SEEDER - Database Initialization                ║
╚════════════════════════════════════════════════════════════════╝

Usage: node scripts/seed-all.js [OPTION]

Options:
  (none)            Run RBAC seeders only (roles, permissions, mappings)
  --full            Run complete database seeding (PostgreMaster)
  --roles           Run roles seeder only
  --permissions     Run permissions seeder only
  --users           Run users seeding
  --products        Run products seeding
  --help, -h        Show this help message

Seeders Available:
  • Roles                  - 4 standard roles
  • Permissions            - 22 permissions across 8 modules
  • Role-Permission        - Permission mappings for each role
  • Full Database          - All 44 tables with production data

Examples:
  node seed-all.js              # Default: RBAC seeders
  node seed-all.js --full       # Complete seeding
  node seed-all.js --roles      # Only roles
  node seed-all.js --permissions # Only permissions

Order of Execution:
  1. Roles are created first
  2. Permissions are created second
  3. Role-permission mappings are created third

Notes:
  • Seeders run sequentially to maintain dependency order
  • Each seeder clears existing data before seeding
  • Run with environment variables set: DB_TYPE=postgres
`);
  process.exit(0);
}

// Start seeding
runAll();
