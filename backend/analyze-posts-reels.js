const { sequelize, Post, Reel, User } = require('./models_sql');

async function analyzeData() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');
    
    // Check Posts
    const posts = await sequelize.query(`
      SELECT id, "userId", title, content, "createdAt" 
      FROM posts 
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('📊 POSTS TABLE (Sample):\n');
    console.log(JSON.stringify(posts, null, 2));
    
    // Check Reels
    const reels = await sequelize.query(`
      SELECT id, "userId", "videoUrl", "createdAt" 
      FROM reels 
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('\n📊 REELS TABLE (Sample):\n');
    console.log(JSON.stringify(reels, null, 2));
    
    // Count NULL userIds
    const postsNullCount = await sequelize.query(`
      SELECT COUNT(*) as null_count FROM posts WHERE "userId" IS NULL
    `, { type: sequelize.QueryTypes.SELECT });
    
    const reelsNullCount = await sequelize.query(`
      SELECT COUNT(*) as null_count FROM reels WHERE "userId" IS NULL
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('\n📊 NULL USER ID ANALYSIS:\n');
    console.log(`Posts with NULL userId: ${postsNullCount[0].null_count}`);
    console.log(`Reels with NULL userId: ${reelsNullCount[0].null_count}`);
    
    // Check FK constraints
    const constraints = await sequelize.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name IN ('posts', 'reels') AND constraint_type = 'FOREIGN KEY'
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('\n📊 FOREIGN KEY CONSTRAINTS:\n');
    console.log(JSON.stringify(constraints, null, 2));
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sequelize.close();
  }
}

analyzeData();
