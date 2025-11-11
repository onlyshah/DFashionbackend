// Master Seeder Script
// Usage: node scripts/master.seeder.js

const { execSync } = require('child_process');
const path = require('path');

// ALL seeders in the correct dependency order
const seeders = [
  // 1. System initialization
  'bootstrap.seeder.js',            // Initial setup (superadmin, core module, base role)
  
  // 2. Core system and security
  'permission-management.seeder.js', // Permissions configuration
  'module.seeder.js',               // System modules
  'role.seeder.js',                 // User roles
  'role-permission.seeder.js',      // Role-permission mappings
  
  // 3. User management
  'user.seeder.js',                 // All user types
  'session.seeder.js',              // User sessions
  
  // 4. Content management
  'category.seeder.js',             // Product categories
  'product.seeder.js',              // Products catalog
  'productComment.seeder.js',       // Product comments/reviews
  'productShare.seeder.js',         // Product sharing data
  'post.seeder.js',                 // User posts
  'story.seeder.js',                // User stories
  'reel.seeder.js',                 // Video reels
  'styleInspiration.seeder.js',     // Style guides
  
  // 5. E-commerce
  'cart.seeder.js',                 // Shopping carts
  'wishlist.seeder.js',             // User wishlists
  'order.seeder.js',                // Purchase orders
  'payment.seeder.js',              // Payment records
  
  // 6. Engagement and gamification
  'reward.seeder.js',               // User rewards
  'notification.seeder.js',         // System notifications
  
  // 7. Search and discovery
  'searchHistory.seeder.js',        // User search history
  'searchSuggestion.seeder.js',     // Search suggestions
  'trendingSearch.seeder.js',       // Trending searches
  
  // 8. Analytics and tracking
  'userBehavior.seeder.js',         // User behavior analytics
  
  // 9. Demo data scripts (if needed)
  'download_demo_product_images.js', // Download product images
  'cleanup_and_replace_images.js',   // Clean up image assets
];

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
  console.log('Starting database seeding process...\n');
  
  for (const seeder of seeders) {
    const seederPath = path.join(__dirname, seeder);
    try {
      console.log(`Running ${seeder}...`);
      execSync(`node "${seederPath}"`, { stdio: 'inherit' });
      console.log(`✓ ${seeder} completed successfully\n`);
    } catch (err) {
      console.error(`\n╳ Seeder ${seeder} failed with error:`);
      console.error(err.message);
      console.error('\nAborting seeding process.');
      process.exit(1);
    }
  }
};

(async () => {
  try {
    // First clean up duplicate/obsolete files
    deleteFiles();
    
    // Then run all seeders in order
    await runSeeders();
    
    console.log('\n✨ All seeders completed successfully!');
    console.log('Database is now populated with initial data.');
  } catch (err) {
    console.error('Master seeder failed:', err);
    process.exit(1);
  }
})();
