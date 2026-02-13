/**
 * PRODUCT SHARES SEEDER
 * Seeds product sharing events
 */

const models = require('../../../models_sql');
const { v4: uuidv4 } = require('uuid');

async function seedProductShares() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting ProductShare seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const ProductShare = models._raw?.ProductShare || models.ProductShare;
    const Product = models._raw?.Product || models.Product;
    const User = models._raw?.User || models.User;

    if (!ProductShare || !ProductShare.create) throw new Error('ProductShare model not available');

    const products = await Product.findAll({ limit: 5 });
    const users = await User.findAll({ limit: 4 });

    if (products.length === 0 || users.length === 0) {
      console.log('⚠️  Skipping ProductShare seeding - missing products or users');
      return true;
    }

    const count = await ProductShare.count();
    if (count > 0) {
      console.log(`✅ ProductShare data already exists (${count} records)`);
      return true;
    }

    const shares = [];
    products.forEach((prod, idx) => {
      shares.push({
        id: uuidv4(),
        productId: prod.id,
        userId: users[idx % users.length].id,
        platform: ['whatsapp', 'facebook', 'instagram', 'email'][idx % 4],
        sharedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        clickCount: Math.floor(Math.random() * 50)
      });
    });

    let createdCount = 0;
    for (const share of shares) {
      try {
        await ProductShare.create(share);
        createdCount++;
      } catch (err) {
        console.log(`⚠️  Share creation skipped: ${err.message}`);
      }
    }

    console.log(`✨ ProductShare seeding completed (${createdCount} new shares)\n`);
    return true;
  } catch (error) {
    console.error('❌ ProductShare seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedProductShares };
