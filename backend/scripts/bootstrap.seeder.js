// Bootstrap Seeder Script
// This seeder creates the minimum required data to break circular dependencies
// Usage: node scripts/bootstrap.seeder.js

const mongoose = require('mongoose');
const Role = require('../models/Role');
const models = require('../models');
const User = models.User;
const Module = require('../models/Module');
const bcrypt = require('bcrypt');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

async function seedBootstrapData() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Create bootstrap superadmin user
  const superAdminPassword = await bcrypt.hash('SuperAdmin123!', 12);
  const superAdmin = await User.findOneAndUpdate(
    { email: 'superadmin@dfashion.com' },
    {
      username: 'superadmin',
      email: 'superadmin@dfashion.com',
      password: superAdminPassword,
      fullName: 'Super Admin',
      role: 'super_admin',
      department: 'administration',
      isActive: true
    },
    { upsert: true, new: true }
  );

  // Create base module
  const baseModule = await Module.findOneAndUpdate(
    { name: 'core' },
    {
      name: 'core',
      displayName: 'Core Module',
      description: 'Core system functionality',
      isActive: true,
      createdBy: superAdmin._id
    },
    { upsert: true, new: true }
  );

  // Create base role
  await Role.findOneAndUpdate(
    { name: 'super_admin' },
    {
      name: 'super_admin',
      displayName: 'Super Administrator',
      description: 'Full system access',
      department: 'administration',
      level: 100,
      modulePermissions: [
        { module: baseModule._id, actions: ['create', 'read', 'update', 'delete'], isGranted: true }
      ],
      isSystemRole: true,
      isActive: true,
      createdBy: superAdmin._id
    },
    { upsert: true, new: true }
  );

  console.log('Bootstrap data seeded successfully!');
  await mongoose.disconnect();
}

seedBootstrapData().catch(err => {
  console.error('Bootstrap seeding failed:', err);
  process.exit(1);
});