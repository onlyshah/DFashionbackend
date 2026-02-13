/**
 * Inventory Seeder (renamed to 48- inventory-seeder.js)
 * - Rebuilds inventory records for all products across warehouses
 * - Uses Sequelize models from `models_sql`
 * - Runs inside a transaction and is idempotent
 */

const models = require('../../../models_sql');

async function seedInventory() {
  const sequelize = await models.getSequelizeInstance();
  try {
    console.log('🌱 Starting Inventory seeding...');

    if (models.reinitializeModels) await models.reinitializeModels();

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

    // Use a single transaction for consistent batch insert
    const t = await sequelize.transaction();
    let createdCount = 0;

    try {
      for (const product of products) {
        for (const warehouse of warehouses) {
          // Check idempotency
          const existing = await Inventory.findOne({ where: { productId: product.id, warehouseId: warehouse.id } });
          if (existing) continue;

          const quantity = Math.floor(Math.random() * 500) + 10;
          const reorderLevel = Math.max(1, Math.floor(quantity * 0.15));

          await Inventory.create({
            productId: product.id,
            warehouseId: warehouse.id,
            quantity,
            reorderLevel,
            notes: `Initial stock for ${product.title || product.name} at ${warehouse.name}`
          }, { transaction: t });

          createdCount++;
        }
      }

      await t.commit();
      console.log(`✨ Inventory seeding completed (${createdCount} new records)\n`);
      return true;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (error) {
    console.error('❌ Inventory seeding failed:', error.message);
    throw error;
  }
}

// Allow running directly
if (require.main === module) {
  seedInventory().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { seedInventory };
