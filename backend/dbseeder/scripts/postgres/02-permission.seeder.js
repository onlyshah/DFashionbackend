/**
 * 🔐 Permission Seeder (Phase 1 - Root Model)
 * Seeds the permissions table with standard permissions
 * No dependencies
 */

const models = require('../../../models_sql');

const permissionData = [
  // Admin Permissions
  { name: 'view_dashboard', displayName: 'View Dashboard', description: 'View admin dashboard', module: 'dashboard' },
  { name: 'manage_users', displayName: 'Manage Users', description: 'Create, read, update, delete users', module: 'users' },
  { name: 'manage_roles', displayName: 'Manage Roles', description: 'Create, read, update, delete roles', module: 'roles' },
  { name: 'manage_permissions', displayName: 'Manage Permissions', description: 'Manage system permissions', module: 'permissions' },
  
  // Product Management
  { name: 'view_products', displayName: 'View Products', description: 'View all products', module: 'products' },
  { name: 'create_products', displayName: 'Create Products', description: 'Create new products', module: 'products' },
  { name: 'edit_products', displayName: 'Edit Products', description: 'Edit product details', module: 'products' },
  { name: 'delete_products', displayName: 'Delete Products', description: 'Delete products', module: 'products' },
  
  // Order Management
  { name: 'view_orders', displayName: 'View Orders', description: 'View all orders', module: 'orders' },
  { name: 'create_orders', displayName: 'Create Orders', description: 'Create orders', module: 'orders' },
  { name: 'update_orders', displayName: 'Update Orders', description: 'Update order status and details', module: 'orders' },
  { name: 'export_orders', displayName: 'Export Orders', description: 'Export orders data', module: 'orders' },
  
  // Category & Brand Management
  { name: 'manage_categories', displayName: 'Manage Categories', description: 'Manage product categories', module: 'categories' },
  { name: 'manage_brands', displayName: 'Manage Brands', description: 'Manage brands', module: 'brands' },
  
  // Inventory Management
  { name: 'view_inventory', displayName: 'View Inventory', description: 'View inventory levels', module: 'inventory' },
  { name: 'manage_inventory', displayName: 'Manage Inventory', description: 'Manage inventory and stock', module: 'inventory' },
  
  // Reports & Analytics
  { name: 'view_analytics', displayName: 'View Analytics', description: 'View analytics and reports', module: 'analytics' },
  { name: 'export_analytics', displayName: 'Export Analytics', description: 'Export analytics data', module: 'analytics' },
  
  // Settings
  { name: 'manage_settings', displayName: 'Manage Settings', description: 'Manage system settings', module: 'settings' },
  { name: 'manage_modules', displayName: 'Manage Modules', description: 'Enable/disable modules', module: 'modules' },
  { name: 'manage_features', displayName: 'Manage Features', description: 'Manage feature flags', module: 'features' },
  
  // Seller Management
  { name: 'view_sellers', displayName: 'View Sellers', description: 'View seller information', module: 'sellers' },
  { name: 'manage_sellers', displayName: 'Manage Sellers', description: 'Manage seller accounts', module: 'sellers' },
  
  // Support
  { name: 'view_tickets', displayName: 'View Tickets', description: 'View support tickets', module: 'support' },
  { name: 'resolve_tickets', displayName: 'Resolve Tickets', description: 'Resolve support tickets', module: 'support' }
];

async function seedPermissions() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Permission seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Permission = models._raw?.Permission || models.Permission;
    if (!Permission || !Permission.create) {
      throw new Error('Permission model not available');
    }

    let createdCount = 0;
    for (const permission of permissionData) {
      const existing = await Permission.findOne({
        where: { name: permission.name }
      });

      if (existing) {
        console.log(`✅ Permission '${permission.name}' already exists (skipping)`);
        continue;
      }

      await Permission.create(permission);
      console.log(`✅ Created permission: ${permission.name}`);
      createdCount++;
    }

    console.log(`✨ Permission seeding completed (${createdCount} new permissions)\n`);
    return true;
  } catch (error) {
    console.error('❌ Permission seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedPermissions };
