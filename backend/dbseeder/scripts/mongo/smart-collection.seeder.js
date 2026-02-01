// Smart Collection Seeder Script - PostgreSQL
// Seeds smart product collections
// Usage: node scripts/smart-collection.seeder.js

require('dotenv').config();
const { getSequelize } = require('../../../config/sequelize');
const modelsModule = require('../../../models_sql');

let sequelize;
let SmartCollection;

const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();
if (!DB_TYPE.includes('postgres')) {
  console.log('⏭️  Skipping smart-collection.seeder - Postgres disabled (DB_TYPE=' + DB_TYPE + ')');
  process.exit(0);
}

const COLLECTIONS_DATA = [
  { name: 'New Arrivals', slug: 'new-arrivals', description: 'Latest product releases', conditions: JSON.stringify({ tagIn: ['new'] }), sort_by: 'created_at', sort_order: 'desc', is_active: true, is_published: true, created_at: new Date(Date.now() - 90*24*60*60*1000) },
  { name: 'Best Sellers', slug: 'best-sellers', description: 'Top selling products', conditions: JSON.stringify({ minSalesCount: 100 }), sort_by: 'sales_count', sort_order: 'desc', is_active: true, is_published: true, created_at: new Date(Date.now() - 120*24*60*60*1000) },
  { name: 'On Sale', slug: 'on-sale', description: 'Discounted products', conditions: JSON.stringify({ hasDiscount: true }), sort_by: 'discount_percentage', sort_order: 'desc', is_active: true, is_published: true, created_at: new Date(Date.now() - 60*24*60*60*1000) },
  { name: 'Premium Collection', slug: 'premium', description: 'High-end fashion items', conditions: JSON.stringify({ priceMin: 5000 }), sort_by: 'price', sort_order: 'desc', is_active: true, is_published: true, created_at: new Date(Date.now() - 30*24*60*60*1000) },
  { name: 'Summer Essentials', slug: 'summer-essentials', description: 'Perfect for summer season', conditions: JSON.stringify({ tagIn: ['summer', 'essential'] }), sort_by: 'created_at', sort_order: 'desc', is_active: true, is_published: true, created_at: new Date(Date.now() - 15*24*60*60*1000) }
];

async function seedCollections() {
  try {
    console.log('🚀 Starting PostgreSQL Smart Collection Seeder...\n');
    sequelize = await getSequelize();
    if (!sequelize) throw new Error('Failed to initialize sequelize');
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // Reinitialize models now that sequelize is connected
    if (modelsModule.reinitializeModels) {
      await modelsModule.reinitializeModels();
    }
    SmartCollection = modelsModule._raw.SmartCollection;
    if (!SmartCollection) throw new Error('SmartCollection model not initialized');

    const existing = await SmartCollection.count();
    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing collections. Clearing...\n`);
      await SmartCollection.destroy({ where: {} });
    }

    console.log('📝 Seeding smart collections...');
    let seededCount = 0;
    for (const collectionData of COLLECTIONS_DATA) {
      const collection = await SmartCollection.create(collectionData);
      console.log(`  ✓ Created collection: ${collection.name}`);
      seededCount++;
    }

    console.log(`\n✅ Successfully seeded ${seededCount} smart collections\n`);
    console.log('═'.repeat(50));
    console.log('SMART COLLECTION SEEDING COMPLETE');
    console.log('═'.repeat(50));
    console.log('\nSeeded Collections:');
    COLLECTIONS_DATA.forEach(c => console.log(`  • ${c.name} - ${c.description}`));
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Smart Collection Seeding failed:', error.message);
    process.exit(1);
  }
}

seedCollections();
