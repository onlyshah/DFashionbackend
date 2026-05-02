#!/usr/bin/env node
/**
 * 🔍 Database Check & Auto-Seed Script
 * Verifies if data exists, runs seeders if needed
 */

require('dotenv').config();
const path = require('path');
const models = require('../models_sql');

const logger = {
  info: (msg) => console.log(`\n📋 ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  warn: (msg) => console.warn(`⚠️  ${msg}`)
};

async function checkData() {
  try {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🔍 CHECKING DATABASE DATA');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // Connect to database
    logger.info('Connecting to PostgreSQL...');
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');
    logger.success('Connected to PostgreSQL');

    // Reinitialize models
    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Category = models._raw?.Category || models.Category;
    const Brand = models._raw?.Brand || models.Brand;
    const Product = models._raw?.Product || models.Product;
    const User = models._raw?.User || models.User;

    // Check data counts
    const categoryCount = await Category.count();
    const brandCount = await Brand.count();
    const productCount = await Product.count();
    const userCount = await User.count();

    logger.info(`Data Summary:`);
    console.log(`  Categories: ${categoryCount}`);
    console.log(`  Brands: ${brandCount}`);
    console.log(`  Products: ${productCount}`);
    console.log(`  Users: ${userCount}`);

    // Determine what needs seeding
    const needsSeeding = {
      categories: categoryCount === 0,
      brands: brandCount === 0,
      products: productCount === 0,
      users: userCount === 0
    };

    const hasIssues = Object.values(needsSeeding).some(v => v);

    if (!hasIssues) {
      logger.success('✨ All data looks good! No seeding needed.');
      process.exit(0);
    }

    logger.warn('\n⚠️  Missing data detected:');
    if (needsSeeding.users) console.log('   - Users');
    if (needsSeeding.categories) console.log('   - Categories');
    if (needsSeeding.brands) console.log('   - Brands');
    if (needsSeeding.products) console.log('   - Products');

    logger.info('\n✨ To populate the database, run:');
    console.log('   npm run seed:postgres\n');

    process.exit(needsSeeding.products ? 1 : 0);
  } catch (error) {
    logger.error(`Check failed: ${error.message}`);
    process.exit(1);
  }
}

checkData();
