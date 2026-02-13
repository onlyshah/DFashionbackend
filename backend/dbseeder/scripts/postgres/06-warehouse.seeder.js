/**
 * 🏭 Warehouse Seeder (Phase 1 - Root Model)
 * Seeds the warehouses table
 * No dependencies
 */

const models = require('../../../models_sql');

const warehouseData = [
  {
    name: 'Delhi Warehouse',
    location: 'Delhi',
    address: '123 Industrial Area, Delhi',
    city: 'Delhi',
    state: 'Delhi',
    zipCode: '110001',
    capacity: 10000,
    isActive: true
  },
  {
    name: 'Mumbai Warehouse',
    location: 'Mumbai',
    address: '456 Port Area, Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    zipCode: '400001',
    capacity: 15000,
    isActive: true
  },
  {
    name: 'Bangalore Warehouse',
    location: 'Bangalore',
    address: '789 Tech Park, Bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
    zipCode: '560001',
    capacity: 8000,
    isActive: true
  },
  {
    name: 'Hyderabad Warehouse',
    location: 'Hyderabad',
    address: '321 Business District, Hyderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    zipCode: '500001',
    capacity: 12000,
    isActive: true
  }
];

async function seedWarehouses() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Warehouse seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Warehouse = models._raw?.Warehouse || models.Warehouse;
    if (!Warehouse || !Warehouse.create) {
      throw new Error('Warehouse model not available');
    }

    let createdCount = 0;
    for (const warehouse of warehouseData) {
      const existing = await Warehouse.findOne({
        where: { name: warehouse.name }
      });

      if (existing) {
        console.log(`✅ Warehouse '${warehouse.name}' already exists (skipping)`);
        continue;
      }

      await Warehouse.create(warehouse);
      console.log(`✅ Created warehouse: ${warehouse.name}`);
      createdCount++;
    }

    console.log(`✨ Warehouse seeding completed (${createdCount} new warehouses)\n`);
    return true;
  } catch (error) {
    console.error('❌ Warehouse seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedWarehouses };
