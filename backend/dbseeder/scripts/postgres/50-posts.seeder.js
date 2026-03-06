/**
 * 📝 Posts Seeder (Phase 4 - Tier 3)
 * Depends on: User, Category, Product
 * Creates social posts with hashtags and tagged products
 */

const models = require('../../../models_sql');

async function seedPosts() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Posts seeding...');

    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    });

    await client.connect();

    // Get some users for creators
    const usersRes = await client.query('SELECT id FROM users LIMIT 5');
    const users = usersRes.rows;

    if (users.length === 0) {
      throw new Error('No users found. Ensure User seeder ran first.');
    }

    // Get some products
    const productsRes = await client.query('SELECT id FROM products LIMIT 10');
    const products = productsRes.rows;

    const postsData = [
      {
        user_id: users[0]?.id,
        caption: 'Love this new summer collection! Perfect for beach season 🏖️',
        media_type: 'image',
        media_url: 'https://example.com/post1.jpg',
        thumbnail_url: 'https://example.com/post1-thumb.jpg',
        hashtags: ['summer', 'fashion', 'beach', 'collection'],
        location: 'Miami Beach',
        is_active: true,
        like_count: 45,
        comment_count: 12,
        share_count: 8,
        view_count: 320
      },
      {
        user_id: users[1]?.id,
        caption: 'Styling for a casual Friday at the office 💼✨',
        media_type: 'image',
        media_url: 'https://example.com/post2.jpg',
        thumbnail_url: 'https://example.com/post2-thumb.jpg',
        hashtags: ['casual', 'office', 'style', 'fashion'],
        location: 'New York',
        is_active: true,
        like_count: 67,
        comment_count: 18,
        share_count: 5,
        view_count: 450
      },
      {
        user_id: users[2]?.id,
        caption: 'Evening gown from our new collection! Who would wear this? 👗',
        media_type: 'image',
        media_url: 'https://example.com/post3.jpg',
        thumbnail_url: 'https://example.com/post3-thumb.jpg',
        hashtags: ['gown', 'evening', 'luxury', 'haute-couture'],
        location: 'Paris',
        is_active: true,
        like_count: 156,
        comment_count: 34,
        share_count: 23,
        view_count: 890
      },
      {
        user_id: users[3]?.id,
        caption: 'Comfy athleisure for weekend vibes 🏃‍♀️',
        media_type: 'carousel',
        media_url: 'https://example.com/post4-carousel.jpg',
        thumbnail_url: 'https://example.com/post4-thumb.jpg',
        hashtags: ['athleisure', 'comfort', 'weekend', 'activewear'],
        location: 'Los Angeles',
        is_active: true,
        like_count: 234,
        comment_count: 42,
        share_count: 15,
        view_count: 1230
      },
      {
        user_id: users[4]?.id,
        caption: 'Check out our new accessories line - minimal yet elegant! 🎨',
        media_type: 'image',
        media_url: 'https://example.com/post5.jpg',
        thumbnail_url: 'https://example.com/post5-thumb.jpg',
        hashtags: ['accessories', 'minimal', 'elegant', 'newcollection'],
        location: 'London',
        is_active: true,
        like_count: 89,
        comment_count: 21,
        share_count: 11,
        view_count: 567
      }
    ];

    // Insert posts
    let createdCount = 0;
    const postIds = [];
    
    for (const post of postsData) {
      const result = await client.query(
        `INSERT INTO posts (user_id, caption, media_type, media_url, thumbnail_url, hashtags, location, is_active, like_count, comment_count, share_count, view_count, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
         RETURNING id`,
        [post.user_id, post.caption, post.media_type, post.media_url, post.thumbnail_url, 
         post.hashtags, post.location, post.is_active, post.like_count, post.comment_count, 
         post.share_count, post.view_count]
      );
      postIds.push(result.rows[0].id);
      console.log(`✅ Created post: ${post.caption.substring(0, 30)}...`);
      createdCount++;
    }

    // Tag products in posts
    for (let i = 0; i < postIds.length && i < products.length; i++) {
      const postId = postIds[i];
      // Tag 2-3 randomized products per post
      const numProducts = Math.min(2 + Math.floor(Math.random() * 2), products.length);
      for (let j = 0; j < numProducts; j++) {
        const productId = products[Math.floor(Math.random() * products.length)].id;
        await client.query(
          `INSERT INTO post_products (post_id, product_id, position_x, position_y, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [postId, productId, Math.random() * 100, Math.random() * 100]
        );
      }
    }

    await client.end();
    console.log(`✨ Posts seeding completed (${createdCount} new posts)\n`);
    return true;
  } catch (error) {
    console.error('❌ Posts seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedPosts };
