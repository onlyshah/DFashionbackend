// Story Seeder Script
// Usage: node scripts/story.seeder.js

const mongoose = require('mongoose');
const Story = require('../models/Story');
const User = require('../models/User');
const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';
const DEFAULT_IMAGE = '/uploads/stories/default-story.jpg';

function validateMediaPath(mediaPath) {
  const absPath = path.join(__dirname, '..', mediaPath);
  if (fs.existsSync(absPath)) {
    return mediaPath;
  }
  return DEFAULT_IMAGE;
}

async function seedStories() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const users = await User.find({});
  const product = await Product.findOne();
  if (!users.length || !product) {
    throw new Error('Missing users or product for story seeding.');
  }
  const colors = ['Red', 'Blue', 'Green', 'Black', 'White'];
  const sizes = ['S', 'M', 'L', 'XL'];
  const storyImages = [
    '/uploads/stories/story-1.jpg','/uploads/stories/story-2.jpg','/uploads/stories/story-3.jpg','/uploads/stories/story-4.jpg','/uploads/stories/story-5.jpg','/uploads/stories/story-6.jpg','/uploads/stories/story-7.jpg','/uploads/stories/story-8.jpg','/uploads/stories/story-9.jpg','/uploads/stories/story-10.jpg','/uploads/stories/story-11.jpg','/uploads/stories/story-12.jpg','/uploads/stories/story-13.jpg','/uploads/stories/story-14.jpg','/uploads/stories/story-15.jpg','/uploads/stories/story-16.jpg','/uploads/stories/story-17.jpg','/uploads/stories/story-18.jpg','/uploads/stories/story-19.jpg','/uploads/stories/story-20.jpg','/uploads/stories/story-21.jpg','/uploads/stories/story-22.jpg','/uploads/stories/story-23.jpg','/uploads/stories/story-24.jpg','/uploads/stories/default-story.jpg'
  ];
  const stories = Array.from({ length: 25 }, (_, i) => ({
    title: `Story #${i + 1}`,
    user: users[i % users.length]._id,
    media: {
      type: 'image',
      url: validateMediaPath(storyImages[i % storyImages.length]),
      duration: 5 + (i % 5)
    },
    caption: `Discover our collection! (${i + 1})`,
    products: [
      { product: product._id, position: { x: 20 + i, y: 60 - i }, size: sizes[i % sizes.length], color: colors[i % colors.length] }
    ],
    hashtags: ['fashion', 'story', `tag${i + 1}`],
    mentions: []
  }));
  await Story.deleteMany({});
  await Story.insertMany(stories);
  console.log('Stories seeded successfully!');
  await mongoose.disconnect();
}

seedStories().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
