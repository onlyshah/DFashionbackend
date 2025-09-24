// Role Seeder Script
// Usage: node scripts/role.seeder.js

const mongoose = require('mongoose');
const Role = require('../models/Role');
const Module = require('../models/Module');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

async function seedRoles() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const module = await Module.findOne();
  const user = await User.findOne();
  if (!module || !user) {
    throw new Error('Missing module or user for role seeding.');
  }

  const roles = [
    {
      name: 'admin',
      displayName: 'Administrator',
      description: 'Full access to all modules',
      department: 'administration',
      level: 10,
      modulePermissions: [
        { module: module._id, actions: ['create', 'read', 'update', 'delete'], isGranted: true }
      ],
      isSystemRole: true,
      isActive: true,
      createdBy: user._id
    },
    // Add more roles as needed
  ];

  await Role.deleteMany({});
  await Role.insertMany(roles);
  console.log('Roles seeded successfully!');
  await mongoose.disconnect();
}

seedRoles().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
