/**
 * PostgreSQL Permission Seeder
 * Seeds the database with 22 permissions across 8 modules
 * Usage: node scripts/permission.seeder.postgres.js
 */

require('dotenv').config();
const { sequelize } = require('../config/sequelize');
const { _raw: models } = require('../models_sql');
const Permission = models.Permission;

const PERMISSIONS = [
  // Dashboard (1)
  {
    name: 'dashboard:view',
    displayName: 'View Dashboard',
    description: 'View dashboard and analytics',
    module: 'dashboard',
    actions: JSON.stringify(['view'])
  },

  // Users (4)
  {
    name: 'users:view',
    displayName: 'View Users',
    description: 'View all users in the system',
    module: 'users',
    actions: JSON.stringify(['view'])
  },
  {
    name: 'users:create',
    displayName: 'Create Users',
    description: 'Create new users in the system',
    module: 'users',
    actions: JSON.stringify(['create'])
  },
  {
    name: 'users:update',
    displayName: 'Update Users',
    description: 'Update user information and profiles',
    module: 'users',
    actions: JSON.stringify(['update'])
  },
  {
    name: 'users:delete',
    displayName: 'Delete Users',
    description: 'Delete users from the system',
    module: 'users',
    actions: JSON.stringify(['delete'])
  },

  // Products (4)
  {
    name: 'products:view',
    displayName: 'View Products',
    description: 'View all products in the catalog',
    module: 'products',
    actions: JSON.stringify(['view'])
  },
  {
    name: 'products:create',
    displayName: 'Create Products',
    description: 'Create new products in the catalog',
    module: 'products',
    actions: JSON.stringify(['create'])
  },
  {
    name: 'products:update',
    displayName: 'Update Products',
    description: 'Update product information and details',
    module: 'products',
    actions: JSON.stringify(['update'])
  },
  {
    name: 'products:delete',
    displayName: 'Delete Products',
    description: 'Delete products from the catalog',
    module: 'products',
    actions: JSON.stringify(['delete'])
  },

  // Orders (3)
  {
    name: 'orders:view',
    displayName: 'View Orders',
    description: 'View all customer orders',
    module: 'orders',
    actions: JSON.stringify(['view'])
  },
  {
    name: 'orders:update',
    displayName: 'Update Orders',
    description: 'Update order status and information',
    module: 'orders',
    actions: JSON.stringify(['update'])
  },
  {
    name: 'orders:delete',
    displayName: 'Delete Orders',
    description: 'Delete orders from the system',
    module: 'orders',
    actions: JSON.stringify(['delete'])
  },

  // Analytics (2)
  {
    name: 'analytics:view',
    displayName: 'View Analytics',
    description: 'View analytics and reports',
    module: 'analytics',
    actions: JSON.stringify(['view'])
  },
  {
    name: 'analytics:export',
    displayName: 'Export Analytics',
    description: 'Export analytics data to external formats',
    module: 'analytics',
    actions: JSON.stringify(['export'])
  },

  // Roles (5)
  {
    name: 'roles:view',
    displayName: 'View Roles',
    description: 'View all system roles',
    module: 'roles',
    actions: JSON.stringify(['view'])
  },
  {
    name: 'roles:create',
    displayName: 'Create Roles',
    description: 'Create new roles with specific permissions',
    module: 'roles',
    actions: JSON.stringify(['create'])
  },
  {
    name: 'roles:update',
    displayName: 'Update Roles',
    description: 'Update role information and permissions',
    module: 'roles',
    actions: JSON.stringify(['update'])
  },
  {
    name: 'roles:delete',
    displayName: 'Delete Roles',
    description: 'Delete roles from the system',
    module: 'roles',
    actions: JSON.stringify(['delete'])
  },
  {
    name: 'roles:manage',
    displayName: 'Manage Roles',
    description: 'Full role management including creation, update, and deletion',
    module: 'roles',
    actions: JSON.stringify(['create', 'read', 'update', 'delete'])
  },

  // Settings (2)
  {
    name: 'settings:view',
    displayName: 'View Settings',
    description: 'View application settings and configuration',
    module: 'settings',
    actions: JSON.stringify(['view'])
  },
  {
    name: 'settings:update',
    displayName: 'Update Settings',
    description: 'Update application settings and configuration',
    module: 'settings',
    actions: JSON.stringify(['update'])
  },

  // Logs (1)
  {
    name: 'logs:view',
    displayName: 'View Logs',
    description: 'View activity logs and audit trail',
    module: 'logs',
    actions: JSON.stringify(['view'])
  }
];

async function seedPermissions() {
  try {
    console.log('🚀 Starting PostgreSQL Permission Seeder...\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // Check if permissions already exist
    const existingCount = await Permission.count();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing permissions. Clearing...\n`);
      await Permission.destroy({ where: {} });
    }

    // Seed permissions
    let seededCount = 0;
    console.log('📝 Seeding permissions...');

    // Group by module for better logging
    const byModule = {};
    PERMISSIONS.forEach(p => {
      if (!byModule[p.module]) byModule[p.module] = [];
      byModule[p.module].push(p);
    });

    for (const [module, perms] of Object.entries(byModule)) {
      console.log(`\n  📦 Module: ${module}`);
      for (const perm of perms) {
        await Permission.create(perm);
        console.log(`    ✓ ${perm.displayName} (${perm.name})`);
        seededCount++;
      }
    }

    console.log(`\n✅ Successfully seeded ${seededCount} permissions\n`);
    console.log('═'.repeat(50));
    console.log('PERMISSION SEEDING COMPLETE');
    console.log('═'.repeat(50));
    console.log('\nSeeded Permissions by Module:');
    for (const [module, perms] of Object.entries(byModule)) {
      console.log(`  ${module}: ${perms.length} permissions`);
    }
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding permissions:', error.message);
    if (error.errors) {
      console.error('Details:');
      error.errors.forEach(e => console.error(`  - ${e.message}`));
    }
    process.exit(1);
  }
}

// Run seeder
seedPermissions();
