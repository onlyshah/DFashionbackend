// Comprehensive Postgres seeder (creates demo entries across tables)
// Usage: node scripts/seedPostgresAll.js

require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize, Role, User, Brand, Category, Product, ProductComment, Post, Story, Reel } = require('../models_sql');

async function seedAll() {
  try {
    console.log('🌱 Starting full Postgres seeding...');
    await sequelize.authenticate();
    console.log('🔌 Sequelize authenticated');

    // Sync all models
    await sequelize.sync({ alter: true });
    console.log('🗃️  Models synchronized');

    // Ensure roles + superadmin (reuse existing bootstrap if present)
    const roles = ['super_admin','admin','vendor','customer'];
    for (const r of roles) {
      const existing = await Role.findOne({ where: { name: r } });
      if (!existing) {
        await Role.create({ name: r, description: r });
      }
    }

    const superEmail = 'superadmin@dfashion.com';
    const superUser = await User.findOne({ where: { email: superEmail } });
    if (!superUser) {
      const hashed = await bcrypt.hash(process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123!', 12);
      await User.create({ username: 'superadmin', email: superEmail, password: hashed, fullName: 'Super Admin', role: 'super_admin', isActive: true });
    }

    // Brands
    let nike = await Brand.findOne({ where: { name: 'Demo Brand' } });
    if (!nike) {
      nike = await Brand.create({ name: 'Demo Brand', description: 'Seeded brand' });
    }

    // Categories
    let cat = await Category.findOne({ where: { name: 'Women' } });
    if (!cat) {
      cat = await Category.create({ name: 'Women', slug: 'women' });
    }

    // Products
    const prodDefaults = { title: 'Demo Product', description: 'This is a seeded demo product', price: 49.99, brandId: nike.id, categoryId: cat.id, stock: 100 };
    let product = await Product.findOne({ where: { title: prodDefaults.title } });
    if (!product) {
      product = await Product.create(prodDefaults);
    }

    // Product comments
    const existingComment = await ProductComment.findOne({ where: { productId: product.id, comment: 'Great product!' } });
    if (!existingComment) {
      await ProductComment.create({ productId: product.id, comment: 'Great product!' });
    }

    // Posts / Stories / Reels
    const existingPost = await Post.findOne({ where: { title: 'Welcome Post' } });
    if (!existingPost) {
      await Post.create({ title: 'Welcome Post', content: 'Seeded post content' });
    }

    const existingStory = await Story.findOne({ where: { mediaUrl: 'http://example.com/seed/story1.jpg' } });
    if (!existingStory) {
      await Story.create({ mediaUrl: 'http://example.com/seed/story1.jpg' });
    }

    const existingReel = await Reel.findOne({ where: { videoUrl: 'http://example.com/seed/reel1.mp4' } });
    if (!existingReel) {
      await Reel.create({ videoUrl: 'http://example.com/seed/reel1.mp4' });
    }

    console.log('✅ Core demo data seeded: roles, user, brand, category, product, post, story, reel');

    console.log('🌟 Full seeding completed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Full seeder failed:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

seedAll();
