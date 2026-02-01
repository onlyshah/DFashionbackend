/**
 * PostgreSQL Role Seeder
 * Seeds the database with 4 standard roles
 * Usage: node scripts/role.seeder.postgres.js
 */

require('dotenv').config();
const { sequelize } = require('../config/sequelize');
const { _raw: models } = require('../models_sql');
const Role = models.Role;

const ROLES = [
  {
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions',
    level: 1,
    isActive: true,
    isSystem: true
  },
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Administrative access with most permissions (no settings/roles management)',
    level: 2,
    isActive: true,
    isSystem: true
  },
  {
    name: 'manager',
    displayName: 'Manager',
    description: 'Management access with limited permissions (dashboard, users, products, orders)',
    level: 3,
    isActive: true,
    isSystem: true
  },
  {
    name: 'customer',
    displayName: 'Customer',
    description: 'Basic customer access (dashboard only)',
    level: 4,
    isActive: true,
    isSystem: true
  }
];

async function seedRoles() {
  try {
    console.log('🚀 Starting PostgreSQL Role Seeder...\n');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // Check if roles already exist
    const existingCount = await Role.count();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing roles. Clearing...\n`);
      await Role.destroy({ where: {} });
    }

    // Seed roles
    let seededCount = 0;
    console.log('📝 Seeding roles...');
    for (const role of ROLES) {
      const created = await Role.create(role);
      console.log(`  ✓ Created role: ${created.name} (Level ${created.level})`);
      seededCount++;
    }

    console.log(`\n✅ Successfully seeded ${seededCount} roles\n`);
    console.log('═'.repeat(50));
    console.log('ROLE SEEDING COMPLETE');
    console.log('═'.repeat(50));
    console.log('\nSeeded Roles:');
    ROLES.forEach(r => console.log(`  • ${r.displayName} (${r.name}) - Level ${r.level}`));
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding roles:', error.message);
    if (error.errors) {
      console.error('Details:');
      error.errors.forEach(e => console.error(`  - ${e.message}`));
    }
    process.exit(1);
  }
}

// Run seeder
seedRoles();
