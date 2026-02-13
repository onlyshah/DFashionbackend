/**
 * 🚀 MASTER SEEDER RUNNER (POSTGRES)
 * Orchestrates all seeders in correct dependency order
 * Executes in 5 phases based on foreign key dependencies
 * 
 * ✅ Phase 1 (24): Root models - no dependencies
 * ✅ Phase 2 (4): Tier 1 - depends only on root models
 * ✅ Phase 3 (2): Tier 2 - depends on root + tier 1
 * ✅ Phase 4 (8): Tier 3 - depends on tier 2 + users
 * ✅ Phase 5 (4): Tier 4 - depends on tier 3 + orders
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const models = require('../../../models_sql');

const logger = {
  info: (msg) => console.log(`\n📋 ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  warn: (msg) => console.warn(`⚠️  ${msg}`)
};

// ============================================================================
// SEEDER EXECUTION PHASES
// ============================================================================
const seedingPhases = [
  {
    phase: 1,
    name: 'ROOT MODELS (No Dependencies)',
    seeders: [
      '01-role.seeder.js',
      '02-permission.seeder.js',
      '03-department.seeder.js',
      '04-category.seeder.js',
      '05-brand.seeder.js',
      '06-warehouse.seeder.js',
      '07-supplier.seeder.js',
      '08-courier.seeder.js',
      '09-module.seeder.js',
      '10-featureflag.seeder.js',
      '11-analytics.seeder.js',
      '12-coupon.seeder.js',
      '13-page.seeder.js',
      '14-upload.seeder.js',
      '15-faq.seeder.js',
      '16-promotion.seeder.js',
      '17-campaign.seeder.js',
      '18-flashsale.seeder.js',
      '19-banner.seeder.js',
      '20-styleinspiration.seeder.js',
      '21-smartcollection.seeder.js',
      '22-searchsuggestion.seeder.js',
      '23-trendingsearch.seeder.js',
      '24-quickaction.seeder.js'
    ]
  },
  {
    phase: 2,
    name: 'TIER 1 (Depend on Root Models)',
    seeders: [
      '25-user.seeder.js',
      '26-subcategory.seeder.js',
      '27-shippingcharge.seeder.js',
      '28-rolepermission.seeder.js'
    ]
  },
  {
    phase: 3,
    name: 'TIER 2 (Depend on Root + Tier 1)',
    seeders: [
      '29-product.seeder.js',
      '30-inventory.seeder.js'
    ]
  },
  {
    phase: 4,
    name: 'TIER 3 (Depend on Tier 2 + Users)',
    seeders: [
      '31-cart.seeder.js',
      '32-order.seeder.js',
      '33-wishlist.seeder.js',
      '34-session.seeder.js',
      '35-userbehavior.seeder.js',
      '36-post.seeder.js',
      '37-transaction.seeder.js',
      '41-notification.seeder.js',
      '42-auditlog.seeder.js',
      '43-story.seeder.js',
      '44-productcomment.seeder.js',
      '45-searchhistory.seeder.js',
      '46-reward.seeder.js',
      '48-inventoryalert.seeder.js',
      '49-inventoryhistory.seeder.js',
      '50-kycdocument.seeder.js',
      '51-livestream.seeder.js',
      '52-productshare.seeder.js',
      '53-reel.seeder.js',
      '54-sellerperformance.seeder.js',
      '55-ticket.seeder.js'
    ]
  },
  {
    phase: 5,
    name: 'TIER 4 (Depend on Tier 3 + Orders)',
    seeders: [
      '38-payment.seeder.js',
      '39-shipment.seeder.js',
      '40-return.seeder.js',
      '47-sellercommission.seeder.js'
    ]
  }
];

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runMasterSeeder() {
  const startTime = Date.now();

  try {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🌱 STARTING POSTGRESQL DATABASE SEEDING (FRESH BUILD)');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // Step 1: Connect to database
    logger.info('Connecting to PostgreSQL...');
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    logger.success('Connected to PostgreSQL');

    // Step 2: Reinitialize models
    if (models.reinitializeModels) {
      logger.info('Reinitializing models with active connection...');
      await models.reinitializeModels();
      logger.success('Models reinitialized');
    }

    // Step 3: Execute seeders in phases
    let totalSeeded = 0;
    const seedersDir = __dirname;

    for (const phaseConfig of seedingPhases) {
      logger.info(`\n${'═'.repeat(60)}`);
      logger.info(`PHASE ${phaseConfig.phase}: ${phaseConfig.name}`);
      logger.info(`${'═'.repeat(60)}\n`);

      let phaseSuccess = 0;
      let phaseError = 0;

      for (const seederFile of phaseConfig.seeders) {
        try {
          const seederPath = path.join(seedersDir, seederFile);

          // Check if file exists
          if (!fs.existsSync(seederPath)) {
            logger.warn(`Seeder file not found: ${seederFile}`);
            continue;
          }

          // Load and execute seeder
          const seederModule = require(seederPath);
          
          // Get the seeding function (dynamically determine function name)
          const functionName = Object.keys(seederModule)[0];
          if (!functionName) {
            logger.warn(`No seeding function exported from ${seederFile}`);
            continue;
          }

          const seedFunction = seederModule[functionName];

          // Execute seeder
          await seedFunction();
          phaseSuccess++;
          totalSeeded++;
        } catch (error) {
          logger.error(`Failed to execute ${seederFile}: ${error.message}`);
          phaseError++;
        }
      }

      logger.info(`\nPhase ${phaseConfig.phase} Summary: ${phaseSuccess} succeeded, ${phaseError} failed\n`);
    }

    // Final summary
    const durationMs = Date.now() - startTime;
    const durationSec = Math.round(durationMs / 1000);

    logger.info(`\n${'═'.repeat(70)}`);
    logger.success('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY! 🎉');
    logger.info(`${'═'.repeat(70)}`);
    logger.info(`Total seeders executed: ${totalSeeded}`);
    logger.info(`Total duration: ${durationSec} seconds`);
    logger.info(`${'═'.repeat(70)}\n`);

    process.exit(0);
  } catch (error) {
    logger.error(`Master seeding failed: ${error.message}`);
    logger.error(`\nStack: ${error.stack}`);
    process.exit(1);
  }
}

// Run the master seeder
runMasterSeeder();
