/**
 * LIVE STREAMS SEEDER
 * Seeds live shopping events
 */

const models = require('../../../models_sql');
const { v4: uuidv4 } = require('uuid');

async function seedLiveStreams() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting LiveStream seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const LiveStream = models._raw?.LiveStream || models.LiveStream;
    const User = models._raw?.User || models.User;

    if (!LiveStream || !LiveStream.create) throw new Error('LiveStream model not available');

    const hosts = await User.findAll({ limit: 3 });

    if (hosts.length === 0) {
      console.log('⚠️  Skipping LiveStream seeding - no users found');
      return true;
    }

    const count = await LiveStream.count();
    if (count > 0) {
      console.log(`✅ LiveStream data already exists (${count} records)`);
      return true;
    }

    const streams = hosts.map((host, idx) => ({
      id: uuidv4(),
      title: `Fashion Live Show ${idx + 1}`,
      description: `Live shopping event featuring trending fashion items`,
      hostId: host.id,
      status: ['live', 'upcoming', 'ended'][idx % 3],
      startTime: new Date(Date.now() + idx * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + (idx + 1) * 24 * 60 * 60 * 1000),
      streamUrl: `https://stream.example.com/live_${idx + 1}`,
      viewerCount: Math.floor(Math.random() * 5000),
      productCount: Math.floor(Math.random() * 20) + 5
    }));

    let createdCount = 0;
    for (const stream of streams) {
      try {
        await LiveStream.create(stream);
        createdCount++;
      } catch (err) {
        console.log(`⚠️  Stream creation skipped: ${err.message}`);
      }
    }

    console.log(`✨ LiveStream seeding completed (${createdCount} new streams)\n`);
    return true;
  } catch (error) {
    console.error('❌ LiveStream seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedLiveStreams };
