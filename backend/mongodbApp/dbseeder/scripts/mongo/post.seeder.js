// Post Seeder
const User = require('../../../models/User');
const Product = require('../../../models/Product');
const Post = require('../../../models/Post');

async function seedPosts() {
  console.log('📸 Seeding posts...');
  
  const deletedCount = await Post.deleteMany({});
  console.log(`   Cleared ${deletedCount.deletedCount} existing posts`);
  
  const users = await User.find().limit(10);
  const products = await Product.find().limit(5);
  
  if (users.length === 0 || products.length === 0) {
    throw new Error('Users or products not found');
  }
  
  const postContents = [
    'Just got this amazing new outfit! Love the fit',
    'Fashion week was incredible! Check out these styles',
    'New collection just dropped! Available now at our store',
    'Winter essentials that will keep you warm and stylish',
    'Sustainable fashion is the way forward',
    'Sunday vibes with my favorite pieces',
    'Mixing colors and patterns like never before',
    'From desk to dinner - versatile style for every occasion',
    'Comfort meets elegance with these new arrivals',
    'Fashion is not about following trends'
  ];
  
  const posts = [];
  postContents.forEach((content, idx) => {
    posts.push({
      user: users[idx % users.length]._id,
      content,
      images: [{
        url: `/uploads/posts/post-${idx + 1}.jpg`,
        alt: 'Fashion post image'
      }],
      hashtags: ['fashion', 'style', 'ootd', 'fashionpost'].slice(0, 3),
      products: [products[idx % products.length]._id],
      engagement: {
        likes: Math.floor(Math.random() * 500) + 50,
        comments: Math.floor(Math.random() * 50) + 5,
        shares: Math.floor(Math.random() * 20) + 1,
        views: Math.floor(Math.random() * 5000) + 500
      },
      likedBy: users.slice(0, Math.floor(Math.random() * 3) + 1).map(u => u._id),
      isPublished: true,
      visibility: 'public'
    });
  });
  
  const result = await Post.insertMany(posts);
  console.log(`   ✅ Created ${result.length} posts`);
  
  return result;
}

module.exports = seedPosts;

