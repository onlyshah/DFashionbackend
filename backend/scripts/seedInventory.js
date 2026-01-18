/**
 * Inventory Seeder for PostgreSQL
 * Creates and populates: Warehouses, Products, Inventory, InventoryAlerts, InventoryHistory
 */

require('dotenv').config();
const { sequelize, Sequelize } = require('../config/sequelize');

// Import all models
const defineWarehouse = require('../models_sql/Warehouse');
const defineInventory = require('../models_sql/Inventory');
const defineInventoryAlert = require('../models_sql/InventoryAlert');
const defineInventoryHistory = require('../models_sql/InventoryHistory');
const defineProduct = require('../models_sql/Product');
const defineUser = require('../models_sql/User');

// Initialize models
const Warehouse = defineWarehouse(sequelize, Sequelize.DataTypes);
const Inventory = defineInventory(sequelize, Sequelize.DataTypes);
const InventoryAlert = defineInventoryAlert(sequelize, Sequelize.DataTypes);
const InventoryHistory = defineInventoryHistory(sequelize, Sequelize.DataTypes);
const Product = defineProduct(sequelize, Sequelize.DataTypes);
const User = defineUser(sequelize, Sequelize.DataTypes);

const seedInventory = async () => {
  try {
    console.log('🌱 Starting Inventory Seeding...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL');

    // Sync database (create tables if they don't exist)
    console.log('🔄 Syncing database tables...');
    await sequelize.sync({ alter: false });
    console.log('✅ Database tables synced');

    // Check if data already exists
    const warehouseCount = await Warehouse.count();
    if (warehouseCount > 0) {
      console.log('✅ Warehouse data already exists. Skipping seeding.');
      await sequelize.close();
      return;
    }

    // ====== SEED WAREHOUSES ======
    console.log('📦 Creating warehouses...');
    const warehouses = await Warehouse.bulkCreate([
      {
        name: 'Main Warehouse',
        location: 'New York',
        address: '123 Main St, New York, NY 10001',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        capacity: 10000,
        manager: 'John Smith',
        phone: '212-555-0100',
        email: 'john@warehouse.com',
        status: 'active'
      },
      {
        name: 'Secondary Warehouse',
        location: 'Los Angeles',
        address: '456 West Ave, Los Angeles, CA 90001',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
        country: 'USA',
        capacity: 8000,
        manager: 'Jane Doe',
        phone: '310-555-0200',
        email: 'jane@warehouse.com',
        status: 'active'
      },
      {
        name: 'Distribution Center',
        location: 'Chicago',
        address: '789 Center Blvd, Chicago, IL 60601',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        country: 'USA',
        capacity: 12000,
        manager: 'Mike Johnson',
        phone: '312-555-0300',
        email: 'mike@warehouse.com',
        status: 'active'
      }
    ]);
    console.log(`✅ Created ${warehouses.length} warehouses`);

    // ====== GET PRODUCTS ======
    console.log('📦 Fetching products for inventory...');
    const products = await Product.findAll({ 
      limit: 10,
      raw: true 
    });
    
    if (products.length === 0) {
      console.log('⚠️  No products found. Creating sample products...');
      // Create sample products if none exist
      await Product.bulkCreate([
        { name: 'T-Shirt', price: 29.99, stock: 100 },
        { name: 'Jeans', price: 79.99, stock: 50 },
        { name: 'Jacket', price: 149.99, stock: 30 }
      ]);
      const newProducts = await Product.findAll({ limit: 10, raw: true });
      products.push(...newProducts);
    }
    console.log(`✅ Found ${products.length} products for inventory`);

    // ====== SEED INVENTORY ======
    console.log('📊 Creating inventory records...');
    const inventoryData = [];
    for (let i = 0; i < products.length && i < 9; i++) {
      const product = products[i];
      const warehouseId = warehouses[i % warehouses.length].id;
      
      inventoryData.push({
        productId: product.id,
        warehouseId: warehouseId,
        sku: `SKU-${product.id}-${warehouseId}`,
        quantity: Math.floor(Math.random() * 500) + 10,
        minimumLevel: 10,
        maximumLevel: 1000,
        status: 'active',
        notes: `Stock at ${warehouses[i % warehouses.length].name}`,
        lastUpdated: new Date(),
        lastMovement: new Date()
      });
    }
    
    const inventories = await Inventory.bulkCreate(inventoryData);
    console.log(`✅ Created ${inventories.length} inventory records`);

    // ====== SEED INVENTORY ALERTS ======
    console.log('🚨 Creating inventory alerts...');
    const alertsData = [];
    
    // Create some low stock alerts
    for (let i = 0; i < Math.min(3, inventories.length); i++) {
      const inv = inventories[i];
      alertsData.push({
        type: 'warning',
        productId: inv.productId,
        warehouseId: inv.warehouseId,
        status: 'pending',
        message: `Low stock alert: ${inv.quantity} units remaining`,
        currentQuantity: inv.quantity,
        minimumLevel: inv.minimumLevel
      });
    }

    // Create some critical stock alerts
    if (inventories.length > 3) {
      alertsData.push({
        type: 'critical',
        productId: inventories[3].productId,
        warehouseId: inventories[3].warehouseId,
        status: 'pending',
        message: 'Critical: Stock below minimum level!',
        currentQuantity: 5,
        minimumLevel: 10
      });
    }

    // Create an info alert
    if (inventories.length > 4) {
      alertsData.push({
        type: 'info',
        productId: inventories[4].productId,
        warehouseId: inventories[4].warehouseId,
        status: 'pending',
        message: 'Stock replenishment scheduled',
        currentQuantity: inventories[4].quantity,
        minimumLevel: inventories[4].minimumLevel
      });
    }

    const alerts = await InventoryAlert.bulkCreate(alertsData);
    console.log(`✅ Created ${alerts.length} inventory alerts`);

    // ====== SEED INVENTORY HISTORY ======
    console.log('📜 Creating inventory history records...');
    
    // Get a user ID for the transactions
    const user = await User.findOne({ raw: true });
    if (!user) {
      console.log('⚠️  No users found. Creating a system user...');
      const newUser = await User.create({
        username: 'system',
        email: 'system@inventory.com',
        fullName: 'System User',
        password: 'system123'
      });
      user = newUser.toJSON();
    }

    const historyData = [];
    for (let i = 0; i < Math.min(10, inventories.length); i++) {
      const inv = inventories[i];
      const transactionTypes = ['in', 'out', 'adjustment', 'return'];
      const refTypes = ['Order', 'Purchase', 'Return'];
      
      for (let j = 0; j < 2; j++) {
        const typeIndex = (i + j) % transactionTypes.length;
        const refIndex = (i + j) % refTypes.length;
        
        historyData.push({
          transactionId: `TXN-${inv.id}-${j + 1}`,
          productId: inv.productId,
          type: transactionTypes[typeIndex],
          quantity: Math.floor(Math.random() * 50) + 1,
          warehouseId: inv.warehouseId,
          userId: user.id,
          referenceType: refTypes[refIndex],
          notes: `${transactionTypes[typeIndex]} transaction for SKU ${inv.sku}`,
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random date within last 7 days
        });
      }
    }

    const history = await InventoryHistory.bulkCreate(historyData);
    console.log(`✅ Created ${history.length} inventory history records`);

    console.log('✅ ✅ ✅ Inventory Seeding Completed Successfully! ✅ ✅ ✅');
    console.log('\n📊 Summary:');
    console.log(`  • Warehouses: ${warehouses.length}`);
    console.log(`  • Inventory Items: ${inventories.length}`);
    console.log(`  • Alerts: ${alerts.length}`);
    console.log(`  • History Records: ${history.length}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  }
};

// Run seeder
seedInventory();
