const mongoose = require('mongoose');
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const User = require('../models/User');
const Product = require('../models/Product');

/**
 * Seed Social Engagement Data
 * Run: node scripts/seedSocialEngagement.js
 */
async function seedSocialEngagement() {
  try {
    console.log('🌱 Starting social engagement seed...');

    // Get sample users and products
    const users = await User.find().limit(5);
    const products = await Product.find().limit(10);

    if (users.length === 0 || products.length === 0) {
      console.log('⚠️  Need at least 5 users and 10 products. Please seed those first.');
      return;
    }

    // Clear existing posts and reels
    await Post.deleteMany({});
    await Reel.deleteMany({});
    console.log('✓ Cleared existing posts and reels');

    // Seed Posts
    const postCaptions = [
      'Love this new collection! 🌟 Perfect for spring outings. #fashion #style #ootd',
      'Just got these amazing sneakers and I\'m obsessed! Comfort meets style. 👟 #sneakers #fashionblogger',
      'Weekend vibes in this elegant dress. Who else loves dressing up? ✨ #dresscode #fashionista',
      'Casual but make it stylish! Pair your favorite tee with tailored pants. #casualstyle #fashionadvice',
      'Summer collection is here! Bright colors and lightweight fabrics for hot days. ☀️ #summer #fashion',
      'Statement accessory game on point! This bag is my new obsession. 👜 #accessories #styleicon',
      'Denim never goes out of style. Classic and versatile for any occasion. #denimforever #fashion',
      'Festival fit ready! Check out this amazing ethnic wear collection. 🎉 #festivalfashion #ethnicwear',
    ];

    const posts = [];
    for (let i = 0; i < 8; i++) {
      const user = users[i % users.length];
      const selectedProducts = [products[i % products.length]];

      const post = new Post({
        user: user._id,
        caption: postCaptions[i],
        media: [
          {
            type: 'image',
            url: `https://picsum.photos/600/400?random=${i}`,
            alt: `Post ${i + 1}`
          }
        ],
        products: selectedProducts.map(p => ({
          product: p._id,
          isMainProduct: true,
          clickCount: Math.floor(Math.random() * 100),
          purchaseCount: Math.floor(Math.random() * 20)
        })),
        hashtags: ['fashion', 'style', 'ootd', 'fashionblogger', 'instagram'],
        likes: Array(Math.floor(Math.random() * 150) + 20).fill(null).map(() => ({
          user: users[Math.floor(Math.random() * users.length)]._id,
          likedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        })),
        comments: Array(Math.floor(Math.random() * 30) + 5).fill(null).map(() => ({
          user: users[Math.floor(Math.random() * users.length)]._id,
          text: ['Love it!', 'Amazing style!', 'Where can I buy?', 'So gorgeous!', 'Obsessed!'][Math.floor(Math.random() * 5)],
          likes: Array(Math.floor(Math.random() * 10)).fill(null).map(() => users[Math.floor(Math.random() * users.length)]._id)
        })),
        isActive: true,
        visibility: 'public',
        approved: Math.random() > 0.2, // 80% approved
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });

      posts.push(post);
    }

    await Post.insertMany(posts);
    console.log(`✓ Created ${posts.length} posts`);

    // Seed Reels
    const reelTitles = [
      'Quick styling tips for daily wear',
      'How to style oversized clothing',
      'Summer fashion haul',
      'Outfit transformation challenge',
      'Fashion trends for 2024',
      'Sustainable fashion guide',
      'Work-to-weekend outfit ideas',
      'How to accessorize like a pro'
    ];

    const reels = [];
    for (let i = 0; i < 8; i++) {
      const user = users[i % users.length];
      const duration = Math.floor(Math.random() * 50) + 15; // 15-65 seconds

      const reel = new Reel({
        user: user._id,
        title: reelTitles[i],
        description: `Check out this amazing fashion ${['tutorial', 'haul', 'transformation', 'inspiration'][Math.floor(Math.random() * 4)]}!`,
        media: {
          type: 'video',
          url: `https://example.com/reels/video-${i}.mp4`,
          thumbnail: `https://picsum.photos/400/600?random=${i + 100}`,
          duration,
          resolution: {
            width: 1080,
            height: 1920
          }
        },
        hashtags: ['fashion', 'ootd', 'reel', 'style', 'trending'],
        likes: Array(Math.floor(Math.random() * 300) + 50).fill(null).map(() => ({
          user: users[Math.floor(Math.random() * users.length)]._id,
          likedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        })),
        views: Math.floor(Math.random() * 5000) + 500,
        comments: Array(Math.floor(Math.random() * 50) + 10).fill(null).map(() => ({
          user: users[Math.floor(Math.random() * users.length)]._id,
          text: ['Amazing!', 'Love this!', 'So helpful!', 'Tutorial please!', 'Where to buy?'][Math.floor(Math.random() * 5)],
          likes: Array(Math.floor(Math.random() * 15)).fill(null).map(() => users[Math.floor(Math.random() * users.length)]._id)
        })),
        isPublished: true,
        approved: Math.random() > 0.15, // 85% approved
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });

      reels.push(reel);
    }

    await Reel.insertMany(reels);
    console.log(`✓ Created ${reels.length} reels`);

    console.log('✅ Social engagement seed completed successfully!');
    console.log(`📊 Statistics:`);
    console.log(`   - Posts: ${posts.length}`);
    console.log(`   - Reels: ${reels.length}`);
    console.log(`   - Total Likes: ${posts.reduce((sum, p) => sum + p.likes.length, 0) + reels.reduce((sum, r) => sum + r.likes.length, 0)}`);
    console.log(`   - Total Comments: ${posts.reduce((sum, p) => sum + p.comments.length, 0) + reels.reduce((sum, r) => sum + r.comments.length, 0)}`);

  } catch (error) {
    console.error('❌ Error seeding social engagement:', error);
  }
}

// Run if called directly
if (require.main === module) {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';
  
  mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => {
    console.log('📦 Connected to MongoDB');
    seedSocialEngagement().then(() => {
      mongoose.connection.close();
      process.exit(0);
    });
  }).catch(err => {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  });
}

module.exports = seedSocialEngagement;
