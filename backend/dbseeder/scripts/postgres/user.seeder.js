// User Seeder Script
// Usage: node scripts/user.seeder.js

require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const POSTGRES_URI = 'postgres://postgres:1234@localhost:5432/dfashion';
console.log('Seeder using POSTGRES_URI:', POSTGRES_URI);

const users = [
  // 1 Super Admin
  {
    username: 'superadmin',
    email: 'superadmin@dfashion.com',
    password: 'SuperAdmin123!',
    firstName: 'Superadmin',
    lastName: 'User',
    role: 'super_admin',
    isActive: true
  },
  // 5 Admins
  ...Array.from({ length: 5 }, (_, i) => ({
    username: `admin${i+1}`,
    email: `admin${i+1}@dfashion.com`,
    password: 'Admin123!',
    firstName: `Admin${i+1}`,
    lastName: 'User',
    role: 'admin',
    isActive: true
  })),
  // 5 Vendors
  ...Array.from({ length: 5 }, (_, i) => ({
    username: `vendor${i+1}`,
    email: `vendor${i+1}@dfashion.com`,
    password: 'Vendor123!',
    firstName: `Vendor${i+1}`,
    lastName: 'User',
    role: 'vendor',
    isActive: true
  })),
  // 10 Customers
  ...Array.from({ length: 10 }, (_, i) => ({
    username: `customer${i+1}`,
    email: `customer${i+1}@dfashion.com`,
    password: 'Customer123!',
    firstName: `Customer${i+1}`,
    lastName: 'User',
    role: 'end_user',
    isActive: true
  })),
  // 10 Influencers
  ...Array.from({ length: 10 }, (_, i) => ({
    username: `influencer${i+1}`,
    email: `influencer${i+1}@dfashion.com`,
    password: 'Influencer123!',
    firstName: `Influencer${i+1}`,
    lastName: 'User',
    role: 'end_user',
    isActive: true
  })),
];

async function seedUsers() {
  const client = new Client({ connectionString: POSTGRES_URI });
  await client.connect();
  console.log('Connected to Postgres');
  // Clean slate to avoid duplicates
  await client.query('DELETE FROM "Users"');
  for (const user of users) {
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(user.password, salt);
    const now = new Date();
    await client.query(
      'INSERT INTO "Users" (username, email, "passwordHash", "firstName", "lastName", role, "isActive", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [user.username, user.email, passwordHash, user.firstName, user.lastName, user.role, user.isActive, now, now]
    );
  }
  console.log('Users seeded successfully!');
  await client.end();
}

seedUsers().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
