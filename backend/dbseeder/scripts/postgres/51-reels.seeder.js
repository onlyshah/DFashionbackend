/**
 * 🎬 Reels Seeder (Phase 4 - Tier 3)
 * Depends on: User
 * Creates short-form video content
 */

const models = require('../../../models_sql');

async function seedReels() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Reels seeding...');

    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'dfashion'
    });

    await client.connect();

    // Get some users
    const usersRes = await client.query('SELECT id FROM users LIMIT 5');
    const users = usersRes.rows;

    if (users.length === 0) {
      throw new Error('No users found. Ensure User seeder ran first.');
    }

    const reelsData = [
      {
        user_id: users[0]?.id,
        title: 'Quick Fashion Haul',
        description: 'Check out my latest fashion finds from the new collection!',
        video_url: 'https://example.com/reel1.mp4',
        thumbnail_url: 'https://example.com/reel1-thumb.jpg',
        duration: 45,
        view_count: 5400,
        like_count: 234,
        comment_count: 45,
        share_count: 12
      },
      {
        user_id: users[1]?.id,
        title: 'Styling Tips for Summer',
        description: 'Amazing tips to style your summer wardrobe',
        video_url: 'https://example.com/reel2.mp4',
        thumbnail_url: 'https://example.com/reel2-thumb.jpg',
        duration: 60,
        view_count: 8900,
        like_count: 567,
        comment_count: 89,
        share_count: 34
      },
      {
        user_id: users[2]?.id,
        title: 'Fashion Trends 2026',
        description: 'The hottest fashion trends you need to know about',
        video_url: 'https://example.com/reel3.mp4',
        thumbnail_url: 'https://example.com/reel3-thumb.jpg',
        duration: 55,
        view_count: 12300,
        like_count: 789,
        comment_count: 123,
        share_count: 45
      },
      {
        user_id: users[3]?.id,
        title: 'DIY Fashion: Clothes Makeover',
        description: 'Transform old clothes into trendy new pieces',
        video_url: 'https://example.com/reel4.mp4',
        thumbnail_url: 'https://example.com/reel4-thumb.jpg',
        duration: 90,
        view_count: 15600,
        like_count: 1023,
        comment_count: 156,
        share_count: 67
      },
      {
        user_id: users[4]?.id,
        title: 'Minimalist Fashion Guide',
        description: 'Build the perfect minimalist wardrobe',
        video_url: 'https://example.com/reel5.mp4',
        thumbnail_url: 'https://example.com/reel5-thumb.jpg',
        duration: 75,
        view_count: 9800,
        like_count: 654,
        comment_count: 98,
        share_count: 41
      }
    ];

    let createdCount = 0;
    for (const reel of reelsData) {
      await client.query(
        `INSERT INTO reels (user_id, title, description, video_url, thumbnail_url, duration, view_count, like_count, comment_count, share_count, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW())`,
        [reel.user_id, reel.title, reel.description, reel.video_url, reel.thumbnail_url, 
         reel.duration, reel.view_count, reel.like_count, reel.comment_count, reel.share_count]
      );
      console.log(`✅ Created reel: ${reel.title}`);
      createdCount++;
    }

    await client.end();
    console.log(`✨ Reels seeding completed (${createdCount} new reels)\n`);
    return true;
  } catch (error) {
    console.error('❌ Reels seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedReels };
