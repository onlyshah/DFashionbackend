/**
 * 📸 Posts & Reels Seeder (Phase 2 - Tier 3)
 * Depends on: User
 * Creates sample social posts and reels for testing
 */

const { v4: uuidv4 } = require('uuid');
const models = require('../../../models_sql');

async function seedPosts() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Posts & Reels seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Post = models._raw?.Post || models.Post;
    const Reel = models._raw?.Reel || models.Reel;
    const User = models._raw?.User || models.User;

    if (!Post) {
      console.warn('⚠️  Post model not available, skipping posts seeding');
    } else {
      // Delete existing posts to ensure fresh data with valid user_ids
      await Post.destroy({ where: {} });
      console.log('🗑️  Cleared old posts');

      // Get users for posts
      const users = await User.findAll({ limit: 5, attributes: ['id'] });
      const userIds = users.map(u => u.id);

      if (userIds.length === 0) {
        console.warn('⚠️  No users found, skipping posts seeding');
      } else {
        const postsData = [
          {
            id: uuidv4(),
            userId: userIds[0],
            user_id: userIds[0],
            title: 'Amazing Fashion Trend',
            content: 'Check out this fabulous new collection! Perfect for summer vibes 🌟',
            created_at: new Date(),
            updated_at: new Date(),
            image_urls: ['https://example.com/image1.jpg'],
            caption: 'New Collection Launch',
            video_url: null,
            hashtags: ['fashion', 'summer', 'trend'],
            likes_count: 42,
            comments_count: 8,
            shares_count: 5,
            visibility: 'public'
          },
          {
            id: uuidv4(),
            userId: userIds[1] || userIds[0],
            user_id: userIds[1] || userIds[0],
            title: 'Street Style Inspiration',
            content: 'Loving this urban fashion moment! Mix and match for the perfect look 👗',
            created_at: new Date(),
            updated_at: new Date(),
            image_urls: ['https://example.com/image2.jpg'],
            caption: 'Street Style Guide',
            video_url: null,
            hashtags: ['streetstyle', 'ootd', 'fashion'],
            likes_count: 128,
            comments_count: 24,
            shares_count: 15,
            visibility: 'public'
          },
          {
            id: uuidv4(),
            userId: userIds[2] || userIds[0],
            user_id: userIds[2] || userIds[0],
            title: 'Designer Spotlight',
            content: 'Introducing exclusive designs from emerging fashion designers ✨',
            created_at: new Date(),
            updated_at: new Date(),
            image_urls: ['https://example.com/image3.jpg'],
            caption: 'New Designer Collection',
            video_url: null,
            hashtags: ['designer', 'fashion', 'exclusive'],
            likes_count: 95,
            comments_count: 16,
            shares_count: 11,
            visibility: 'public'
          }
        ];

        for (const post of postsData) {
          await Post.create(post);
          console.log(`✅ Created post: ${post.title}`);
        }
      }
    }

    if (!Reel) {
      console.warn('⚠️  Reel model not available, skipping reels seeding');
    } else {
      // Delete existing reels to ensure fresh data with valid user_ids
      await Reel.destroy({ where: {} });
      console.log('🗑️  Cleared old reels');

      const users = await User.findAll({ limit: 5, attributes: ['id'] });
      const userIds = users.map(u => u.id);

      if (userIds.length === 0) {
        console.warn('⚠️  No users found, skipping reels seeding');
      } else {
        const reelsData = [
          {
            id: uuidv4(),
            userId: userIds[0],
            user_id: userIds[0],
            title: 'Quick Fashion Hacks',
            video_url: 'https://example.com/reel1.mp4',
            duration: 30,
            created_at: new Date(),
            updated_at: new Date(),
            views_count: 523,
            likes_count: 89,
            comments_count: 12,
            shares_count: 7,
            visibility: 'public'
          },
          {
            id: uuidv4(),
            userId: userIds[1] || userIds[0],
            user_id: userIds[1] || userIds[0],
            title: 'Styling Tips & Tricks',
            video_url: 'https://example.com/reel2.mp4',
            duration: 45,
            created_at: new Date(),
            updated_at: new Date(),
            views_count: 1204,
            likes_count: 234,
            comments_count: 45,
            shares_count: 28,
            visibility: 'public'
          },
          {
            id: uuidv4(),
            userId: userIds[2] || userIds[0],
            user_id: userIds[2] || userIds[0],
            title: 'Seasonal Wardrobe Update',
            video_url: 'https://example.com/reel3.mp4',
            duration: 60,
            created_at: new Date(),
            updated_at: new Date(),
            views_count: 856,
            likes_count: 156,
            comments_count: 32,
            shares_count: 19,
            visibility: 'public'
          }
        ];

        for (const reel of reelsData) {
          await Reel.create(reel);
          console.log(`✅ Created reel: ${reel.title}`);
        }
      }
    }

    console.log(`✨ Posts & Reels seeding completed\n`);
    return true;
  } catch (error) {
    console.error('❌ Posts & Reels seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedPosts };
