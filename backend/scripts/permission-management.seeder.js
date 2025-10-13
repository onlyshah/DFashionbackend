const mongoose = require('mongoose');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const RolePermission = require('../models/RolePermission');

async function assignPermissionToRole(roleName, permissionName, actions) {
  const role = await Role.findOne({ name: roleName });
  const permission = await Permission.findOne({ name: permissionName });
  if (!role || !permission) return;
  await RolePermission.findOneAndUpdate(
    { role: role._id, permission: permission._id },
    { actions, isGranted: true },
    { upsert: true }
  );
}

async function seedPermissionManagement() {
  await mongoose.connect('mongodb://localhost:27017/dfashion', { useNewUrlParser: true, useUnifiedTopology: true });

  // Super Admin can manage all permissions
  await assignPermissionToRole('super_admin', 'manage_users', ['create', 'read', 'update', 'delete', 'approve']);
  await assignPermissionToRole('super_admin', 'manage_products', ['create', 'read', 'update', 'delete', 'approve']);
  await assignPermissionToRole('super_admin', 'manage_orders', ['create', 'read', 'update', 'delete', 'approve']);
  await assignPermissionToRole('super_admin', 'manage_analytics', ['read', 'export']);
  await assignPermissionToRole('super_admin', 'manage_settings', ['read', 'update']);
  await assignPermissionToRole('super_admin', 'manage_content', ['create', 'read', 'update', 'delete', 'approve']);
  await assignPermissionToRole('super_admin', 'manage_dashboard', ['read']);

  // Admin can only grant permissions if allowed by Super Admin (handled in app logic)

  console.log('Permission management seeded.');
  await mongoose.disconnect();
}

seedPermissionManagement().catch(console.error);
