/**
 * 📊 Inventory Seeder (Phase 3 - Tier 2)
 * Depends on: Product, Warehouse
 * Creates inventory stock levels for products in warehouses
 */

const models = require('../../../models_sql');

async function seedInventory() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Inventory seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Inventory = models._raw?.Inventory || models.Inventory;
    const Product = models._raw?.Product || models.Product;
    const Warehouse = models._raw?.Warehouse || models.Warehouse;

    if (!Inventory || !Inventory.create) throw new Error('Inventory model not available');
    if (!Product || !Product.findAll) throw new Error('Product model not available');
    if (!Warehouse || !Warehouse.findAll) throw new Error('Warehouse model not available');

    // Get all products and warehouses
    const products = await Product.findAll();
    const warehouses = await Warehouse.findAll();

    if (products.length === 0 || warehouses.length === 0) {
      throw new Error('No products or warehouses found. Ensure seeding ran in correct order.');
    }

    console.log(`Found ${products.length} products and ${warehouses.length} warehouses`);

    let createdCount = 0;

    // Create inventory for each product in each warehouse
    for (const product of products) {
      for (const warehouse of warehouses) {
        const existing = await Inventory.findOne({
          where: { productId: product.id, warehouseId: warehouse.id }
        });

        if (existing) {
          console.log(`✅ Inventory for product ${product.id} in warehouse ${warehouse.id} already exists (skipping)`);
          continue;
        }

        const quantity = Math.floor(Math.random() * 500) + 10;
        const minimumLevel = Math.floor(quantity * 0.2);
        const sku = `SKU-${product.id.substring(0, 8)}-${warehouse.id.substring(0, 8)}`;

        await Inventory.create({
          productId: product.id,
          warehouseId: warehouse.id,
          sku: sku,
          quantity: quantity,
          minimumLevel: minimumLevel,
          status: 'active',
          notes: `Initial stock for ${product.title} at ${warehouse.name}`
        });

        console.log(`✅ Created inventory: ${product.title} -> ${warehouse.name} (Qty: ${quantity})`);
        createdCount++;
      }
    }

    console.log(`✨ Inventory seeding completed (${createdCount} new inventory records)\n`);
    return true;
  } catch (error) {
    console.error('❌ Inventory seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedInventory };
