const { sequelize } = require('./models_sql');

async function directCheck() {
  await sequelize.authenticate();
  
  const r = await sequelize.query(
    'SELECT COUNT(*) as total, COUNT(CASE WHEN "userId" IS NULL THEN 1 END) as null_count FROM posts',
    { type: sequelize.QueryTypes.SELECT }
  );
  
  console.log('Posts Check:');
  console.log(JSON.stringify(r[0], null, 2));
  
  const r2 = await sequelize.query(
    'SELECT COUNT(*) as total, COUNT(CASE WHEN "userId" IS NULL THEN 1 END) as null_count FROM reels',
    { type: sequelize.QueryTypes.SELECT }
  );
  
  console.log('\nReels Check:');
  console.log(JSON.stringify(r2[0], null, 2));

  await sequelize.close();
}

directCheck();
