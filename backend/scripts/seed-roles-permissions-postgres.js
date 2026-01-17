/**
 * PostgreSQL Roles and Permissions Seeder
 * Seeds the database with predefined roles and permissions
 */

require('dotenv').config();
const { sequelize } = require('../config/sequelize');
const Role = require('../models_sql').Role;
const Permission = require('../models_sql').Permission;
const Module = require('../models_sql').Module;

const permissions = [
  // Dashboard Permissions
  { name: 'dashboard:view', displayName: 'View Dashboard', description: 'View dashboard and analytics', module: 'dashboard', actions: JSON.stringify(['view']) },
  
  // User Management Permissions
  { name: 'users:view', displayName: 'View Users', description: 'View all users', module: 'users', actions: JSON.stringify(['view']) },
  { name: 'users:create', displayName: 'Create Users', description: 'Create new users', module: 'users', actions: JSON.stringify(['create']) },
  { name: 'users:update', displayName: 'Update Users', description: 'Update user information', module: 'users', actions: JSON.stringify(['update']) },
  { name: 'users:delete', displayName: 'Delete Users', description: 'Delete users', module: 'users', actions: JSON.stringify(['delete']) },
  
  // Product Management Permissions
  { name: 'products:view', displayName: 'View Products', description: 'View all products', module: 'products', actions: JSON.stringify(['view']) },
  { name: 'products:create', displayName: 'Create Products', description: 'Create new products', module: 'products', actions: JSON.stringify(['create']) },
  { name: 'products:update', displayName: 'Update Products', description: 'Update product information', module: 'products', actions: JSON.stringify(['update']) },
  { name: 'products:delete', displayName: 'Delete Products', description: 'Delete products', module: 'products', actions: JSON.stringify(['delete']) },
  
  // Order Management Permissions
  { name: 'orders:view', displayName: 'View Orders', description: 'View all orders', module: 'orders', actions: JSON.stringify(['view']) },
  { name: 'orders:update', displayName: 'Update Orders', description: 'Update order status', module: 'orders', actions: JSON.stringify(['update']) },
  { name: 'orders:delete', displayName: 'Delete Orders', description: 'Delete orders', module: 'orders', actions: JSON.stringify(['delete']) },
  
  // Analytics Permissions
  { name: 'analytics:view', displayName: 'View Analytics', description: 'View analytics and reports', module: 'analytics', actions: JSON.stringify(['view']) },
  { name: 'analytics:export', displayName: 'Export Analytics', description: 'Export analytics data', module: 'analytics', actions: JSON.stringify(['export']) },
  
  // Role Management Permissions
  { name: 'roles:view', displayName: 'View Roles', description: 'View all roles', module: 'roles', actions: JSON.stringify(['view']) },
  { name: 'roles:create', displayName: 'Create Roles', description: 'Create new roles', module: 'roles', actions: JSON.stringify(['create']) },
  { name: 'roles:update', displayName: 'Update Roles', description: 'Update role permissions', module: 'roles', actions: JSON.stringify(['update']) },
  { name: 'roles:delete', displayName: 'Delete Roles', description: 'Delete roles', module: 'roles', actions: JSON.stringify(['delete']) },
  { name: 'roles:manage', displayName: 'Manage Roles', description: 'Full role management', module: 'roles', actions: JSON.stringify(['create', 'read', 'update', 'delete']) },
  
  // Settings Permissions
  { name: 'settings:view', displayName: 'View Settings', description: 'View application settings', module: 'settings', actions: JSON.stringify(['view']) },
  { name: 'settings:update', displayName: 'Update Settings', description: 'Update application settings', module: 'settings', actions: JSON.stringify(['update']) },
  
  // Logs Permissions
  { name: 'logs:view', displayName: 'View Logs', description: 'View activity logs', module: 'logs', actions: JSON.stringify(['view']) },
];

const roles = [
  {
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions',
    level: 1,
    isActive: true,
    isSystem: true
  },
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Administrative access with most permissions',
    level: 2,
    isActive: true,
    isSystem: true
  },
  {
    name: 'manager',
    displayName: 'Manager',
    description: 'Management access with limited permissions',
    level: 3,
    isActive: true,
    isSystem: true
  },
  {
    name: 'customer',
    displayName: 'Customer',
    description: 'Basic customer access',
    level: 4,
    isActive: true,
    isSystem: true
  }
];

// Role to permissions mapping
const rolePermissionMap = {
  super_admin: permissions.map(p => p.name), // All permissions
  admin: permissions
    .filter(p => !p.name.includes('roles:') && !p.name.includes('settings:'))
    .map(p => p.name), // All except roles and settings
  manager: [
    'dashboard:view',
    'users:view',
    'products:view', 'products:create', 'products:update',
    'orders:view', 'orders:update',
    'analytics:view'
  ],
  customer: ['dashboard:view']
};

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL');

    // Delete existing data
    console.log('🗑️  Clearing existing roles and permissions...');
    await sequelize.query('TRUNCATE TABLE role_permissions CASCADE');
    await sequelize.query('TRUNCATE TABLE permissions CASCADE');
    await sequelize.query('TRUNCATE TABLE roles CASCADE');

    // Create permissions
    console.log('📝 Creating permissions...');
    for (const perm of permissions) {
      await sequelize.query(
        `INSERT INTO permissions (name, "displayName", description, module, actions, "createdAt", "updatedAt") 
         VALUES (:name, :displayName, :description, :module, :actions, NOW(), NOW())`,
        {
          replacements: perm,
          type: sequelize.QueryTypes.INSERT
        }
      );
    }
    console.log(`✅ Created ${permissions.length} permissions`);

    // Create roles
    console.log('👥 Creating roles...');
    for (const role of roles) {
      await sequelize.query(
        `INSERT INTO roles (name, "displayName", description, level, "isActive", "isSystem", "createdAt", "updatedAt") 
         VALUES (:name, :displayName, :description, :level, :isActive, :isSystem, NOW(), NOW())`,
        {
          replacements: role,
          type: sequelize.QueryTypes.INSERT
        }
      );
    }
    console.log(`✅ Created ${roles.length} roles`);

    // Assign permissions to roles
    console.log('🔗 Assigning permissions to roles...');
    for (const [roleName, permissionNames] of Object.entries(rolePermissionMap)) {
      const role = await sequelize.query(
        `SELECT id FROM roles WHERE name = :roleName`,
        { replacements: { roleName }, type: sequelize.QueryTypes.SELECT }
      );

      if (role.length > 0) {
        for (const permName of permissionNames) {
          const perm = await sequelize.query(
            `SELECT id FROM permissions WHERE name = :permName`,
            { replacements: { permName }, type: sequelize.QueryTypes.SELECT }
          );

          if (perm.length > 0) {
            await sequelize.query(
              `INSERT INTO role_permissions ("roleId", "permissionId", "createdAt", "updatedAt") 
               VALUES (:roleId, :permissionId, NOW(), NOW())`,
              {
                replacements: { roleId: role[0].id, permissionId: perm[0].id },
                type: sequelize.QueryTypes.INSERT
              }
            );
          }
        }
      }
    }
    console.log('✅ Permissions assigned to roles');

    console.log('\n✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed();
