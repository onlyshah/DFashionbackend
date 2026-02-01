// FAQ Seeder Script - PostgreSQL
// Seeds frequently asked questions
// Usage: node scripts/faq.seeder.js

require('dotenv').config();
const { getSequelize } = require('../../../config/sequelize');
const modelsModule = require('../../../models_sql');

let sequelize;
let FAQ;

const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();
if (!DB_TYPE.includes('postgres')) {
  console.log('⏭️  Skipping faq.seeder - Postgres disabled (DB_TYPE=' + DB_TYPE + ')');
  process.exit(0);
}

const FAQ_DATA = [
  { question: 'What is the return policy?', answer: 'Items can be returned within 30 days of purchase with original packaging.', category: 'returns', priority: 1, is_active: true, view_count: 1542, created_at: new Date(Date.now() - 180*24*60*60*1000) },
  { question: 'Do you offer free shipping?', answer: 'Free shipping is available on orders above Rs. 2000.', category: 'shipping', priority: 1, is_active: true, view_count: 2341, created_at: new Date(Date.now() - 150*24*60*60*1000) },
  { question: 'How long does delivery take?', answer: 'Standard delivery takes 3-5 business days. Express delivery takes 1-2 business days.', category: 'shipping', priority: 2, is_active: true, view_count: 3214, created_at: new Date(Date.now() - 120*24*60*60*1000) },
  { question: 'Can I track my order?', answer: 'Yes, you can track your order using the tracking number sent via email.', category: 'orders', priority: 2, is_active: true, view_count: 2876, created_at: new Date(Date.now() - 90*24*60*60*1000) },
  { question: 'How do I apply a coupon?', answer: 'Enter the coupon code at checkout in the \"Discount Code\" field.', category: 'payment', priority: 3, is_active: true, view_count: 1923, created_at: new Date(Date.now() - 60*24*60*60*1000) }
];

async function seedFAQ() {
  try {
    console.log('🚀 Starting PostgreSQL FAQ Seeder...\n');
    sequelize = await getSequelize();
    if (!sequelize) throw new Error('Failed to initialize sequelize');
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // Reinitialize models now that sequelize is connected
    if (modelsModule.reinitializeModels) {
      await modelsModule.reinitializeModels();
    }
    FAQ = modelsModule._raw.FAQ;
    if (!FAQ) throw new Error('FAQ model not initialized');

    const existing = await FAQ.count();
    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing FAQ records. Clearing...\n`);
      await FAQ.destroy({ where: {} });
    }

    console.log('📝 Seeding FAQ records...');
    let seededCount = 0;
    for (const faqData of FAQ_DATA) {
      const faq = await FAQ.create(faqData);
      console.log(`  ✓ Created FAQ: ${faq.question.substring(0, 40)}...`);
      seededCount++;
    }

    console.log(`\n✅ Successfully seeded ${seededCount} FAQ records\n`);
    console.log('═'.repeat(50));
    console.log('FAQ SEEDING COMPLETE');
    console.log('═'.repeat(50));
    console.log('\nSeeded FAQs:');
    FAQ_DATA.forEach(f => console.log(`  • ${f.category} - ${f.question.substring(0, 35)}...`));
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ FAQ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedFAQ();
