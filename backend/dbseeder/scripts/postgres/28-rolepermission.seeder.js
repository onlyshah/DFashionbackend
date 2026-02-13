/**
 * 🔐 RolePermission Seeder (Phase 2 - Tier 1)
 * Depends on: Role, Permission
 * Maps permissions to roles
 */

const models = require('../../../models_sql');

// Permission mappings by role
const rolePermissionMappings = {
  'super_admin': [
    'view_dashboard', 'manage_users', 'manage_roles', 'manage_permissions',
    'view_products', 'create_products', 'edit_products', 'delete_products',
    'view_orders', 'create_orders', 'update_orders', 'export_orders',
    'manage_categories', 'manage_brands',
    'view_inventory', 'manage_inventory',
    'view_analytics', 'export_analytics',
    'manage_settings', 'manage_modules', 'manage_features',
    'view_sellers', 'manage_sellers',
    'view_tickets', 'resolve_tickets'
  ],
  'admin': [
    'view_dashboard', 'manage_users',
    'view_products', 'create_products', 'edit_products',
    'view_orders', 'create_orders', 'update_orders',
    'manage_categories', 'manage_brands',
    'view_inventory', 'manage_inventory',
    'view_analytics',
    'view_sellers',
    'view_tickets', 'resolve_tickets'
  ],
  'manager': [
    'view_dashboard',
    'view_products', 'create_products', 'edit_products',
    'view_orders', 'update_orders',
    'view_inventory',
    'view_analytics',
    'view_tickets'
  ],
  'user': [
    'view_products',
    'view_analytics'
  ],
  'seller': [
    'view_products', 'create_products', 'edit_products',
    'view_orders', 'view_inventory', 'manage_inventory',
    'view_analytics'
  ]
};

async function seedRolePermissions() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting RolePermission seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const RolePermission = models._raw?.RolePermission || models.RolePermission;
    const Role = models._raw?.Role || models.Role;
    const Permission = models._raw?.Permission || models.Permission;

    if (!RolePermission || !RolePermission.create) throw new Error('RolePermission model not available');
    if (!Role || !Role.findOne) throw new Error('Role model not available');
    if (!Permission || !Permission.findOne) throw new Error('Permission model not available');

    let createdCount = 0;

    for (const [roleName, permissionNames] of Object.entries(rolePermissionMappings)) {
      const role = await Role.findOne({ where: { name: roleName } });
      
      if (!role) {
        console.warn(`⚠️ Role '${roleName}' not found. Skipping permissions.`);
        continue;
      }

      for (const permName of permissionNames) {
        const permission = await Permission.findOne({ where: { name: permName } });
        
        if (!permission) {
          console.warn(`⚠️ Permission '${permName}' not found. Skipping.`);
          continue;
        }

        const existing = await RolePermission.findOne({
          where: { roleId: role.id, permissionId: permission.id }
        });

        if (existing) {
          console.log(`✅ RolePermission for '${roleName}' -> '${permName}' already exists (skipping)`);
          continue;
        }

        await RolePermission.create({
          roleId: role.id,
          permissionId: permission.id
        });

        console.log(`✅ Assigned permission '${permName}' to role '${roleName}'`);
        createdCount++;
      }
    }

    console.log(`✨ RolePermission seeding completed (${createdCount} new mappings)\n`);
    return true;
  } catch (error) {
    console.error('❌ RolePermission seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedRolePermissions };
