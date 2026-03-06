/**
 * 📊 Inventory Seeder (merged, transaction + idempotency)
 * Depends on: Product, Warehouse
 * Creates inventory stock levels for products in warehouses
 * Combines previous 30- and 48‑version logic.
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

    const products = await Product.findAll({ raw: true });
    const warehouses = await Warehouse.findAll({ raw: true });

    if (!products.length) {
      console.log('⚠️  No products found — skipping inventory creation');
      return true;
    }
    if (!warehouses.length) {
      console.log('⚠️  No warehouses found — skipping inventory creation');
      return true;
    }

    // use a transaction for consistency
    const t = await sequelize.transaction();
    let createdCount = 0;

    try {
      for (const product of products) {
        for (const warehouse of warehouses) {
          // idempotency check
          const existing = await Inventory.findOne({ where: { productId: product.id, warehouseId: warehouse.id } });
          if (existing) {
            console.log(`✅ Inventory for product ${product.id} in warehouse ${warehouse.id} already exists (skipping)`);
            continue;
          }

          const quantity = Math.floor(Math.random() * 500) + 10;
          const minimumLevel = Math.floor(quantity * 0.2);
          const reorderLevel = Math.max(1, Math.floor(quantity * 0.15));
          const sku = `SKU-${product.id.substring(0, 8)}-${warehouse.id.substring(0, 8)}`;

          await Inventory.create({
            productId: product.id,
            warehouseId: warehouse.id,
            sku,
            quantity,
            minimumLevel,
            reorderLevel,
            status: 'active',
            notes: `Initial stock for ${product.title || product.name} at ${warehouse.name}`
          }, { transaction: t });

          console.log(`✅ Created inventory: ${product.title || product.name} -> ${warehouse.name} (Qty: ${quantity})`);
          createdCount++;
        }
      }

      await t.commit();
      console.log(`✨ Inventory seeding completed (${createdCount} new inventory records)\n`);
      return true;
    } catch (innerErr) {
      await t.rollback();
      throw innerErr;
    }
  } catch (error) {
    console.error('❌ Inventory seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedInventory };
