/**
 * INVENTORY HISTORIES SEEDER
 * Seeds inventory movement history records
 */

const models = require('../../../models_sql');
const { v4: uuidv4 } = require('uuid');

async function seedInventoryHistories() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting InventoryHistory seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const InventoryHistory = models._raw?.InventoryHistory || models.InventoryHistory;
    const Inventory = models._raw?.Inventory || models.Inventory;
    const Product = models._raw?.Product || models.Product;
    const Warehouse = models._raw?.Warehouse || models.Warehouse;
    const User = models._raw?.User || models.User;

    if (!InventoryHistory || !InventoryHistory.create) throw new Error('InventoryHistory model not available');

    const products = await Product.findAll({ limit: 8 });
    const warehouses = await Warehouse.findAll({ limit: 2 });
    const users = await User.findAll({ limit: 3 });

    if (products.length === 0 || warehouses.length === 0 || users.length === 0) {
      console.log('⚠️  Skipping InventoryHistory seeding - missing products, warehouses, or users');
      return true;
    }

    const count = await InventoryHistory.count();
    if (count > 0) {
      console.log(`✅ InventoryHistory data already exists (${count} records)`);
      return true;
    }

    const histories = products.map((prod, idx) => ({
      id: uuidv4(),
      transactionId: 'TXN-' + Date.now() + '-' + idx,
      productId: prod.id,
      type: ['in', 'out', 'adjustment', 'receipt', 'sale', 'return'][idx % 6],
      quantity: Math.floor(Math.random() * 100) + 1,
      warehouseId: warehouses[idx % warehouses.length].id,
      userId: users[idx % users.length].id,
      notes: 'History record ' + (idx + 1)
    }));

    let createdCount = 0;
    for (const history of histories) {
      try {
        await InventoryHistory.create(history);
        createdCount++;
      } catch (err) {
        console.log(`⚠️  History creation skipped: ${err.message}`);
      }
    }

    console.log(`✨ InventoryHistory seeding completed (${createdCount} new histories)\n`);
    return true;
  } catch (error) {
    console.error('❌ InventoryHistory seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedInventoryHistories };
