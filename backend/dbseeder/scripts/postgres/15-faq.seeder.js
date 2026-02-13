/**
 * ❓ FAQ Seeder (Phase 1 - Root Model)
 * Seeds the faqs table
 * No dependencies
 */

const models = require('../../../models_sql');

const faqData = [
  { question: 'How do I track my order?', answer: 'You can track your order using the order number in your email.' },
  { question: 'What is your return policy?', answer: 'We offer 30-day returns for most items.' },
  { question: 'Do you ship internationally?', answer: 'Currently we ship only within India.' },
  { question: 'How can I cancel my order?', answer: 'You can cancel orders that are not yet shipped.' },
  { question: 'What payment methods do you accept?', answer: 'We accept credit cards, debit cards, and UPI payments.' }
];

async function seedFAQs() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting FAQ seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const FAQ = models._raw?.FAQ || models.FAQ;
    if (!FAQ || !FAQ.create) {
      throw new Error('FAQ model not available');
    }

    let createdCount = 0;
    const count = await FAQ.count();
    
    if (count > 0) {
      console.log(`✅ FAQ data already exists (${count} records)`);
      return true;
    }

    for (const faq of faqData) {
      await FAQ.create(faq);
      console.log(`✅ Created FAQ: ${faq.question}`);
      createdCount++;
    }

    console.log(`✨ FAQ seeding completed (${createdCount} new FAQs)\n`);
    return true;
  } catch (error) {
    console.error('❌ FAQ seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedFAQs };
