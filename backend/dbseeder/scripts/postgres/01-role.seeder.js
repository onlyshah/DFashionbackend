/**
 * 📋 Role Seeder (Phase 1 - Root Model)
 * Seeds the roles table with standard roles
 * No dependencies
 */

const models = require('../../../models_sql');

const roleData = [
  {
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions',
    level: 1,
    isSystemRole: true
  },
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Administrative access with most permissions',
    level: 2,
    isSystemRole: true
  },
  {
    name: 'manager',
    displayName: 'Manager',
    description: 'Management access with limited permissions',
    level: 3,
    isSystemRole: true
  },
  {
    name: 'user',
    displayName: 'User',
    description: 'Standard user with basic permissions',
    level: 4,
    isSystemRole: true
  },
  {
    name: 'seller',
    displayName: 'Seller',
    description: 'Seller access with product management permissions',
    level: 5,
    isSystemRole: true
  },
  {
    name: 'customer',
    displayName: 'Customer',
    description: 'Customer access with purchase permissions',
    level: 6,
    isSystemRole: false
  }
];

async function seedRoles() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Role seeding...');

    // Reinitialize models after connection
    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Role = models._raw?.Role || models.Role;
    if (!Role || !Role.create) {
      throw new Error('Role model not available');
    }

    for (const role of roleData) {
      // Check if role already exists
      const existing = await Role.findOne({
        where: { name: role.name }
      });

      if (existing) {
        console.log(`✅ Role '${role.name}' already exists (skipping)`);
        continue;
      }

      const created = await Role.create(role);
      console.log(`✅ Created role: ${role.displayName}`);
    }

    console.log('✨ Role seeding completed successfully\n');
    return true;
  } catch (error) {
    console.error('❌ Role seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedRoles };
