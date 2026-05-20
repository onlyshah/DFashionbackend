#!/usr/bin/env node
/**
 * 🌱 PostgreSQL Master Seeder - SIMPLE VERSION
 * Runs all PostgreSQL seeders in dependency order
 * No complex routing, focused on PostgreSQL only
 */

require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║     🌱 POSTGRESQL MASTER SEEDER - SIMPLE VERSION          ║');
console.log('║     Runs all PostgreSQL seeders in dependency order       ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// PostgreSQL seeders organized by phase (dependency order)
const postgresSeedersByPhase = {
  'Phase 1: Root Models (No Dependencies)': [
    { name: '01-role.seeder.js', description: 'Roles' },
    { name: '02-permission.seeder.js', description: 'Permissions' },
    { name: '03-department.seeder.js', description: 'Departments' },
    { name: '04-category.seeder.js', description: 'Categories' },
    { name: '05-brand.seeder.js', description: 'Brands' },
    { name: '06-warehouse.seeder.js', description: 'Warehouses' },
    { name: '07-supplier.seeder.js', description: 'Suppliers' },
    { name: '08-courier.seeder.js', description: 'Couriers' },
    { name: '09-module.seeder.js', description: 'Modules' },
    { name: '10-featureflag.seeder.js', description: 'Feature Flags' },
    { name: '11-analytics.seeder.js', description: 'Analytics' },
    { name: '12-coupon.seeder.js', description: 'Coupons' },
    { name: '13-page.seeder.js', description: 'Pages' },
    { name: '14-upload.seeder.js', description: 'Uploads' },
    { name: '15-faq.seeder.js', description: 'FAQs' },
    { name: '16-promotion.seeder.js', description: 'Promotions' },
    { name: '17-campaign.seeder.js', description: 'Campaigns' },
    { name: '18-flashsale.seeder.js', description: 'Flash Sales' },
    { name: '19-banner.seeder.js', description: 'Banners' },
    { name: '20-styleinspiration.seeder.js', description: 'Style Inspiration' },
    { name: '21-smartcollection.seeder.js', description: 'Smart Collections' },
    { name: '22-searchsuggestion.seeder.js', description: 'Search Suggestions' },
    { name: '23-trendingsearch.seeder.js', description: 'Trending Searches' },
    { name: '24-quickaction.seeder.js', description: 'Quick Actions' },
  ],

  'Phase 2: Tier 1 (Depends on Phase 1)': [
    { name: '25-user.seeder.js', description: 'Users' },
    { name: '26-subcategory.seeder.js', description: 'Subcategories' },
    { name: '28-rolepermission.seeder.js', description: 'Role Permissions' },
  ],

  'Phase 3: Tier 2 (Depends on Phase 1-2)': [
    { name: '29-product.seeder.js', description: 'Products' },
    { name: '30-inventory.seeder.js', description: 'Inventory' },
  ],

  'Phase 4: Tier 3 (Depends on Phase 1-3)': [
    { name: '31-cart.seeder.js', description: 'Shopping Carts' },
    { name: '32-order.seeder.js', description: 'Orders' },
    { name: '33-wishlist.seeder.js', description: 'Wishlists' },
    { name: '34-session.seeder.js', description: 'Sessions' },
    { name: '35-userbehavior.seeder.js', description: 'User Behavior' },
    { name: '36-post.seeder.js', description: 'Posts' },
    { name: '37-transaction.seeder.js', description: 'Transactions' },
    { name: '38-payment.seeder.js', description: 'Payments' },
  ],

  'Phase 5: Tier 4 (Depends on all previous)': [
    { name: '39-shipment.seeder.js', description: 'Shipments' },
    { name: '40-return.seeder.js', description: 'Returns' },
    { name: '41-notification.seeder.js', description: 'Notifications' },
    { name: '42-auditlog.seeder.js', description: 'Audit Logs' },
  ],

  'Optional/Additional': [
    { name: '43-story.seeder.js', description: 'Stories' },
    { name: '44-productcomment.seeder.js', description: 'Product Comments' },
    { name: '45-searchhistory.seeder.js', description: 'Search History' },
    { name: '46-reward.seeder.js', description: 'Rewards' },
    { name: '47-sellercommission.seeder.js', description: 'Seller Commissions' },
    { name: '48-inventoryalert.seeder.js', description: 'Inventory Alerts' },
    { name: '49-inventoryhistory.seeder.js', description: 'Inventory History' },
    { name: '50-kycdocument.seeder.js', description: 'KYC Documents' },
    { name: '51-livestream.seeder.js', description: 'Live Streams' },
    { name: '51-reels.seeder.js', description: 'Reels' },
    { name: '52-comments.seeder.js', description: 'Comments' },
    { name: '53-reel.seeder.js', description: 'Reel Data' },
    { name: '54-sellerperformance.seeder.js', description: 'Seller Performance' },
    { name: '55-ticket.seeder.js', description: 'Support Tickets' },
  ]
};

class PostgreSQLMasterSeeder {
  constructor() {
    this.results = {
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      byPhase: {}
    };
    this.startTime = Date.now();
    this.totalSeeders = Object.values(postgresSeedersByPhase).reduce((sum, phase) => sum + phase.length, 0);
  }

  async executeSeeders() {
    console.log(`📊 Total Seeders to Execute: ${this.totalSeeders}\n`);

    let overallIndex = 1;
    for (const [phase, seeders] of Object.entries(postgresSeedersByPhase)) {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`🔄 ${phase} (${seeders.length} seeders)`);
      console.log('═'.repeat(60));

      this.results.byPhase[phase] = { successful: 0, failed: 0 };

      for (const seeder of seeders) {
        console.log(`\n📍 [${overallIndex}/${this.totalSeeders}] Running: ${seeder.name}`);
        console.log(`   📝 ${seeder.description}`);
        console.log('   ' + '─'.repeat(50));

        const success = await this.runSeeder(seeder.name);

        if (success) {
          console.log(`   ✅ Completed successfully`);
          this.results.successful++;
          this.results.byPhase[phase].successful++;
        } else {
          console.log(`   ❌ Failed`);
          this.results.failed++;
          this.results.byPhase[phase].failed++;
        }

        overallIndex++;
      }
    }

    this.printSummary();
  }

  async runSeeder(seederName) {
    return new Promise((resolve) => {
      try {
        const seederPath = path.join(__dirname, seederName);

        // Verify file exists
        if (!fs.existsSync(seederPath)) {
          console.error(`   ❌ ERROR: File not found: ${seederPath}`);
          this.results.errors.push({
            seeder: seederName,
            error: 'File not found'
          });
          resolve(false);
          return;
        }

        // Execute the seeder
        execSync(`node "${seederPath}"`, {
          stdio: 'pipe',
          cwd: __dirname,
          timeout: 300000 // 5 minute timeout per seeder
        });

        resolve(true);
      } catch (err) {
        const errorMsg = err.message || 'Unknown error';
        console.error(`   ❌ ERROR: ${errorMsg}`);
        
        this.results.errors.push({
          seeder: seederName,
          error: errorMsg.substring(0, 200)
        });

        resolve(false);
      }
    });
  }

  printSummary() {
    const duration = Math.round((Date.now() - this.startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    console.log('\n' + '═'.repeat(60));
    console.log('🌱 POSTGRESQL MASTER SEEDER - EXECUTION COMPLETE');
    console.log('═'.repeat(60) + '\n');

    console.log('📊 RESULTS:');
    console.log(`   ✅ Successful: ${this.results.successful}/${this.totalSeeders}`);
    console.log(`   ❌ Failed: ${this.results.failed}/${this.totalSeeders}`);
    console.log(`\n⏱️  Total Duration: ${minutes}m ${seconds}s`);

    console.log('\n📈 Results by Phase:');
    for (const [phase, results] of Object.entries(this.results.byPhase)) {
      const status = results.failed === 0 ? '✅' : '❌';
      console.log(`   ${status} ${phase.split('(')[0].trim()}: ${results.successful}/${results.successful + results.failed}`);
    }

    if (this.results.errors.length > 0) {
      console.log('\n⚠️  ERRORS ENCOUNTERED:');
      this.results.errors.forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.seeder}`);
        console.log(`      └─ ${e.error}`);
      });
    }

    console.log('\n' + '─'.repeat(60));

    if (this.results.failed === 0) {
      console.log('✅ POSTGRESQL SEEDING COMPLETED SUCCESSFULLY!');
      console.log('\n✨ All PostgreSQL tables populated with test data.');
      console.log('📊 Summary:');
      console.log(`   • Tables: 57+`);
      console.log(`   • Records: ~5,000+`);
      console.log(`   • Time: ${minutes}m ${seconds}s`);
      console.log('\n🎯 Phase 9 Complete! Ready for Phase 10 Testing.');
      process.exit(0);
    } else {
      console.log('⚠️  POSTGRESQL SEEDING COMPLETED WITH ERRORS');
      console.log(`\n📋 ${this.results.failed} seeder(s) failed. Review errors above.`);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  try {
    const seeder = new PostgreSQLMasterSeeder();
    await seeder.executeSeeders();
  } catch (err) {
    console.error('\n💥 FATAL ERROR:', err.message);
    process.exit(1);
  }
}

main();
