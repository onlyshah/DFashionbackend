const mongoose = require('mongoose');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const RolePermission = require('../models/RolePermission');

const permissions = [
  // System-wide permissions
  { name: 'manage_users', displayName: 'Manage Users', description: 'Full user management', module: 'users', actions: ['create', 'read', 'update', 'delete', 'approve'], isSystemPermission: true },
  { name: 'manage_products', displayName: 'Manage Products', description: 'Full product management', module: 'products', actions: ['create', 'read', 'update', 'delete', 'approve'], isSystemPermission: true },
  { name: 'manage_orders', displayName: 'Manage Orders', description: 'Full order management', module: 'orders', actions: ['create', 'read', 'update', 'delete', 'approve'], isSystemPermission: true },
  { name: 'manage_analytics', displayName: 'Manage Analytics', description: 'Full analytics access', module: 'analytics', actions: ['read', 'export'], isSystemPermission: true },
  { name: 'manage_settings', displayName: 'Manage Settings', description: 'Full settings access', module: 'settings', actions: ['read', 'update'], isSystemPermission: true },
  { name: 'manage_content', displayName: 'Manage Content', description: 'Full content management', module: 'content', actions: ['create', 'read', 'update', 'delete', 'approve'], isSystemPermission: true },
  { name: 'manage_dashboard', displayName: 'Manage Dashboard', description: 'Full dashboard access', module: 'dashboard', actions: ['read'], isSystemPermission: true },
];

const roles = [
  { name: 'super_admin', displayName: 'Super Admin', description: 'Full system access', department: 'administration', level: 10, isSystemRole: true },
  { name: 'admin', displayName: 'Admin', description: 'Admin access', department: 'administration', level: 8, isSystemRole: true },
  { name: 'vendor', displayName: 'Vendor', description: 'Vendor access', department: 'vendor_management', level: 5, isSystemRole: true },
  { name: 'end_user', displayName: 'End User', description: 'Customer access', department: 'customer_service', level: 1, isSystemRole: true },
];

async function seed() {
  await mongoose.connect('mongodb://localhost:27017/dfashion', { useNewUrlParser: true, useUnifiedTopology: true });

  // Seed permissions
  await Permission.deleteMany({});
  const createdPermissions = await Permission.insertMany(permissions);

  // Seed roles
  await Role.deleteMany({});
  const createdRoles = await Role.insertMany(roles);

  // Assign all permissions to super_admin
  const superAdmin = createdRoles.find(r => r.name === 'super_admin');
  for (const perm of createdPermissions) {
    await RolePermission.create({
      role: superAdmin._id,
      permission: perm._id,
      actions: perm.actions,
      isGranted: true
    });
  }

  // Assign limited permissions to admin
  const admin = createdRoles.find(r => r.name === 'admin');
  for (const perm of createdPermissions) {
    if (perm.module !== 'settings') {
      await RolePermission.create({
        role: admin._id,
        permission: perm._id,
        actions: perm.actions,
        isGranted: true
      });
    }
  }

  // Vendor and end_user get no system permissions by default

  console.log('Seeded roles and permissions.');
  await mongoose.disconnect();
}

seed().catch(console.error);
