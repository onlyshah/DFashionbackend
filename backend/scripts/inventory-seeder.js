const { Sequelize } = require('sequelize');
require('dotenv').config();

const DB_NAME = process.env.PGDATABASE || 'dfashion';
const DB_USER = process.env.PGUSER || 'postgres';
const DB_PASS = process.env.PGPASSWORD || '1234';
const DB_HOST = process.env.PGHOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.PGPORT || '5432', 10);

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: false
});

// Import all models
const defineInventory = require('../models_sql/Inventory');
const defineInventoryAlert = require('../models_sql/InventoryAlert');
const defineInventoryHistory = require('../models_sql/InventoryHistory');
const defineProduct = require('../models_sql/Product');
const defineWarehouse = require('../models_sql/Warehouse');
const defineUser = require('../models_sql/User');

const Inventory = defineInventory(sequelize, Sequelize.DataTypes);
const InventoryAlert = defineInventoryAlert(sequelize, Sequelize.DataTypes);
const InventoryHistory = defineInventoryHistory(sequelize, Sequelize.DataTypes);
const Product = defineProduct(sequelize, Sequelize.DataTypes);
const Warehouse = defineWarehouse(sequelize, Sequelize.DataTypes);
const User = defineUser(sequelize, Sequelize.DataTypes);

async function seedInventoryData() {
  try {
    console.log('🌱 Starting inventory seeding...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Drop and recreate tables to ensure correct schema
    console.log('🔄 Dropping inventory tables...');
    try {
      await sequelize.query('DROP TABLE IF EXISTS "inventory_histories" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "inventory_alerts" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "inventories" CASCADE;');
    } catch (e) {
      // Tables might not exist
    }

    // Sync tables
    await sequelize.sync({ alter: true });
    console.log('✅ Tables synced\n');

    // Get products, warehouses, and users
    const products = await Product.findAll({ limit: 10 });
    const warehouses = await Warehouse.findAll();
    const users = await User.findAll({ limit: 5 });

    if (!products.length) {
      console.log('❌ No products found! Please run PostgreMaster seeder first.');
      process.exit(1);
    }

    if (!warehouses.length) {
      console.log('❌ No warehouses found! Please run PostgreMaster seeder first.');
      process.exit(1);
    }

    // Clear existing data
    console.log('🧹 Clearing existing inventory data...');
    await InventoryHistory.destroy({ where: {} });
    await InventoryAlert.destroy({ where: {} });
    await Inventory.destroy({ where: {} });

    // 1. Seed Inventory (stock levels)
    console.log('📦 Creating inventory items...');
    const inventoryItems = [];
    for (const product of products) {
      for (const warehouse of warehouses) {
        const quantity = Math.floor(Math.random() * 500) + 10;
        const minimumLevel = 10;
        
        inventoryItems.push({
          productId: product.id,
          warehouseId: warehouse.id,
          quantity,
          minimumLevel,
          maximumLevel: 1000,
          sku: `SKU-${product.id}-${warehouse.id}`,
          status: 'active',
          lastUpdated: new Date()
        });
      }
    }

    const createdInventory = await Inventory.bulkCreate(inventoryItems);
    console.log(`✅ Created ${createdInventory.length} inventory items\n`);

    // 2. Seed InventoryAlerts
    console.log('🚨 Creating inventory alerts...');
    const alertsCreated = [];
    const alertTypes = ['critical', 'warning', 'info'];
    
    for (let i = 0; i < 15; i++) {
      const randomInventory = createdInventory[Math.floor(Math.random() * createdInventory.length)];
      const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      
      alertsCreated.push({
        inventoryId: randomInventory.id,
        productId: randomInventory.productId,
        warehouseId: randomInventory.warehouseId,
        type: alertType,
        status: i < 10 ? 'pending' : 'acknowledged',
        message: `${alertType.toUpperCase()}: Stock level for product ${randomInventory.productId} in warehouse ${randomInventory.warehouseId} is ${randomInventory.quantity} units`,
        acknowledgedBy: i < 10 ? null : users[0]?.id,
        acknowledgedAt: i < 10 ? null : new Date(),
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
    }

    const createdAlerts = await InventoryAlert.bulkCreate(alertsCreated);
    console.log(`✅ Created ${createdAlerts.length} inventory alerts\n`);

    // 3. Seed InventoryHistory
    console.log('📝 Creating inventory history records...');
    const transactionTypes = ['in', 'out', 'adjustment', 'return', 'damage'];
    const historyRecords = [];

    for (let i = 0; i < 50; i++) {
      const randomInventory = createdInventory[Math.floor(Math.random() * createdInventory.length)];
      const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
      const quantity = Math.floor(Math.random() * 100) + 5;
      const daysAgo = Math.floor(Math.random() * 30);

      historyRecords.push({
        transactionId: `TXN-${Date.now()}-${i}`,
        productId: randomInventory.productId,
        type,
        quantity: type === 'out' || type === 'damage' ? -quantity : quantity,
        warehouseId: randomInventory.warehouseId,
        reference: Math.floor(Math.random() * 10000),
        referenceType: type === 'in' ? 'Purchase' : type === 'out' ? 'Order' : 'Return',
        userId: users[Math.floor(Math.random() * users.length)]?.id,
        notes: `${type} transaction - ${quantity} units`,
        timestamp: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      });
    }

    const createdHistory = await InventoryHistory.bulkCreate(historyRecords);
    console.log(`✅ Created ${createdHistory.length} inventory history records\n`);

    // Summary
    console.log('═'.repeat(50));
    console.log('✅ INVENTORY SEEDING COMPLETE!');
    console.log('═'.repeat(50));
    console.log(`📊 Summary:`);
    console.log(`  📦 Inventory items: ${createdInventory.length}`);
    console.log(`  🚨 Alerts: ${createdAlerts.length}`);
    console.log(`  📝 History records: ${createdHistory.length}`);
    console.log(`  ✨ Total records: ${createdInventory.length + createdAlerts.length + createdHistory.length}`);
    console.log('═'.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

seedInventoryData();
