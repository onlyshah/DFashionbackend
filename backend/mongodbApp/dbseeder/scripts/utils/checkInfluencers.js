const models = require('../models_sql');

async function checkInfluencers() {
  try {
    const User = models._raw?.User || models.User;
    const influencers = await User.findAll({
      where: { isInfluencer: true },
      raw: true
    });

    console.log('\n✅ Influencers found:', influencers.length);
    influencers.forEach(u => {
      console.log(`  - ${u.username} (${u.email}): ${u.followers_count} followers`);
    });

    console.log('\n📊 All users count:');
    const allUsers = await User.findAll({ attributes: ['id'], raw: true });
    console.log(`  Total users: ${allUsers.length}`);

    console.log('\n🔍 Sample users:');
    const sample = await User.findAll({
      limit: 3,
      attributes: ['id', 'username', 'email', 'isInfluencer', 'followersCount'],
      raw: true
    });
    sample.forEach(u => {
      console.log(`  - ${u.username}: isInfluencer=${u.isInfluencer}, followers=${u.followersCount}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

checkInfluencers();
