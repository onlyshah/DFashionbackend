/**
 * INVENTORY ALERTS SEEDER
 * Seeds critical and warning stock alerts
 */

const models = require('../../../models_sql');
const { v4: uuidv4 } = require('uuid');

async function seedInventoryAlerts() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting InventoryAlert seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const InventoryAlert = models._raw?.InventoryAlert || models.InventoryAlert;
    const Product = models._raw?.Product || models.Product;
    const Warehouse = models._raw?.Warehouse || models.Warehouse;

    if (!InventoryAlert || !InventoryAlert.create) throw new Error('InventoryAlert model not available');

    // Get products and warehouses
    const products = await Product.findAll({ limit: 5 });
    const warehouses = await Warehouse.findAll({ limit: 2 });

    if (products.length === 0 || warehouses.length === 0) {
      console.log('⚠️  Skipping InventoryAlert seeding - missing products or warehouses');
      return true;
    }

    const count = await InventoryAlert.count();
    if (count > 0) {
      console.log(`✅ InventoryAlert data already exists (${count} records)`);
      return true;
    }

    const alerts = [];
    const types = ['critical', 'warning', 'info'];
    const statuses = ['pending', 'acknowledged', 'resolved'];

    products.forEach((product, idx) => {
      alerts.push({
        id: uuidv4(),
        type: types[idx % types.length],
        productId: product.id,
        warehouseId: warehouses[0].id,
        status: statuses[idx % statuses.length],
        message: `Stock alert for ${product.name || 'Product ' + idx}`,
        currentQuantity: Math.floor(Math.random() * 20),
        minimumLevel: 10
      });

      if (idx < products.length - 1) {
        alerts.push({
          id: uuidv4(),
          type: 'warning',
          productId: product.id,
          warehouseId: warehouses[1 % warehouses.length].id,
          status: 'pending',
          message: `Low stock warning for ${product.name || 'Product ' + idx}`,
          currentQuantity: Math.floor(Math.random() * 15),
          minimumLevel: 5
        });
      }
    });

    let createdCount = 0;
    for (const alert of alerts) {
      try {
        await InventoryAlert.create(alert);
        createdCount++;
      } catch (err) {
        console.log(`⚠️  Alert creation skipped: ${err.message}`);
      }
    }

    console.log(`✨ InventoryAlert seeding completed (${createdCount} new alerts)\n`);
    return true;
  } catch (error) {
    console.error('❌ InventoryAlert seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedInventoryAlerts };
