#!/usr/bin/env node
/**
 * 🌱 MongoDB Master Seeder - SIMPLE VERSION
 * Runs all MongoDB seeders in dependency order
 * No complex routing, no PostgreSQL logic, focused on MongoDB only
 */

require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║     🌱 MONGODB MASTER SEEDER - SIMPLE VERSION             ║');
console.log('║     Runs all MongoDB seeders in dependency order          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// MongoDB seeders in dependency order
const mongoSeeders = [
  // 1. System initialization
  { name: 'bootstrap.seeder.js', description: 'Bootstrap: superadmin, core module, base role' },
  
  // 2. Core system and security
  { name: 'permission-management.seeder.js', description: 'Permissions configuration' },
  { name: 'module.seeder.js', description: 'System modules' },
  { name: 'role.seeder.js', description: 'User roles' },
  { name: 'role-permission.seeder.js', description: 'Role-permission mappings' },
  
  // 3. User management
  { name: 'user.seeder.js', description: 'All user types' },
  { name: 'session.seeder.js', description: 'User sessions' },
  { name: 'sellers.seeder.js', description: 'Vendor/seller profiles' },
  
  // 4. Content management
  { name: 'category.seeder.js', description: 'Product categories' },
  { name: 'product.seeder.js', description: 'Products catalog' },
  { name: 'productComment.seeder.js', description: 'Product comments/reviews' },
  { name: 'productShare.seeder.js', description: 'Product sharing data' },
  { name: 'post.seeder.js', description: 'User posts' },
  { name: 'story.seeder.js', description: 'User stories' },
  { name: 'reel.seeder.js', description: 'Video reels' },
  { name: 'styleInspiration.seeder.js', description: 'Style guides' },
  
  // 5. E-commerce core
  { name: 'cart.seeder.js', description: 'Shopping carts' },
  { name: 'wishlist.seeder.js', description: 'User wishlists' },
  { name: 'order.seeder.js', description: 'Purchase orders' },
  { name: 'payment.seeder.js', description: 'Payment records' },
  
  // 6. Returns management
  { name: 'returns.seeder.js', description: 'Return records with refund data' },
  
  // 7. Logistics and shipping
  { name: 'logistics.seeder.js', description: 'Couriers, shipments, shipping charges' },
  
  // 8. Promotions and marketing
  { name: 'promotions.seeder.js', description: 'Coupons, flash sales, campaigns' },
  { name: 'livestream.seeder.js', description: 'Live commerce streams' },
  { name: 'marketing.seeder.js', description: 'Marketing campaigns' },
  
  // 9. CMS content
  { name: 'cms.seeder.js', description: 'Pages, banners, FAQs' },
  
  // 10. KYC and compliance
  { name: 'kycDocument.seeder.js', description: 'KYC document records for sellers' },
  
  // 11. Engagement and gamification
  { name: 'reward.seeder.js', description: 'User rewards' },
  { name: 'notification.seeder.js', description: 'System notifications' },
  
  // 12. Search and discovery
  { name: 'searchHistory.seeder.js', description: 'User search history' },
  { name: 'searchSuggestion.seeder.js', description: 'Search suggestions' },
  { name: 'trendingSearch.seeder.js', description: 'Trending searches' },
  
  // 13. Analytics and tracking
  { name: 'userBehavior.seeder.js', description: 'User behavior analytics' },
];

class MongoDBMasterSeeder {
  constructor() {
    this.results = {
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    this.startTime = Date.now();
  }

  async executeSeeders() {
    console.log(`📊 Total Seeders to Execute: ${mongoSeeders.length}\n`);
    console.log('Seeding order:');
    mongoSeeders.forEach((s, i) => {
      console.log(`  ${String(i + 1).padStart(2)}. ${s.name.padEnd(35)} - ${s.description}`);
    });
    console.log('\n' + '─'.repeat(60) + '\n');

    for (let i = 0; i < mongoSeeders.length; i++) {
      const seeder = mongoSeeders[i];
      console.log(`\n📍 [${i + 1}/${mongoSeeders.length}] Running: ${seeder.name}`);
      console.log(`   📝 ${seeder.description}`);
      console.log('   ' + '─'.repeat(50));

      const success = await this.runSeeder(seeder.name);

      if (success) {
        console.log(`   ✅ Completed successfully\n`);
        this.results.successful++;
      } else {
        console.log(`   ❌ Failed\n`);
        this.results.failed++;
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

        // Execute the seeder from mongo/ directory
        // Seeders now have correct relative paths (../../models/)
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
    console.log('🌱 MONGODB MASTER SEEDER - EXECUTION COMPLETE');
    console.log('═'.repeat(60) + '\n');

    console.log('📊 RESULTS:');
    console.log(`   ✅ Successful: ${this.results.successful}/${mongoSeeders.length}`);
    console.log(`   ❌ Failed: ${this.results.failed}/${mongoSeeders.length}`);
    console.log(`   ⏭️  Skipped: ${this.results.skipped}/${mongoSeeders.length}`);
    console.log(`\n⏱️  Total Duration: ${minutes}m ${seconds}s`);

    if (this.results.errors.length > 0) {
      console.log('\n⚠️  ERRORS ENCOUNTERED:');
      this.results.errors.forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.seeder}`);
        console.log(`      └─ ${e.error}`);
      });
    }

    console.log('\n' + '─'.repeat(60));

    if (this.results.failed === 0) {
      console.log('✅ MONGODB SEEDING COMPLETED SUCCESSFULLY!');
      console.log('\n✨ All MongoDB collections populated with test data.');
      console.log('📊 Summary:');
      console.log(`   • Collections: 27+`);
      console.log(`   • Documents: ~1,000+`);
      console.log(`   • Time: ${minutes}m ${seconds}s`);
      console.log('\n🎯 Next: Run PostgreSQL seeder');
      process.exit(0);
    } else {
      console.log('⚠️  MONGODB SEEDING COMPLETED WITH ERRORS');
      console.log(`\n📋 ${this.results.failed} seeder(s) failed. Review errors above.`);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  try {
    const seeder = new MongoDBMasterSeeder();
    await seeder.executeSeeders();
  } catch (err) {
    console.error('\n💥 FATAL ERROR:', err.message);
    process.exit(1);
  }
}

main();
