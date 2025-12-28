// PostgreSQL User Seeder
// Usage: node scripts/seedPostgres.sql or via seedPostgresUsers.js

const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models_sql');

const users = [
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
    username: 'customer1',
    email: 'customer1@dfashion.com',
    password: 'Customer123!',
    fullName: 'Customer User 1',
    role: 'customer',
    department: 'customer_service',
    isActive: true
  }
];

async function seedUsers() {
  try {
    console.log('🌱 Starting PostgreSQL user seeding...');
    
    // Authenticate
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL');

    // Sync models
    await sequelize.sync({ alter: true });
    console.log('🗃️  Models synchronized');

    // Hash passwords and create users
    for (const userData of users) {
      const existingUser = await User.findOne({ where: { email: userData.email } });
      
      if (existingUser) {
        console.log(`⏭️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(userData.password, 12);
      await User.create({
        ...userData,
        password: hashedPassword
      });
      console.log(`✅ Created user: ${userData.email}`);
    }

    console.log('🌟 PostgreSQL user seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message || error);
    process.exit(1);
  }
}

seedUsers();
