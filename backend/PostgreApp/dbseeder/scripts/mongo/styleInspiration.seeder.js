// Style Inspiration Seeder Script
require('dotenv').config();
const mongoose = require('mongoose');
const StyleInspiration = require('../models/StyleInspiration');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping styleInspiration.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

const seedData = [
  {
    user_id: '507f1f77bcf86cd799439001',
    title: 'Summer Chic',
    description: 'Light and breezy summer styles for 2025.',
    imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600',
    tags: ['summer', 'casual', 'beach'],
    likes: 245,
    views: 1200,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    user_id: '507f1f77bcf86cd799439002',
    title: 'Urban Streetwear',
    description: 'Trendy streetwear looks for city life.',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600',
    tags: ['streetwear', 'urban', 'trendy'],
    likes: 189,
    views: 890,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    user_id: '507f1f77bcf86cd799439003',
    title: 'Minimalist Office',
    description: 'Clean and professional outfits for work.',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600',
    tags: ['office', 'professional', 'minimalist'],
    likes: 156,
    views: 720,
    createdAt: new Date(),
    updatedAt: new Date()
  },
];

async function seedStyleInspirations() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  
  // Clean existing data
  await StyleInspiration.deleteMany({});
  
  // Convert string IDs to MongoDB ObjectIds and prepare documents
  const inspirations = seedData.map(inspiration => ({
    user: new mongoose.Types.ObjectId(inspiration.user_id),
    title: inspiration.title,
    description: inspiration.description,
    imageUrl: inspiration.imageUrl,
    tags: inspiration.tags,
    likes: inspiration.likes,
    views: inspiration.views,
    createdAt: inspiration.createdAt,
    updatedAt: inspiration.updatedAt
  }));
  
  // Insert new data
  await StyleInspiration.insertMany(inspirations);
  console.log('StyleInspirations seeded successfully!');
  await mongoose.disconnect();
}

seedStyleInspirations().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
