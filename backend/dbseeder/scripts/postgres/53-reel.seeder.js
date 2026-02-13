/**
 * REELS SEEDER
 * Seeds short video content
 */

const models = require('../../../models_sql');
const { v4: uuidv4 } = require('uuid');

async function seedReels() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Reel seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Reel = models._raw?.Reel || models.Reel;
    const User = models._raw?.User || models.User;

    if (!Reel || !Reel.create) throw new Error('Reel model not available');

    const creators = await User.findAll({ limit: 4 });

    if (creators.length === 0) {
      console.log('⚠️  Skipping Reel seeding - no users found');
      return true;
    }

    const count = await Reel.count();
    if (count > 0) {
      console.log(`✅ Reel data already exists (${count} records)`);
      return true;
    }

    const reels = creators.map((creator, idx) => ({
      id: uuidv4(),
      creatorId: creator.id,
      title: `Fashion Reel ${idx + 1}`,
      description: 'Short video showcasing latest fashion trends',
      videoUrl: `/videos/reel_${idx + 1}.mp4`,
      thumbnailUrl: `/images/reel_${idx + 1}.jpg`,
      duration: Math.floor(Math.random() * 60) + 15,
      views: Math.floor(Math.random() * 10000),
      likes: Math.floor(Math.random() * 5000),
      shares: Math.floor(Math.random() * 1000),
      status: 'published',
      publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    }));

    let createdCount = 0;
    for (const reel of reels) {
      try {
        await Reel.create(reel);
        createdCount++;
      } catch (err) {
        console.log(`⚠️  Reel creation skipped: ${err.message}`);
      }
    }

    console.log(`✨ Reel seeding completed (${createdCount} new reels)\n`);
    return true;
  } catch (error) {
    console.error('❌ Reel seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedReels };
