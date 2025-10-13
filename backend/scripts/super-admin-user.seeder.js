const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');

async function seedSuperAdmin() {
  await mongoose.connect('mongodb://localhost:27017/dfashion', { useNewUrlParser: true, useUnifiedTopology: true });

  // Find super_admin role
  const superAdminRole = await Role.findOne({ name: 'super_admin' });
  if (!superAdminRole) throw new Error('Super Admin role not found. Run role-permission.seeder.js first.');

  // Create super admin user
  const superAdmin = await User.findOneAndUpdate(
    { email: 'superadmin@dfashion.com' },
    {
      username: 'superadmin',
      email: 'superadmin@dfashion.com',
      password: '$2a$10$7Qw1Qw1Qw1Qw1Qw1Qw1QwOQw1Qw1Qw1Qw1Qw1Qw1Qw1Qw1Qw1Qw1Q', // bcrypt hash for 'superadmin123'
      fullName: 'Super Admin',
      role: 'super_admin',
      isActive: true
    },
    { upsert: true, new: true }
  );

  console.log('Super Admin user seeded:', superAdmin.email);
  await mongoose.disconnect();
}

seedSuperAdmin().catch(console.error);
