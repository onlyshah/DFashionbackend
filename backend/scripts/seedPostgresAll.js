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
      await Role.findOrCreate({ where: { name: r }, defaults: { name: r, description: r } });
    }

    const superEmail = 'superadmin@dfashion.com';
    const superUser = await User.findOne({ where: { email: superEmail } });
    if (!superUser) {
      const hashed = await bcrypt.hash(process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123!', 12);
      await User.create({ username: 'superadmin', email: superEmail, password: hashed, fullName: 'Super Admin', role: 'super_admin', isActive: true });
    }

    // Brands
    const [nike] = await Brand.findOrCreate({ where: { name: 'Demo Brand' }, defaults: { name: 'Demo Brand', description: 'Seeded brand' } });

    // Categories
    const [cat] = await Category.findOrCreate({ where: { name: 'Women' }, defaults: { name: 'Women', slug: 'women' } });

    // Products
    const prodDefaults = { title: 'Demo Product', description: 'This is a seeded demo product', price: 49.99, brandId: nike.id, categoryId: cat.id, stock: 100 };
    const [product] = await Product.findOrCreate({ where: { title: prodDefaults.title }, defaults: prodDefaults });

    // Product comments
    await ProductComment.findOrCreate({ where: { productId: product.id, comment: 'Great product!' }, defaults: { productId: product.id, comment: 'Great product!' } });

    // Posts / Stories / Reels
    await Post.findOrCreate({ where: { title: 'Welcome Post' }, defaults: { title: 'Welcome Post', content: 'Seeded post content' } });
    await Story.findOrCreate({ where: { mediaUrl: 'http://example.com/seed/story1.jpg' }, defaults: { mediaUrl: 'http://example.com/seed/story1.jpg' } });
    await Reel.findOrCreate({ where: { videoUrl: 'http://example.com/seed/reel1.mp4' }, defaults: { videoUrl: 'http://example.com/seed/reel1.mp4' } });

    console.log('✅ Core demo data seeded: roles, user, brand, category, product, post, story, reel');

    console.log('🌟 Full seeding completed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Full seeder failed:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

seedAll();
