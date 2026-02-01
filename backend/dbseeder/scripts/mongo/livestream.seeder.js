require('dotenv').config();
const mongoose = require('mongoose');
const LiveStream = require('../models/LiveStream');
const User = require('../models/User');
const Product = require('../models/Product');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping livestream.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const liveStreamSeeder = async () => {
  try {
    // Check if data already exists
    const existingCount = await LiveStream.countDocuments();
    if (existingCount > 0) {
      console.log(`✅ LiveStream seeder already ran (${existingCount} records exist)`);
      return;
    }

    // Get some users and products for references
    const users = await User.find({ role: { $in: ['vendor', 'end_user'] } }).limit(3);
    const products = await Product.find().limit(10);

    if (users.length === 0 || products.length === 0) {
      console.log('⚠️ Skipping LiveStream seeder: Not enough users or products');
      return;
    }

    const now = new Date();
    const liveStreams = [
      {
        title: 'Latest Fashion Trends 2024',
        description: 'Discover the hottest fashion trends for this season',
        category: 'fashion',
        thumbnail: 'https://via.placeholder.com/400x300?text=Fashion+Trends',
        createdBy: users[0]._id,
        status: 'live',
        scheduledAt: null,
        startedAt: new Date(now.getTime() - 30 * 60000), // 30 mins ago
        endedAt: null,
        viewers: [users[0]._id, users[1]?._id].filter(Boolean),
        totalViews: 245,
        pinnedProducts: products.slice(0, 3).map(p => p._id),
        chatMessages: [
          {
            userId: users[1]?._id || users[0]._id,
            username: users[1]?.name || users[0].name,
            message: 'Amazing collection!',
            timestamp: new Date(now.getTime() - 10 * 60000)
          },
          {
            userId: users[0]._id,
            username: users[0].name,
            message: 'Thanks for watching!',
            timestamp: new Date(now.getTime() - 5 * 60000)
          }
        ],
        orders: []
      },
      {
        title: 'Summer Collection Launch',
        description: 'Exclusive preview of our summer collection',
        category: 'fashion',
        thumbnail: 'https://via.placeholder.com/400x300?text=Summer+Collection',
        createdBy: users[1]?._id || users[0]._id,
        status: 'scheduled',
        scheduledAt: new Date(now.getTime() + 2 * 60 * 60000), // 2 hours from now
        startedAt: null,
        endedAt: null,
        viewers: [],
        totalViews: 0,
        pinnedProducts: products.slice(3, 6).map(p => p._id),
        chatMessages: [],
        orders: []
      },
      {
        title: 'Style Guide Q&A',
        description: 'Ask our fashion experts your styling questions',
        category: 'education',
        thumbnail: 'https://via.placeholder.com/400x300?text=Style+Guide',
        createdBy: users[2]?._id || users[0]._id,
        status: 'ended',
        scheduledAt: null,
        startedAt: new Date(now.getTime() - 120 * 60000), // 2 hours ago
        endedAt: new Date(now.getTime() - 30 * 60000), // 30 mins ago
        viewers: [users[0]._id, users[1]?._id, users[2]?._id].filter(Boolean),
        totalViews: 512,
        pinnedProducts: products.slice(6, 9).map(p => p._id),
        chatMessages: [
          {
            userId: users[0]._id,
            username: users[0].name,
            message: 'Great tips!',
            timestamp: new Date(now.getTime() - 60 * 60000)
          }
        ],
        orders: []
      }
    ];

    await LiveStream.insertMany(liveStreams);
    console.log(`✅ LiveStream seeder completed: ${liveStreams.length} records created`);
  } catch (error) {
    console.error('❌ LiveStream seeder error:', error.message);
    throw error;
  }
};

module.exports = liveStreamSeeder;
