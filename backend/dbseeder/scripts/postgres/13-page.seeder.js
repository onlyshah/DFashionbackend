/**
 * 📄 Page Seeder (Phase 1 - Root Model)
 * Seeds the pages table with static pages
 * No dependencies
 */

const models = require('../../../models_sql');

const pageData = [
  { title: 'About Us', slug: 'about-us', content: 'About our company...', isPublished: true },
  { title: 'Contact Us', slug: 'contact-us', content: 'Contact information...', isPublished: true },
  { title: 'Privacy Policy', slug: 'privacy-policy', content: 'Privacy policy content...', isPublished: true },
  { title: 'Terms & Conditions', slug: 'terms-conditions', content: 'Terms and conditions...', isPublished: true },
  { title: 'FAQ', slug: 'faq', content: 'Frequently asked questions...', isPublished: true },
  { title: 'Shipping Policy', slug: 'shipping-policy', content: 'Shipping policy...', isPublished: true },
  { title: 'Return Policy', slug: 'return-policy', content: 'Return policy...', isPublished: true }
];

async function seedPages() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Page seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Page = models._raw?.Page || models.Page;
    if (!Page || !Page.create) {
      throw new Error('Page model not available');
    }

    let createdCount = 0;
    for (const page of pageData) {
      const existing = await Page.findOne({
        where: { slug: page.slug }
      });

      if (existing) {
        console.log(`✅ Page '${page.slug}' already exists (skipping)`);
        continue;
      }

      await Page.create(page);
      console.log(`✅ Created page: ${page.title}`);
      createdCount++;
    }

    console.log(`✨ Page seeding completed (${createdCount} new pages)\n`);
    return true;
  } catch (error) {
    console.error('❌ Page seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedPages };
