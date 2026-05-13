const models = require('../models_sql');

(async () => {
  try {
    await models.getSequelizeInstance();
    const User = models._raw?.User || models.User;
    if (!User) {
      console.error('User model not found');
      process.exit(1);
    }

    const users = await User.findAll({ paranoid: false, raw: true });
    console.log('Total users:', users.length);
    for (const u of users) {
      console.log(u.email, 'isInfluencer=', u.isInfluencer, 'followersCount=', u.followersCount, 'has is_influencer=', u.hasOwnProperty('is_influencer'), 'has followers_count=', u.hasOwnProperty('followers_count'));
    }
    process.exit(0);
  } catch (e) {
    console.error('Error', e.message);
    process.exit(1);
  }
})();