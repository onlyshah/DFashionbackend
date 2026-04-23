/**
 * 📄 Post Seeder (Phase 4 - Tier 3)
 * Depends on: User
 */

const models = require('../../../models_sql');
const { createFashionArtwork } = require('../../utils/image-utils');

async function seedPosts() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Post seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Post = models._raw?.Post || models.Post;
    const User = models._raw?.User || models.User;

    if (!Post || !Post.create) throw new Error('Post model not available');
    if (!User || !User.findOne) throw new Error('User model not available');

    const user = await User.findOne({ where: { username: 'seller1' } });
    if (!user) throw new Error('User not found');

    const Product = models._raw?.Product || models.Product;
    const sampleProducts = Product ? await Product.findAll({ limit: 3, order: [['created_at', 'ASC']] }) : [];
    const mediaAssets = [
      createFashionArtwork('posts', 'New Collection Launch', 1, { subtitle: 'Summer drops' }),
      createFashionArtwork('posts', 'Fashion Tips', 2, { subtitle: 'Style guide' }),
      createFashionArtwork('posts', 'Customer Spotlight', 3, { subtitle: 'Real looks' })
    ];

    const count = await Post.count();
    if (count > 0) {
      console.log(`✅ Post data already exists (${count} records)`);
      // Patch existing posts that have NULL user_id or are draft to a default creator/published state
      try {
        const [userUpdated] = await Post.update({ userId: user.id, user_id: user.id }, { where: { user_id: null } });
        const now = new Date();
        const [statusUpdated] = await Post.update(
          { status: 'published', publishedAt: now, published_at: now },
          { where: { status: 'draft' } }
        );
        console.log(`🔧 Updated ${userUpdated} existing posts to set user_id`);
        console.log(`🔧 Updated ${statusUpdated} existing posts to published`);
      } catch (err) {
        console.warn('⚠️  Failed to patch existing posts:', err.message);
      }
      return true;
    }

    const now = new Date();
    const postData = [
      {
        title: 'New Collection Launch',
        content: 'Check out our summer collection...',
        mediaUrl: mediaAssets[0],
        productIds: sampleProducts[0] ? [sampleProducts[0].id] : [],
        contentType: 'product_showcase',
        userId: user.id,
        user_id: user.id,
        status: 'published',
        publishedAt: now,
        published_at: now
      },
      {
        title: 'Fashion Tips',
        content: 'How to style the perfect outfit...',
        mediaUrl: mediaAssets[1],
        productIds: sampleProducts[1] ? [sampleProducts[1].id] : [],
        contentType: 'social_post',
        userId: user.id,
        user_id: user.id,
        status: 'published',
        publishedAt: now,
        published_at: now
      },
      {
        title: 'Customer Spotlight',
        content: 'Meet our amazing customers...',
        mediaUrl: mediaAssets[2],
        productIds: sampleProducts[2] ? [sampleProducts[2].id] : [],
        contentType: 'social_post',
        userId: user.id,
        user_id: user.id,
        status: 'published',
        publishedAt: now,
        published_at: now
      }
    ];

    for (const post of postData) {
      await Post.create(post);
      console.log(`✅ Created post: ${post.title}`);
    }

    console.log(`✨ Post seeding completed (${postData.length} new posts)\n`);
    return true;
  } catch (error) {
    console.error('❌ Post seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedPosts };
