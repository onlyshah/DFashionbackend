// Master Seeder Script
// Usage: node scripts/masterSeed.js

const { execSync } = require('child_process');

const seeders = [
  'category.seeder.js',
  'user.seeder.js',
  'product.seeder.js',
  'post.seeder.js',
  'story.seeder.js',
  'reward.seeder.js',
  'cart.seeder.js',
  'order.seeder.js',
  'notification.seeder.js',
  'payment.seeder.js',
  'module.seeder.js',
  'role.seeder.js',
  'wishlist.seeder.js',
  'productComment.seeder.js',
  'reel.seeder.js',
  'session.seeder.js',
  'searchHistory.seeder.js',
  'userBehavior.seeder.js'
];

(async () => {
  for (const seeder of seeders) {
    try {
      console.log(`\nRunning ${seeder}...`);
      execSync(`node ${__dirname}/${seeder}`, { stdio: 'inherit' });
    } catch (err) {
      console.error(`Seeder ${seeder} failed:`, err);
      process.exit(1);
    }
  }
  console.log('\nAll seeders completed successfully!');
})();
