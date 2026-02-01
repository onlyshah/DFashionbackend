// Product Share Seeder Script
require('dotenv').config();
const mongoose = require('mongoose');
const ProductShare = require('../models/ProductShare');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping productShare.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

const seedData = [
  {
    product_id: '507f1f77bcf86cd799439011',
    user_id: '507f1f77bcf86cd799439001',
    platform: 'facebook',
    shareUrl: 'https://facebook.com/share/product1',
    sharedBy: '507f1f77bcf86cd799439001',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    product_id: '507f1f77bcf86cd799439012',
    user_id: '507f1f77bcf86cd799439002',
    platform: 'instagram',
    shareUrl: 'https://instagram.com/share/product2',
    sharedBy: '507f1f77bcf86cd799439002',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    product_id: '507f1f77bcf86cd799439013',
    user_id: '507f1f77bcf86cd799439003',
    platform: 'twitter',
    shareUrl: 'https://twitter.com/share/product3',
    sharedBy: '507f1f77bcf86cd799439003',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    product_id: '507f1f77bcf86cd799439014',
    user_id: '507f1f77bcf86cd799439004',
    platform: 'whatsapp',
    shareUrl: 'https://wa.me/share/product4',
    sharedBy: '507f1f77bcf86cd799439004',
    createdAt: new Date(),
    updatedAt: new Date()
  },
];

async function seedProductShares() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  
  // Clean existing data
  await ProductShare.deleteMany({});
  
  // Convert string IDs to MongoDB ObjectIds
  const shares = seedData.map(share => ({
    product: new mongoose.Types.ObjectId(share.product_id),
    user: new mongoose.Types.ObjectId(share.user_id),
    platform: share.platform,
    shareUrl: share.shareUrl,
    sharedBy: new mongoose.Types.ObjectId(share.sharedBy),
    createdAt: share.createdAt,
    updatedAt: share.updatedAt
  }));
  
  // Insert new data
  await ProductShare.insertMany(shares);
  console.log('ProductShares seeded successfully!');
  await mongoose.disconnect();
}

seedProductShares().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
