// Module Seeder Script
// Usage: node scripts/module.seeder.js

const mongoose = require('mongoose');
const Module = require('../models/Module');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

async function seedModules() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const user = await User.findOne();
  if (!user) {
    throw new Error('Missing user for module seeding.');
  }

  const modules = [
    {
      name: 'products',
      displayName: 'Products',
      description: 'Manage all products',
      category: 'ecommerce',
      icon: 'fas fa-box',
      route: '/products',
      availableActions: [
        { name: 'create', displayName: 'Create', description: 'Create new product' },
        { name: 'read', displayName: 'Read', description: 'View products' },
        { name: 'update', displayName: 'Update', description: 'Edit products' },
        { name: 'delete', displayName: 'Delete', description: 'Delete products' }
      ],
      isActive: true,
      sortOrder: 1,
      requiredLevel: 1,
      createdBy: user._id
    },
    // Add more modules as needed
  ];

  await Module.deleteMany({});
  await Module.insertMany(modules);
  console.log('Modules seeded successfully!');
  await mongoose.disconnect();
}

seedModules().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
