#!/usr/bin/env node
// Seed data via backend API
// Registers users through the backend API instead of direct database connection

const axios = require('axios');

const BACKEND_URL = 'http://localhost:9000/api';

const users = [
  { username: 'superadmin', email: 'superadmin@dfashion.com', password: 'SuperAdmin123!', fullName: 'Super Admin', role: 'super_admin' },
  { username: 'admin1', email: 'admin1@dfashion.com', password: 'Admin123!', fullName: 'Admin User 1', role: 'admin' },
  { username: 'admin2', email: 'admin2@dfashion.com', password: 'Admin123!', fullName: 'Admin User 2', role: 'admin' },
  { username: 'vendor1', email: 'vendor1@dfashion.com', password: 'Vendor123!', fullName: 'Vendor User 1', role: 'vendor' },
  { username: 'vendor2', email: 'vendor2@dfashion.com', password: 'Vendor123!', fullName: 'Vendor User 2', role: 'vendor' },
  { username: 'customer1', email: 'customer1@dfashion.com', password: 'Customer123!', fullName: 'Customer User 1', role: 'customer' },
  { username: 'customer2', email: 'customer2@dfashion.com', password: 'Customer123!', fullName: 'Customer User 2', role: 'customer' },
  { username: 'customer3', email: 'customer3@dfashion.com', password: 'Customer123!', fullName: 'Customer User 3', role: 'customer' }
];

async function seedViaAPI() {
  console.log('🌱 Starting data seeding via API...\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      console.log(`📝 Attempting to register: ${user.email}`);
      
      const response = await axios.post(`${BACKEND_URL}/auth/register`, user, {
        timeout: 5000
      });

      if (response.data.success) {
        console.log(`  ✅ Successfully created user: ${user.email}\n`);
        successCount++;
      } else {
        console.log(`  ⚠️  Failed to create user: ${response.data.message}\n`);
        errorCount++;
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      const status = error.response?.status;
      
      if (message.includes('already exists')) {
        console.log(`  ⏭️  User already exists: ${user.email}\n`);
        skipCount++;
      } else {
        console.log(`  ❌ Error creating user: ${status || ''} ${message}`);
        console.log(`     Full error: ${JSON.stringify(error.response?.data || error.message)}\n`);
        errorCount++;
      }
    }
  }

  console.log('\n🎉 Seeding completed!');
  console.log(`   ✅ Created: ${successCount}`);
  console.log(`   ⏭️  Skipped: ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

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

  process.exit(errorCount > 0 ? 1 : 0);
}

seedViaAPI();
