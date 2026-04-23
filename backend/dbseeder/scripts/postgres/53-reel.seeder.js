/**
 * REELS SEEDER
 * Seeds short video content
 */

const models = require('../../../models_sql');
const { v4: uuidv4 } = require('uuid');
const { createFashionArtwork } = require('../../utils/image-utils');

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
      // Update existing reels missing user_id to first creator
      try {
        const defaultCreator = creators[0];
        if (defaultCreator) {
          const [affected] = await Reel.update({ userId: defaultCreator.id, user_id: defaultCreator.id }, { where: { user_id: null } });
          console.log(`🔧 Updated ${affected} existing reels to set user_id`);
        }
      } catch (err) {
        console.warn('⚠️  Failed to update existing reels user_id:', err.message);
      }
      return true;
    }

    const reels = creators.map((creator, idx) => ({
      id: uuidv4(),
      userId: creator.id,
      user_id: creator.id,
      title: `Fashion Reel ${idx + 1}`,
      description: 'Short video showcasing latest fashion trends',
      videoUrl: idx % 2 === 0 ? '/uploads/reels/sample-reel.mp4' : '/uploads/reels/default-reel.mp4',
      video_url: idx % 2 === 0 ? '/uploads/reels/sample-reel.mp4' : '/uploads/reels/default-reel.mp4',
      thumbnailUrl: createFashionArtwork('reels', `Fashion Reel ${idx + 1}`, idx + 1, { subtitle: 'Short video' }),
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
