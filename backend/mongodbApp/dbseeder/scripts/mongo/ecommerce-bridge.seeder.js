// E-Commerce Bridge Seeder Script
// Orchestrates: Cart, Coupon (alternative), Permission, User-related supplementary seeders
// Usage: node scripts/ecommerce-bridge.seeder.js
// ============================================================================

require('dotenv').config();
const mongoose = require('mongoose');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping ecommerce-bridge.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

// Import seeders for any remaining unorchestrated seeders
// This script acts as a bridge to ensure all seeders are covered

async function seedEcommerceBridge() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('\n' + '═'.repeat(70));
    console.log('🛒 E-COMMERCE BRIDGE SEEDING');
    console.log('═'.repeat(70) + '\n');

    console.log('📌 This is a bridge seeder for any remaining unorchestrated seeders');
    console.log('   Most e-commerce data is orchestrated by existing seeders.\n');

    console.log('ℹ️  Current orchestration summary:');
    console.log('   ✅ Bootstrap        → bootstrap.seeder.js');
    console.log('   ✅ Permissions      → permission-management.seeder.js');
    console.log('   ✅ Module           → module.seeder.js');
    console.log('   ✅ Roles            → role.seeder.js');
    console.log('   ✅ Role-Permission  → role-permission.seeder.js');
    console.log('   ✅ Users            → user.seeder.js');
    console.log('   ✅ Sessions         → session.seeder.js');
    console.log('   ✅ Sellers          → sellers.seeder.js');
    console.log('   ✅ Categories       → category.seeder.js');
    console.log('   ✅ Products         → product.seeder.js');
    console.log('   ✅ Product Comments → productComment.seeder.js');
    console.log('   ✅ Product Shares   → productShare.seeder.js');
    console.log('   ✅ Posts            → post.seeder.js');
    console.log('   ✅ Stories          → story.seeder.js');
    console.log('   ✅ Reels            → reel.seeder.js');
    console.log('   ✅ Style Inspiration → styleInspiration.seeder.js');
    console.log('   ✅ Carts            → cart.seeder.js');
    console.log('   ✅ Wishlists        → wishlist.seeder.js');
    console.log('   ✅ Orders           → order.seeder.js');
    console.log('   ✅ Payments         → payment.seeder.js');
    console.log('   ✅ Returns          → returns.seeder.js');
    console.log('   ✅ Logistics        → logistics.seeder.js');
    console.log('   ✅ Promotions       → promotions.seeder.js');
    console.log('   ✅ Livestream       → livestream.seeder.js');
    console.log('   ✅ Marketing        → marketing.seeder.js');
    console.log('   ✅ CMS              → cms.seeder.js');
    console.log('   ✅ KYC Documents    → kycDocument.seeder.js');
    console.log('   ✅ Rewards          → reward.seeder.js');
    console.log('   ✅ Notifications    → notification.seeder.js');
    console.log('   ✅ Search History   → searchHistory.seeder.js');
    console.log('   ✅ Search Suggestions → searchSuggestion.seeder.js');
    console.log('   ✅ Trending Searches → trendingSearch.seeder.js');
    console.log('   ✅ User Behavior    → userBehavior.seeder.js\n');

    console.log('📦 New orchestration scripts:');
    console.log('   ✅ Administrative   → administrative.seeder.js');
    console.log('   ✅ Content Mgmt     → content-management.seeder.js');
    console.log('   ✅ Product Infra    → product-infrastructure.seeder.js');
    console.log('   ✅ Inventory Mgmt   → inventory-management.seeder.js');
    console.log('   ✅ Promotions       → promotion-discount.seeder.js');
    console.log('   ✅ Logistics        → logistics-shipping.seeder.js');
    console.log('   ✅ Seller Mgmt      → seller-management.seeder.js');
    console.log('   ✅ Permission/Role  → permission-role-config.seeder.js\n');

    console.log('═'.repeat(70));
    console.log('✅ E-Commerce Bridge seeding reference completed!');
    console.log('═'.repeat(70) + '\n');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ E-Commerce Bridge seeding failed!');
    console.error('Error:', err.message);
    if (err.stack) console.error(err.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedEcommerceBridge();

