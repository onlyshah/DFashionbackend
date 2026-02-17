/**
 * 📄 Post Seeder (Phase 4 - Tier 3)
 * Depends on: User
 */

const models = require('../../../models_sql');

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

    const count = await Post.count();
    if (count > 0) {
      console.log(`✅ Post data already exists (${count} records)`);
      // Patch existing posts that have NULL user_id to a default creator
      try {
        const [affected] = await Post.update({ userId: user.id, user_id: user.id }, { where: { user_id: null } });
        console.log(`🔧 Updated ${affected} existing posts to set user_id`);
      } catch (err) {
        console.warn('⚠️  Failed to update existing posts user_id:', err.message);
      }
      return true;
    }

    const postData = [
      { title: 'New Collection Launch', content: 'Check out our summer collection...', userId: user.id, user_id: user.id },
      { title: 'Fashion Tips', content: 'How to style the perfect outfit...', userId: user.id, user_id: user.id },
      { title: 'Customer Spotlight', content: 'Meet our amazing customers...', userId: user.id, user_id: user.id }
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
