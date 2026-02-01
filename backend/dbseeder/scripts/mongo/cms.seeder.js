// CMS Seeder Script
// Creates pages, banners, FAQs, and content management records
// Usage: node scripts/cms.seeder.js

require('dotenv').config();
const mongoose = require('mongoose');
const Page = require('../models/Page');
const Banner = require('../models/Banner');
const FAQ = require('../models/FAQ');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping cms.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

async function seedCMS() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for CMS seeding');

    // Clear existing CMS data
    await Page.deleteMany({});
    await Banner.deleteMany({});
    await FAQ.deleteMany({});

    const pages = [];
    const banners = [];
    const faqs = [];

    // Create pages
    const pageData = [
      {
        title: 'About Us',
        slug: 'about-us',
        content: 'DFashion is a leading online fashion retailer offering trendy clothing and accessories. We are committed to providing the best shopping experience with high-quality products and exceptional customer service.',
        icon: 'info'
      },
      {
        title: 'Privacy Policy',
        slug: 'privacy-policy',
        content: 'Your privacy is important to us. This policy explains how we collect, use, and protect your personal information when you use our website and services.',
        icon: 'shield'
      },
      {
        title: 'Terms and Conditions',
        slug: 'terms-and-conditions',
        content: 'By using DFashion website, you agree to these terms and conditions. Please read them carefully before making any purchase.',
        icon: 'file-text'
      },
      {
        title: 'Shipping & Delivery',
        slug: 'shipping-delivery',
        content: 'We offer fast and reliable shipping across India. Orders are typically delivered within 3-7 business days. Free shipping on orders above ₹500.',
        icon: 'truck'
      },
      {
        title: 'Returns & Exchanges',
        slug: 'returns-exchanges',
        content: 'We want you to be completely satisfied with your purchase. If you\'re not happy with your item, you can return or exchange it within 30 days of purchase.',
        icon: 'refresh-cw'
      },
      {
        title: 'Contact Us',
        slug: 'contact-us',
        content: 'Get in touch with our customer support team. We\'re available 24/7 to help you with any questions or concerns.',
        icon: 'mail'
      },
      {
        title: 'Careers',
        slug: 'careers',
        content: 'Join our growing team and be part of the fashion revolution. We\'re always looking for talented individuals to join DFashion.',
        icon: 'briefcase'
      },
      {
        title: 'Blog',
        slug: 'blog',
        content: 'Stay updated with the latest fashion trends, style tips, and fashion news on our blog.',
        icon: 'pen-tool'
      },
      {
        title: 'FAQ',
        slug: 'faq',
        content: 'Find answers to common questions about our products, services, and policies.',
        icon: 'help-circle'
      },
      {
        title: 'Sustainability',
        slug: 'sustainability',
        content: 'We are committed to sustainable fashion practices. Learn about our eco-friendly initiatives and commitment to the environment.',
        icon: 'leaf'
      }
    ];

    pageData.forEach((data, index) => {
      const pageId = new mongoose.Types.ObjectId();
      const isPublished = index < 8;

      const page = {
        slug: data.slug,
        title: data.title,
        content: data.content,
        metaTitle: `${data.title} - DFashion`,
        metaDescription: `Learn about ${data.title} at DFashion. ${data.content.substring(0, 100)}...`,
        keywords: [data.title.toLowerCase(), 'dfashion', 'fashion'],
        status: isPublished ? 'published' : 'draft',
        publishedAt: isPublished ? new Date(Date.now() - 30*24*60*60*1000) : null,
        publishedBy: isPublished ? new mongoose.Types.ObjectId() : null,
        updatedAt: new Date(),
        updatedBy: new mongoose.Types.ObjectId()
      };

      pages.push(page);

      // No need to track audit logs for content creation
    });

    // Create banners for different positions
    const bannerTypes = ['hero', 'promo', 'category_highlight'];
    const displayPositions = ['home_hero', 'home_top', 'home_middle', 'home_bottom', 'category_page', 'product_page'];
    const bannerCount = 12;

    for (let i = 0; i < bannerCount; i++) {
      const banner = {
        title: `Banner ${i + 1}`,
        imageUrl: `/uploads/banners/banner-${i}.jpg`,
        imageAlt: `Banner image ${i + 1}`,
        redirectUrl: i % 3 === 0 ? '/products' : '/category/fashion',
        type: bannerTypes[i % bannerTypes.length],
        position: i,
        active: i < 9,
        startDate: new Date(Date.now() - 20*24*60*60*1000),
        endDate: new Date(Date.now() + (60 - i*5)*24*60*60*1000),
        displayOn: [displayPositions[i % displayPositions.length]]
      };

      banners.push(banner);

      // No need to track audit logs for banner creation
    }

    // Create FAQs
    const faqCategories = ['General', 'Shipping', 'Returns', 'Payment', 'Products', 'Account'];
    const faqCount = 30;

    const faqQuestions = [
      { q: 'What is DFashion?', a: 'DFashion is an online fashion retailer offering latest trends and styles.' },
      { q: 'How do I place an order?', a: 'Browse our collection, add items to cart, and proceed to checkout.' },
      { q: 'Is shipping free?', a: 'Free shipping on orders above ₹500. Otherwise, shipping charges apply.' },
      { q: 'How long does delivery take?', a: 'Typically 3-7 business days across India.' },
      { q: 'Can I return items?', a: 'Yes, within 30 days of purchase with original tags and packaging.' },
      { q: 'What payment methods are accepted?', a: 'We accept credit cards, debit cards, net banking, and digital wallets.' },
      { q: 'How do I track my order?', a: 'You\'ll receive a tracking link via email after your order ships.' },
      { q: 'Do you offer international shipping?', a: 'Currently, we ship within India only.' },
      { q: 'How can I contact customer support?', a: 'Email us at support@dfashion.com or call our helpline.' },
      { q: 'Are products original?', a: 'Yes, all products are 100% authentic and sourced directly from brands.' }
    ];

    for (let i = 0; i < faqCount; i++) {
      const faqItem = faqQuestions[i % faqQuestions.length];
      const category = faqCategories[i % faqCategories.length];

      const faq = {
        question: faqItem.q,
        answer: faqItem.a,
        category: category,
        status: Math.random() > 0.2 ? 'published' : 'draft',
        position: i,
        helpful: Math.floor(Math.random() * 100),
        notHelpful: Math.floor(Math.random() * 20)
      };

      faqs.push(faq);

      // No need to track audit logs for FAQ creation
    }

    await Page.insertMany(pages);
    await Banner.insertMany(banners);
    await FAQ.insertMany(faqs);

    console.log(`✓ ${pages.length} pages created`);
    console.log(`✓ ${banners.length} banners created`);
    console.log(`✓ ${faqs.length} FAQs created`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('CMS seeding failed:', err.message);
    process.exit(1);
  }
}

seedCMS();
