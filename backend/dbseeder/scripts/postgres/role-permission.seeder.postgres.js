/**
 * PostgreSQL Role-Permission Mapping Seeder
 * Maps permissions to roles based on role levels
 * Usage: node scripts/role-permission.seeder.postgres.js
 */

require('dotenv').config();
const { sequelize } = require('../config/sequelize');
const { _raw: models } = require('../models_sql');
const Role = models.Role;
const Permission = models.Permission;
const RolePermission = models.RolePermission;

// Define which permissions each role has
const ROLE_PERMISSION_MAP = {
  // Super Admin - All permissions
  super_admin: [
    'dashboard:view',
    'users:view', 'users:create', 'users:update', 'users:delete',
    'products:view', 'products:create', 'products:update', 'products:delete',
    'orders:view', 'orders:update', 'orders:delete',
    'analytics:view', 'analytics:export',
    'roles:view', 'roles:create', 'roles:update', 'roles:delete', 'roles:manage',
    'settings:view', 'settings:update',
    'logs:view'
  ],

  // Admin - All except settings management
  admin: [
    'dashboard:view',
    'users:view', 'users:create', 'users:update', 'users:delete',
    'products:view', 'products:create', 'products:update', 'products:delete',
    'orders:view', 'orders:update', 'orders:delete',
    'analytics:view', 'analytics:export',
    'roles:view', 'roles:create', 'roles:update', 'roles:delete', 'roles:manage',
    'settings:view', // Can view but not update settings
    'logs:view'
  ],

  // Manager - Limited access
  manager: [
    'dashboard:view',
    'users:view', 'users:update', // Can view and update, but not create/delete
    'products:view', 'products:update', // Can view and update, but not create/delete
    'orders:view', 'orders:update',
    'analytics:view',
    'logs:view'
  ],

  // Customer - Dashboard only
  customer: [
    'dashboard:view'
  ]
};

async function seedRolePermissions() {
  try {
    console.log('🚀 Starting PostgreSQL Role-Permission Mapping Seeder...\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // Clear existing mappings
    const existingCount = await RolePermission.count();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing role-permission mappings. Clearing...\n`);
      await RolePermission.destroy({ where: {} });
    }

    // Fetch all roles and permissions
    const roles = await Role.findAll();
    const permissions = await Permission.findAll();

    if (roles.length === 0) {
      throw new Error('No roles found. Please run role.seeder.postgres.js first.');
    }

    if (permissions.length === 0) {
      throw new Error('No permissions found. Please run permission.seeder.postgres.js first.');
    }

    console.log(`📊 Found ${roles.length} roles and ${permissions.length} permissions\n`);

    // Map permissions to roles
    let mappingCount = 0;
    console.log('🔗 Mapping permissions to roles...\n');

    for (const role of roles) {
      const permissionNames = ROLE_PERMISSION_MAP[role.name];
      if (!permissionNames) {
        console.warn(`⚠️  No permission map found for role: ${role.name}`);
        continue;
      }

      console.log(`  ${role.displayName} (${role.name}):`);
      for (const permName of permissionNames) {
        const perm = permissions.find(p => p.name === permName);
        if (!perm) {
          console.warn(`    ⚠️  Permission not found: ${permName}`);
          continue;
        }

        await RolePermission.create({
          roleId: role.id,
          permissionId: perm.id
        });
        mappingCount++;
      }
      console.log(`    ✓ Assigned ${permissionNames.length} permissions\n`);
    }

    console.log(`✅ Successfully created ${mappingCount} role-permission mappings\n`);
    console.log('═'.repeat(50));
    console.log('ROLE-PERMISSION MAPPING COMPLETE');
    console.log('═'.repeat(50));
    console.log('\nRole Permission Summary:');
    for (const role of roles) {
      const count = ROLE_PERMISSION_MAP[role.name].length;
      console.log(`  • ${role.displayName}: ${count} permissions`);
    }
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error mapping role permissions:', error.message);
    if (error.errors) {
      console.error('Details:');
      error.errors.forEach(e => console.error(`  - ${e.message}`));
    }
    process.exit(1);
  }
}

// Run seeder
seedRolePermissions();
