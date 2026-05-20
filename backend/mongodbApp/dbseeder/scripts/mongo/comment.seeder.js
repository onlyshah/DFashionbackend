// Comment Seeder
const User = require('../../../models/User');
const Post = require('../../../models/Post');
const Comment = require('../../../models/Comment');

async function seedComments() {
  console.log('💬 Seeding comments...');
  
  const deletedCount = await Comment.deleteMany({});
  console.log(`   Cleared ${deletedCount.deletedCount} existing comments`);
  
  const users = await User.find().limit(10);
  const posts = await Post.find().limit(5);
  
  if (users.length === 0 || posts.length === 0) {
    throw new Error('Users or posts not found');
  }
  
  const commentTexts = [
    'Love this style! Where can I get it?',
    'So stunning! This is exactly what I was looking for 😍',
    'Amazing! Need to add this to my collection',
    'This is perfection! Great choice',
    'Absolutely gorgeous! Following for more',
    'Love the color combination!',
    'This needs to be on everyone\'s wishlist'
  ];
  
  const comments = [];
  
  posts.forEach(post => {
    const numComments = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numComments; i++) {
      comments.push({
        post: post._id,
        user: users[i % users.length]._id,
        content: commentTexts[i % commentTexts.length],
        engagement: {
          likes: Math.floor(Math.random() * 20) + 1,
          comments: 0,
          shares: 0,
          views: Math.floor(Math.random() * 100) + 10
        },
        likedBy: users.slice(0, Math.floor(Math.random() * 2) + 1).map(u => u._id),
        isApproved: true
      });
    }
  });
  
  const result = await Comment.insertMany(comments);
  console.log(`   ✅ Created ${result.length} comments`);
  
  return result;
}

module.exports = seedComments;

