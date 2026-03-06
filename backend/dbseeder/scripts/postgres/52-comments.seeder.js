/**
 * 💬 Comments Seeder (Phase 4 - Tier 4)
 * Depends on: Post, User
 * Creates comments on posts
 */

const models = require('../../../models_sql');

async function seedComments() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Comments seeding...');

    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    });

    await client.connect();

    // Get posts and users
    const postsRes = await client.query('SELECT id FROM posts LIMIT 10');
    const posts = postsRes.rows;
    
    const usersRes = await client.query('SELECT id FROM users LIMIT 10');
    const users = usersRes.rows;

    if (posts.length === 0 || users.length === 0) {
      throw new Error('No posts or users found. Ensure Post and User seeders ran first.');
    }

    const commentTexts = [
      'Love this! So stylish 😍',
      'Where can I buy this? Looks amazing!',
      'Perfect fit for summer!',
      'This is absolutely gorgeous! 🔥',
      'Need this in my life ASAP',
      'You have such great taste!',
      'This is inspiration goals',
      'Where is the link to shop?',
      'Quality looks premium!',
      'Would love to see the full outfit',
      'This color suits you perfectly',
      'Simply stunning! 💫',
      'So elegant and classy',
      'Definitely adding to my wishlist',
      'Your styling is impeccable',
      'This made my day!',
      'Can we get the full look tutorial?',
      'Obsessed with this!',
      'Perfection! 👏',
      'This is exactly what I needed'
    ];

    const statuses = ['pending', 'approved', 'rejected'];
    let createdCount = 0;

    // Create multiple comments per post
    for (const post of posts) {
      const numComments = 2 + Math.floor(Math.random() * 4); // 2-5 comments per post
      
      for (let i = 0; i < numComments; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const randomComment = commentTexts[Math.floor(Math.random() * commentTexts.length)];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

        await client.query(
          `INSERT INTO post_comments (post_id, user_id, text, status, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [post.id, randomUser.id, randomComment, randomStatus]
        );
        createdCount++;
      }
      console.log(`✅ Added ${numComments} comments to post ${post.id}`);
    }

    await client.end();
    console.log(`✨ Comments seeding completed (${createdCount} new comments)\n`);
    return true;
  } catch (error) {
    console.error('❌ Comments seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedComments };
