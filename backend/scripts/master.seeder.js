// Master Seeder Script
// Usage: node scripts/master.seeder.js
// Automatically detects DB_TYPE and runs appropriate seeders

require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');

const DB_TYPE = (process.env.DB_TYPE || 'postgres_only').toLowerCase();
const isPostgresOnly = DB_TYPE.includes('postgres');

console.log(`📊 Detected database type: ${DB_TYPE}`);
console.log(`🔄 Running ${isPostgresOnly ? 'PostgreSQL' : 'MongoDB'} seeders\n`);

// PostgreSQL-compatible seeders (Sequelize-based)
const postgresSeedersList = [
  'seedPostgresBootstrap.js',     // Bootstrap for PostgreSQL
  'seedPostgresUsers.js',         // User seeding for PostgreSQL
  'seedPostgresAll.js',           // Comprehensive PostgreSQL seeding
];

// MongoDB seeders (Mongoose-based) - Original list
const mongooseSeedersList = [
  // 1. System initialization
  'bootstrap.seeder.js',            // Initial setup (superadmin, core module, base role)
  
  // 2. Core system and security
  'permission-management.seeder.js', // Permissions configuration
  'module.seeder.js',               // System modules
  'role.seeder.js',                 // User roles
  'role-permission.seeder.js',      // Role-permission mappings
  
  // 3. User management
  'user.seeder.js',                 // All user types (includes vendors/sellers)
  'session.seeder.js',              // User sessions
  'sellers.seeder.js',              // Vendor/seller profiles with KYC and commission data
  
  // 4. Content management
  'category.seeder.js',             // Product categories
  'product.seeder.js',              // Products catalog
  'productComment.seeder.js',       // Product comments/reviews
  'productShare.seeder.js',         // Product sharing data
  'post.seeder.js',                 // User posts
  'story.seeder.js',                // User stories
  'reel.seeder.js',                 // Video reels
  'styleInspiration.seeder.js',     // Style guides
  
  // 5. E-commerce core
  'cart.seeder.js',                 // Shopping carts
  'wishlist.seeder.js',             // User wishlists
  'order.seeder.js',                // Purchase orders
  'payment.seeder.js',              // Payment records
  
  // 6. Returns management (depends on orders)
  'returns.seeder.js',              // Return records with refund data
  
  // 7. Logistics and shipping (depends on orders)
  'logistics.seeder.js',            // Couriers, shipments, and shipping charges
  
  // 8. Promotions and marketing (depends on products)
  'promotions.seeder.js',           // Coupons, flash sales, campaigns
  
  // 9. CMS content
  'cms.seeder.js',                  // Pages, banners, FAQs
  
  // 10. KYC and compliance (depends on sellers)
  'kycDocument.seeder.js',          // KYC document records for sellers
  
  // 11. Engagement and gamification
  'reward.seeder.js',               // User rewards
  'notification.seeder.js',         // System notifications
  
  // 12. Search and discovery
  'searchHistory.seeder.js',        // User search history
  'searchSuggestion.seeder.js',     // Search suggestions
  'trendingSearch.seeder.js',       // Trending searches
  
  // 13. Analytics and tracking
  'userBehavior.seeder.js',         // User behavior analytics
  
  // 14. Demo data scripts (if needed)
  'download_demo_product_images.js', // Download product images
  'cleanup_and_replace_images.js',   // Clean up image assets
];

// Select appropriate seeders based on DB_TYPE
const seeders = isPostgresOnly ? postgresSeedersList : mongooseSeedersList;

// No files to delete - we'll keep all scripts
const filesToDelete = [];

const deleteFiles = () => {
  const fs = require('fs');
  filesToDelete.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted duplicate/obsolete seeder: ${file}`);
      } catch (err) {
        console.warn(`Warning: Could not delete ${file}:`, err.message);
      }
    }
  });
};

const runSeeders = async () => {
  console.log(`🌱 Starting ${isPostgresOnly ? 'PostgreSQL' : 'MongoDB'} seeding process...\n`);
  
  let successful = 0;
  let failed = 0;
  const errors = [];
  
  for (const seeder of seeders) {
    const seederPath = path.join(__dirname, seeder);
    try {
      console.log(`📍 Running: ${seeder}`);
      execSync(`node "${seederPath}"`, { stdio: 'inherit' });
      console.log(`✅ Completed: ${seeder}\n`);
      successful++;
    } catch (err) {
      console.error(`❌ Error in ${seeder}:`, err.message);
      failed++;
      errors.push({ seeder, error: err.message });
      // Continue with next seeder instead of aborting
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✨ Seeding process completed!`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(60));
  
  if (errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    errors.forEach(({ seeder, error }) => {
      console.log(`  - ${seeder}: ${error}`);
    });
  }
  
  return failed === 0;
};

(async () => {
  try {
    const success = await runSeeders();
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('Master seeder failed:', err);
    process.exit(1);
  }
})();
