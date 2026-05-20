// Follow Seeder
const User = require('../../../models/User');
const Follow = require('../../../models/Follow');

async function seedFollows() {
  console.log('👥 Seeding follows...');
  
  const deletedCount = await Follow.deleteMany({});
  console.log(`   Cleared ${deletedCount.deletedCount} existing follows`);
  
  const users = await User.find().limit(10);
  
  if (users.length === 0) {
    throw new Error('Users not found');
  }
  
  const follows = [];
  
  // Create follow relationships between users
  users.forEach((user, userIdx) => {
    const followCount = Math.floor(Math.random() * 3) + 1;
    const followedUsers = [];
    
    // Create unique follows
    for (let i = 1; i <= followCount; i++) {
      const targetIdx = (userIdx + i) % users.length;
      if (targetIdx !== userIdx) {
        followedUsers.push(targetIdx);
      }
    }
    
    followedUsers.forEach(targetIdx => {
      follows.push({
        follower: users[userIdx]._id,
        following: users[targetIdx]._id,
        status: 'active'
      });
    });
  });
  
  const result = await Follow.insertMany(follows);
  console.log(`   ✅ Created ${result.length} follows`);
  
  return result;
}

module.exports = seedFollows;

