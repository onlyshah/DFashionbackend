#!/usr/bin/env node
// Seed script using backend's own Sequelize configuration
// This ensures we use the exact same database connection settings as the backend

require('dotenv').config();

// Use the raw Sequelize models exported under `_raw` to access create/findOne
const modelsSql = require('../models_sql');
const sequelize = modelsSql.sequelize;
const Role = modelsSql._raw.Role;
const User = modelsSql._raw.User;
const Permission = modelsSql._raw.Permission || null;
const bcrypt = require('bcryptjs');

const defaultUsers = [
  {
    username: 'superadmin',
    email: 'superadmin@dfashion.com',
    password: 'SuperAdmin123!',
    fullName: 'Super Admin',
    role: 'super_admin',
    department: 'administration',
    isActive: true
  },
  {
    username: 'admin1',
    email: 'admin1@dfashion.com',
    password: 'Admin123!',
    fullName: 'Admin User 1',
    role: 'admin',
    department: 'administration',
    isActive: true
  },
  {
    username: 'admin2',
    email: 'admin2@dfashion.com',
    password: 'Admin123!',
    fullName: 'Admin User 2',
    role: 'admin',
    department: 'administration',
    isActive: true
  },
  {
    username: 'vendor1',
    email: 'vendor1@dfashion.com',
    password: 'Vendor123!',
    fullName: 'Vendor User 1',
    role: 'vendor',
    department: 'vendor_management',
    isActive: true
  },
  {
    username: 'vendor2',
    email: 'vendor2@dfashion.com',
    password: 'Vendor123!',
    fullName: 'Vendor User 2',
    role: 'vendor',
    department: 'vendor_management',
    isActive: true
  },
  {
    username: 'customer1',
    email: 'customer1@dfashion.com',
    password: 'Customer123!',
    fullName: 'Customer User 1',
    role: 'customer',
    department: 'customer_service',
    isActive: true
  },
  {
    username: 'customer2',
    email: 'customer2@dfashion.com',
    password: 'Customer123!',
    fullName: 'Customer User 2',
    role: 'customer',
    department: 'customer_service',
    isActive: true
  },
  {
    username: 'customer3',
    email: 'customer3@dfashion.com',
    password: 'Customer123!',
    fullName: 'Customer User 3',
    role: 'customer',
    department: 'customer_service',
    isActive: true
  }
];

const defaultRoles = [
  {
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Full system access and control',
    level: 1,
    isSystemRole: true,
    isActive: true
  },
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Administrative access to core features',
    level: 2,
    isSystemRole: true,
    isActive: true
  },
  {
    name: 'manager',
    displayName: 'Manager',
    description: 'Management access to assigned areas',
    level: 2,
    isSystemRole: true,
    isActive: true
  },
  {
    name: 'vendor',
    displayName: 'Vendor',
    description: 'Vendor-specific features and product management',
    level: 3,
    isSystemRole: false,
    isActive: true
  },
  {
    name: 'customer',
    displayName: 'Customer',
    description: 'Customer shopping and social features',
    level: 4,
    isSystemRole: false,
    isActive: true
  }
];

async function seedDatabase() {
  try {
    console.log('🔄 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');

    console.log('\n📊 Syncing database models...');
    await sequelize.sync({ alter: false });
    console.log('✅ Models synchronized');

    // Seed Roles
    console.log('\n🔐 Seeding roles...');
    for (const roleData of defaultRoles) {
      // Some setups may not expose findOrCreate; use findOne + create for compatibility
      const existingRole = await Role.findOne({ where: { name: roleData.name } });
      if (existingRole) {
        console.log(`  ⏭️  Role already exists: ${roleData.displayName}`);
      } else {
        await Role.create(roleData);
        console.log(`  ✅ Created role: ${roleData.displayName}`);
      }
    }

    // Seed Users
    console.log('\n👥 Seeding users...');
    for (const userData of defaultUsers) {
      const existingUser = await User.findOne({ where: { email: userData.email } });
      
      if (existingUser) {
        console.log(`  ⏭️  User already exists: ${userData.email}`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = await User.create({
        ...userData,
        password: hashedPassword
      });
      console.log(`  ✅ Created user: ${userData.email} (${userData.role})`);
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Test Login Credentials:');
    console.log('  Super Admin:');
    console.log('    Email: superadmin@dfashion.com');
    console.log('    Password: SuperAdmin123!');
    console.log('\n  Admin:');
    console.log('    Email: admin1@dfashion.com');
    console.log('    Password: Admin123!');
    console.log('\n  Vendor:');
    console.log('    Email: vendor1@dfashion.com');
    console.log('    Password: Vendor123!');
    console.log('\n  Customer:');
    console.log('    Email: customer1@dfashion.com');
    console.log('    Password: Customer123!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message || error);
    console.error(error);
    process.exit(1);
  }
}

seedDatabase();
