/**
 * Populate Empty Collections Seeder
 * Seeds: payments, wishlists, reels, stories, addresses
 */

const mongoose = require('mongoose');
const Payment = require('../../../models/Payment');
const Wishlist = require('../../../models/Wishlist');
const Reel = require('../../../models/Reel');
const Story = require('../../../models/Story');
const Address = require('../../../models/Address');
const Order = require('../../../models/Order');
const User = require('../../../models/User');
const Product = require('../../../models/Product');

const MONGO_URI = 'mongodb://localhost:27017/dfashion';

async function seedPayments() {
  console.log('📝 Seeding payments...');
  const deletedCount = await Payment.deleteMany({});
  console.log(`   Cleared ${deletedCount.deletedCount} existing payments`);

  const orders = await Order.find().populate('user').limit(10);
  if (!orders.length) throw new Error('No orders found');

  const payments = orders.map(order => ({
    order: order._id,
    user: order.user._id,
    amount: order.pricing.total || 5000,
    currency: 'INR',
    method: ['credit_card', 'debit_card', 'upi', 'wallet'][Math.floor(Math.random() * 4)],
    status: 'completed',
    transactionId: `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
    metadata: { cardLast4: '****1234', cardBrand: 'Visa' },
    createdAt: new Date()
  }));

  const result = await Payment.insertMany(payments);
  console.log(`   ✅ Created ${result.length} payments`);
  return result;
}

async function seedWishlists() {
  console.log('📝 Seeding wishlists...');
  const deletedCount = await Wishlist.deleteMany({});
  console.log(`   Cleared ${deletedCount.deletedCount} existing wishlists`);

  const users = await User.find({ role: 'end_user' }).limit(10);
  const products = await Product.find().limit(20);
  if (!users.length || !products.length) throw new Error('Need users and products');

  const wishlists = users.map((user, idx) => ({
    user: user._id,
    items: products
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 5) + 2)
      .map(product => ({ product: product._id, addedAt: new Date() })),
    isActive: true
  }));

  const result = await Wishlist.insertMany(wishlists);
  const itemCount = wishlists.reduce((sum, w) => sum + w.items.length, 0);
  console.log(`   ✅ Created ${result.length} wishlists with ${itemCount} total items`);
  return result;
}

async function seedReels() {
  console.log('📝 Seeding reels...');
  const deletedCount = await Reel.deleteMany({});
  console.log(`   Cleared ${deletedCount.deletedCount} existing reels`);

  const users = await User.find().limit(15);
  if (!users.length) throw new Error('No users found');

  const reels = Array.from({ length: 12 }, (_, idx) => ({
    user: users[idx % users.length]._id,
    title: `Fashion Reel #${idx + 1}`,
    description: `This is an awesome fashion video ${idx + 1}`,
    videoUrl: `/uploads/reels/reel-${idx + 1}.mp4`,
    thumbnail: `/uploads/thumbnails/reel-${idx + 1}.jpg`,
    duration: Math.floor(Math.random() * 55) + 5,
    likes: Math.floor(Math.random() * 5000),
    comments: Math.floor(Math.random() * 500),
    shares: Math.floor(Math.random() * 200),
    views: Math.floor(Math.random() * 50000),
    isPublished: true,
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
  }));

  const result = await Reel.insertMany(reels);
  console.log(`   ✅ Created ${result.length} reels`);
  return result;
}

async function seedStories() {
  console.log('📝 Seeding stories...');
  const deletedCount = await Story.deleteMany({});
  console.log(`   Cleared ${deletedCount.deletedCount} existing stories`);

  const users = await User.find().limit(20);
  if (!users.length) throw new Error('No users found');

  const stories = Array.from({ length: 15 }, (_, idx) => ({
    user: users[idx % users.length]._id,
    content: `Story content ${idx + 1}`,
    image: `/uploads/stories/story-${idx + 1}.jpg`,
    duration: 5,
    hashtags: ['fashion', 'style', 'trending'],
    visibility: 'public',
    isHighlight: idx < 3,
    engagement: {
      views: Math.floor(Math.random() * 10000),
      likes: Math.floor(Math.random() * 1000),
      shares: Math.floor(Math.random() * 100)
    },
    createdAt: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000)
  }));

  const result = await Story.insertMany(stories);
  console.log(`   ✅ Created ${result.length} stories`);
  return result;
}

async function seedAddresses() {
  console.log('📝 Seeding addresses...');
  const deletedCount = await Address.deleteMany({});
  console.log(`   Cleared ${deletedCount.deletedCount} existing addresses`);

  const users = await User.find().limit(15);
  if (!users.length) throw new Error('No users found');

  const addresses = [];
  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Chandigarh'];
  const states = ['Maharashtra', 'Delhi', 'Karnataka', 'Telangana', 'Tamil Nadu', 'Punjab', 'West Bengal', 'Punjab'];
  const addressTypes = ['home', 'work', 'other'];

  for (let i = 0; i < users.length; i++) {
    for (let j = 0; j < 2; j++) {
      addresses.push({
        user: users[i]._id,
        firstName: `User ${i + 1}`,
        lastName: `Address ${j + 1}`,
        email: `user${i + 1}@dfashion.com`,
        phoneNumber: `98${String(i).padStart(8, '0')}${j}000`,
        street: `${Math.floor(Math.random() * 1000)} Fashion Street`,
        buildingName: `Building ${String.fromCharCode(65 + j)}`,
        city: cities[Math.floor(Math.random() * cities.length)],
        state: states[Math.floor(Math.random() * states.length)],
        zipCode: String(Math.floor(100000 + Math.random() * 900000)),
        country: 'India',
        landmark: 'Near Shopping Mall',
        type: addressTypes[Math.floor(Math.random() * addressTypes.length)],
        isDefault: j === 0,
        instructions: `Delivery instructions for address ${j + 1}`,
        createdAt: new Date()
      });
    }
  }

  const result = await Address.insertMany(addresses);
  console.log(`   ✅ Created ${result.length} addresses`);
  return result;
}

async function seedEmptyCollections() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    await seedPayments();
    await seedWishlists();
    await seedReels();
    await seedStories();
    await seedAddresses();

    console.log('\n' + '═'.repeat(60));
    console.log('🎉 All empty collections seeded successfully!');
    console.log('═'.repeat(60));

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedEmptyCollections();
