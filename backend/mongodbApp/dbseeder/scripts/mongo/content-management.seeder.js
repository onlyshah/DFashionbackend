// Content Management & Pages Seeder Script
// Orchestrates: Banner, Page, FAQ, QuickAction
// Usage: node scripts/content-management.seeder.js
// ============================================================================

require('dotenv').config();
const mongoose = require('mongoose');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping content-management.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

// Import seeders
const seedBanner = require('../seeders/Banner');
const seedPage = require('../seeders/Page');
const seedFAQ = require('../seeders/FAQ');
const seedQuickAction = require('../seeders/QuickAction');

async function seedContentManagement() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('\n' + '═'.repeat(70));
    console.log('📄 CONTENT MANAGEMENT & PAGES SEEDING');
    console.log('═'.repeat(70) + '\n');

    // Phase 1: Page (no dependencies)
    console.log('⏳ Phase 1/4: Seeding Pages...');
    await seedPage();
    console.log('✅ Pages seeded\n');

    // Phase 2: Banner (independent)
    console.log('⏳ Phase 2/4: Seeding Banners...');
    await seedBanner();
    console.log('✅ Banners seeded\n');

    // Phase 3: FAQ (independent)
    console.log('⏳ Phase 3/4: Seeding FAQs...');
    await seedFAQ();
    console.log('✅ FAQs seeded\n');

    // Phase 4: QuickAction (independent)
    console.log('⏳ Phase 4/4: Seeding Quick Actions...');
    await seedQuickAction();
    console.log('✅ Quick Actions seeded\n');

    console.log('═'.repeat(70));
    console.log('✅ Content Management seeding completed successfully!');
    console.log('═'.repeat(70) + '\n');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Content Management seeding failed!');
    console.error('Error:', err.message);
    if (err.stack) console.error(err.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedContentManagement();

