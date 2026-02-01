// Add users script
require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  connectionString: process.env.POSTGRES_URI || 'postgres://postgres:1234@localhost:5432/dfashion'
});

async function addUsers() {
  try {
    await client.connect();
    console.log('Connected to database');

    const users = [
      { username: 'superadmin', email: 'superadmin@dfashion.com', password: 'SuperAdmin123!', firstName: 'Superadmin', lastName: 'User', role: 'admin' },
      { username: 'admin1', email: 'admin1@dfashion.com', password: 'Admin123!', firstName: 'Admin1', lastName: 'User', role: 'admin' },
      { username: 'vendor1', email: 'vendor1@dfashion.com', password: 'Vendor123!', firstName: 'Vendor1', lastName: 'User', role: 'vendor' },
      { username: 'customer1', email: 'customer1@dfashion.com', password: 'Customer123!', firstName: 'Customer1', lastName: 'User', role: 'user' },
      { username: 'customer2', email: 'customer2@dfashion.com', password: 'Customer123!', firstName: 'Customer2', lastName: 'User', role: 'user' },
      { username: 'customer3', email: 'customer3@dfashion.com', password: 'Customer123!', firstName: 'Customer3', lastName: 'User', role: 'user' }
    ];

    for (const user of users) {
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(user.password, salt);
      const now = new Date();
      try {
        await client.query(
          'INSERT INTO users (username, email, password, full_name, role, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (email) DO NOTHING',
          [user.username, user.email, passwordHash, user.firstName + ' ' + user.lastName, user.role, true, now, now]
        );
        console.log('Added user:', user.email);
      } catch (e) {
        console.log('User already exists or error:', user.email, e.message);
      }
    }

    console.log('Users addition completed');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

addUsers();