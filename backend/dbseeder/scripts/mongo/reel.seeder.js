// Reel Seeder Script
// Usage: node scripts/reel.seeder.js

require('dotenv').config();
const mongoose = require('mongoose');
const Reel = require('../models/Reel');
const User = require('../models/User');
const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping reel.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';
const DEFAULT_VIDEO = '/uploads/reels/default-reel.mp4';

function validateMediaPath(mediaPath) {
  const absPath = path.join(__dirname, '..', mediaPath);
  if (fs.existsSync(absPath)) {
    return mediaPath;
  }
  return DEFAULT_VIDEO;
}

async function seedReels() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const user = await User.findOne();
  const product = await Product.findOne();
  if (!user || !product) {
    throw new Error('Missing user or product for reel seeding.');
  }

  const reels = Array.from({ length: 20 }, (_, i) => ({
    title: `Fashion Reel #${i + 1}`,
    description: `A stylish fashion reel number ${i + 1}.`,
    user: user._id,
    media: {
      type: 'video',
      url: validateMediaPath('/uploads/reels/sample-reel.mp4'),
      thumbnail: '/uploads/reels/sample-thumbnail.jpg',
      duration: 12 + i
    },
    caption: `Check out this new reel! (${i + 1})`,
    products: [
      { product: product._id, position: { x: 40 + i, y: 60 - i }, size: 'M', color: 'Black' }
    ],
    hashtags: ['reel', 'fashion'],
    mentions: []
  }));

  await Reel.deleteMany({});
  await Reel.insertMany(reels);
  console.log('Reels seeded successfully!');
  await mongoose.disconnect();
}

seedReels().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
