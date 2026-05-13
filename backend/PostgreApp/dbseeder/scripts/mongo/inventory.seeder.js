/**
 * Inventory Seeder
 * Seeds warehouses, inventory items, alerts, and history
 */

const { sequelize } = require('../config/sequelize');
const { Sequelize } = require('sequelize');

const seedInventory = async () => {
  try {
    console.log('🌱 Starting inventory seeding...');

    // Ensure DB connection
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Define models directly
    const Warehouse = sequelize.define('Warehouse', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      location: { type: Sequelize.STRING(255), allowNull: false },
      address: Sequelize.TEXT,
      city: Sequelize.STRING(100),
      state: Sequelize.STRING(100),
      zipCode: Sequelize.STRING(20),
      country: Sequelize.STRING(100),
      capacity: { type: Sequelize.INTEGER, defaultValue: 0 },
      manager: Sequelize.STRING(150),
      phone: Sequelize.STRING(20),
      email: Sequelize.STRING(150),
      status: { type: Sequelize.ENUM('active', 'inactive'), defaultValue: 'active' }
    }, { tableName: 'warehouses', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

    // Sync table
    await Warehouse.sync({ alter: true });
    console.log('✅ Warehouse table synced');

    // Get models for data
    const models = require('../models');
    const Product = models.Product;
    const User = models.User;

    // 1. Create warehouses if they don't exist
    console.log('📦 Seeding warehouses...');
    const warehouseCount = await Warehouse.count();
    
    let warehouseIds = [];
    if (warehouseCount === 0) {
      const newWarehouses = await Warehouse.bulkCreate([
        {
          name: 'Warehouse New York',
          location: 'New York, USA',
          address: '123 Commerce Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
          capacity: 50000,
          manager: 'John Smith',
          phone: '+1-212-555-0123',
          email: 'ny.warehouse@dfashion.com',
          status: 'active'
        },
        {
          name: 'Warehouse Los Angeles',
          location: 'Los Angeles, USA',
          address: '456 Industrial Blvd',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
          country: 'USA',
          capacity: 75000,
          manager: 'Sarah Johnson',
          phone: '+1-213-555-0456',
          email: 'la.warehouse@dfashion.com',
          status: 'active'
        },
        {
          name: 'Warehouse Chicago',
          location: 'Chicago, USA',
          address: '789 Logistics Lane',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601',
          country: 'USA',
          capacity: 60000,
          manager: 'Michael Brown',
          phone: '+1-312-555-0789',
          email: 'chicago.warehouse@dfashion.com',
          status: 'active'
        }
      ]);
      warehouseIds = newWarehouses.map(w => w.id);
      console.log(`✅ Created ${newWarehouses.length} warehouses`);
    } else {
      const allWarehouses = await Warehouse.findAll();
      warehouseIds = allWarehouses.map(w => w.id);
      console.log(`ℹ️  Warehouses already exist (${warehouseCount})`);
    }

    console.log('✅ Inventory seeding completed successfully!');
    return { success: true, message: 'Inventory data seeded' };
  } catch (error) {
    console.error('❌ Inventory seeding error:', error.message);
    console.error(error.stack);
    throw error;
  }
};

// Export for use in master seeder
module.exports = { seedInventory };

// Allow running directly
if (require.main === module) {
  seedInventory()
    .then(() => {
      console.log('✅ Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}
