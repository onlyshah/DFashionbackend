// Post Seeder Script
// Usage: node scripts/post.seeder.js

require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const User = require('../models/User');
const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping post.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';
const DEFAULT_IMAGE = '/uploads/posts/default-post.jpg';

function validateMediaPath(mediaPath) {
  const absPath = path.join(__dirname, '..', mediaPath);
  if (fs.existsSync(absPath)) {
    return mediaPath;
  }
  return DEFAULT_IMAGE;
}

async function seedPosts() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const users = await User.find({ role: 'end_user' });
  const products = await Product.find();
  if (users.length === 0 || products.length === 0) {
    throw new Error('Missing users or products for post seeding.');
  }

  const captions = [
    'Check out this amazing product!',
    'Loving my new look!',
    'Fashion is my passion.',
    'This is a must-have!',
    'Perfect for any occasion.',
    'My favorite accessory.',
    'Style and comfort combined.',
    'Latest trend alert!',
    'Unboxing my new purchase.',
    'Ready for the weekend!',
    'Classic never goes out of style.',
    'Gifted myself something special.',
    'Wardrobe upgrade!',
    'Mix and match magic.',
    'Statement piece.',
    'Everyday essentials.',
    'Feeling fabulous!',
    'OOTD vibes.',
    'Can’t get enough of this!',
    'Leveling up my style.'
  ];
  const posts = Array.from({ length: 20 }, (_, i) => {
    const user = users[i % users.length];
    const product = products[i % products.length];
    return {
      user: user._id,
      caption: captions[i % captions.length],
      media: [
        { type: 'image', url: validateMediaPath(`/uploads/posts/post${(i%10)+1}.jpg`), alt: `Post ${i+1}` }
      ],
      products: [
        { product: product._id, position: { x: 50, y: 50 }, size: 'M', color: 'Gold', isMainProduct: true }
      ],
      hashtags: ['fashion', 'trending'],
      mentions: [],
      likes: [],
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  // Clean slate to avoid duplicates
  await Post.deleteMany({});
  await Post.insertMany(posts);
  console.log('Posts seeded successfully!');
  await mongoose.disconnect();
}

seedPosts().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
