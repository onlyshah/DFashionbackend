/**
 * 📦 Module Seeder (Phase 1 - Root Model)
 * Seeds the modules table with feature modules
 * No dependencies
 */

const models = require('../../../models_sql');

const moduleData = [
  { name: 'Dashboard', displayName: 'Dashboard', description: 'Admin dashboard and overview', isActive: true },
  { name: 'Users', displayName: 'Users', description: 'User management system', isActive: true },
  { name: 'Products', displayName: 'Products', description: 'Product catalog management', isActive: true },
  { name: 'Orders', displayName: 'Orders', description: 'Order management system', isActive: true },
  { name: 'Payments', displayName: 'Payments', description: 'Payment processing', isActive: true },
  { name: 'Inventory', displayName: 'Inventory', description: 'Inventory and stock management', isActive: true },
  { name: 'Shipping', displayName: 'Shipping', description: 'Shipping and logistics', isActive: true },
  { name: 'Sellers', displayName: 'Sellers', description: 'Seller management', isActive: true },
  { name: 'Content', displayName: 'Content', description: 'Content management system', isActive: true },
  { name: 'Analytics', displayName: 'Analytics', description: 'Analytics and reporting', isActive: true },
  { name: 'Support', displayName: 'Support', description: 'Customer support system', isActive: true },
  { name: 'Marketing', displayName: 'Marketing', description: 'Marketing and campaigns', isActive: true }
];

async function seedModules() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Module seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Module = models._raw?.Module || models.Module;
    if (!Module || !Module.create) {
      throw new Error('Module model not available');
    }

    let createdCount = 0;
    for (const mod of moduleData) {
      const existing = await Module.findOne({
        where: { name: mod.name }
      });

      if (existing) {
        console.log(`✅ Module '${mod.name}' already exists (skipping)`);
        continue;
      }

      await Module.create(mod);
      console.log(`✅ Created module: ${mod.name}`);
      createdCount++;
    }

    console.log(`✨ Module seeding completed (${createdCount} new modules)\n`);
    return true;
  } catch (error) {
    console.error('❌ Module seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedModules };
