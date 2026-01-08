// Seed core bootstrap data into Postgres using Sequelize
// Usage: node scripts/seedPostgresBootstrap.js

require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize, Role, User } = require('../models_sql');

async function seed() {
  try {
    console.log('🌱 Starting Postgres bootstrap seeding...');

    await sequelize.authenticate();
    console.log('🔌 Sequelize authenticated');

    // Sync models (creates tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('🗃️  Models synchronized');

    // Roles
    const roles = [
      { name: 'super_admin', description: 'Full access' },
      { name: 'admin', description: 'Admin user' },
      { name: 'vendor', description: 'Vendor user' },
      { name: 'customer', description: 'Customer user' }
    ];

    for (const r of roles) {
      const existing = await Role.findOne({ where: { name: r.name } });
      if (existing) {
        console.log(`   Role: ${r.name} (exists)`);
      } else {
        await Role.create(r);
        console.log(`   Role: ${r.name} (created)`);
      }
    }

    // Superadmin user
    const superAdminEmail = 'superadmin@dfashion.com';
    const existing = await User.findOne({ where: { email: superAdminEmail } });
    if (!existing) {
      const hashed = await bcrypt.hash(process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123!', 12);
      const user = await User.create({
        username: 'superadmin',
        email: superAdminEmail,
        password: hashed,
        fullName: 'Super Admin',
        role: 'super_admin',
        department: 'administration',
        isActive: true
      });
      console.log('   Superadmin created:', user.email);
    } else {
      console.log('   Superadmin already exists:', existing.email);
    }

    console.log('🌟 Postgres bootstrap seeding completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeder failed:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

seed();
