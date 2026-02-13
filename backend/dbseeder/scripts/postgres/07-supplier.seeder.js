/**
 * 🏪 Supplier Seeder (Phase 1 - Root Model)
 * Seeds the suppliers table
 * No dependencies
 */

const models = require('../../../models_sql');

const supplierData = [
  {
    name: 'Premium Fabrics Inc',
    email: 'contact@premiumfabrics.com',
    phone: '+91-9876543210',
    address: 'Mumbai, India',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    zipCode: '400001',
    contactPerson: 'Mr. Sharma',
    isActive: true
  },
  {
    name: 'Global Textiles Ltd',
    email: 'sales@globaltextiles.com',
    phone: '+91-9123456789',
    address: 'Delhi, India',
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    zipCode: '110001',
    contactPerson: 'Ms. Gupta',
    isActive: true
  },
  {
    name: 'Fashion Materials Co',
    email: 'info@fashionmaterials.com',
    phone: '+91-9987654321',
    address: 'Bangalore, India',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    zipCode: '560001',
    contactPerson: 'Mr. Patel',
    isActive: true
  }
];

async function seedSuppliers() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Supplier seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Supplier = models._raw?.Supplier || models.Supplier;
    if (!Supplier || !Supplier.create) {
      throw new Error('Supplier model not available');
    }

    let createdCount = 0;
    for (const supplier of supplierData) {
      const existing = await Supplier.findOne({
        where: { name: supplier.name }
      });

      if (existing) {
        console.log(`✅ Supplier '${supplier.name}' already exists (skipping)`);
        continue;
      }

      await Supplier.create(supplier);
      console.log(`✅ Created supplier: ${supplier.name}`);
      createdCount++;
    }

    console.log(`✨ Supplier seeding completed (${createdCount} new suppliers)\n`);
    return true;
  } catch (error) {
    console.error('❌ Supplier seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedSuppliers };
