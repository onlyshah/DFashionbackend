const fs = require('fs');
const path = require('path');

const postgresSeedersList = [
  'seedPostgresBootstrap.js',
  'seedPostgresUsers.js',
  'seedPostgresAll.js',
  'bootstrap.seeder.js',
  'permission-management.seeder.js',
  'module.seeder.js',
  'role.seeder.js',
  'role-permission.seeder.js',
  'user.seeder.js',
  'session.seeder.js',
  'sellers.seeder.js',
  'category.seeder.js',
  'product.seeder.js',
  'productComment.seeder.js',
  'productShare.seeder.js',
  'post.seeder.js',
  'story.seeder.js',
  'reel.seeder.js',
  'styleInspiration.seeder.js',
  'cart.seeder.js',
  'wishlist.seeder.js',
  'order.seeder.js',
  'payment.seeder.js',
  'returns.seeder.js',
  'logistics.seeder.js',
  'promotions.seeder.js',
  'livestream.seeder.js',
  'marketing.seeder.js',
  'cms.seeder.js',
  'kycDocument.seeder.js',
  'reward.seeder.js',
  'notification.seeder.js',
  'searchHistory.seeder.js',
  'searchSuggestion.seeder.js',
  'trendingSearch.seeder.js',
  'userBehavior.seeder.js',
  'download_demo_product_images.js',
  'cleanup_and_replace_images.js',
];
const mongooseSeedersList = [
  'bootstrap.seeder.js',
  'permission-management.seeder.js',
  'module.seeder.js',
  'role.seeder.js',
  'role-permission.seeder.js',
  'user.seeder.js',
  'session.seeder.js',
  'sellers.seeder.js',
  'category.seeder.js',
  'product.seeder.js',
  'productComment.seeder.js',
  'productShare.seeder.js',
  'post.seeder.js',
  'story.seeder.js',
  'reel.seeder.js',
  'styleInspiration.seeder.js',
  'cart.seeder.js',
  'wishlist.seeder.js',
  'order.seeder.js',
  'payment.seeder.js',
  'returns.seeder.js',
  'logistics.seeder.js',
  'promotions.seeder.js',
  'livestream.seeder.js',
  'marketing.seeder.js',
  'cms.seeder.js',
  'kycDocument.seeder.js',
  'reward.seeder.js',
  'notification.seeder.js',
  'searchHistory.seeder.js',
  'searchSuggestion.seeder.js',
  'trendingSearch.seeder.js',
  'userBehavior.seeder.js',
  'download_demo_product_images.js',
  'cleanup_and_replace_images.js',
];

const NON_SEEDER_NAMES = [
  'master.seeder.js',
  'generate_frontend_models.js',
  'runAllPostgresSeeders.js',
  'run_seed_postgres.ps1',
  'checkPostgresUser.js',
  'create_mongo_superadmin.js',
  'create_postgres_superadmin.js',
  'testPostgres.js',
  '.env.example'
];

const orderScripts = (scripts, priorityList = []) => {
  const byPriority = [];
  const remaining = [];
  const normalizedPriority = priorityList.map(p => p.toLowerCase());
  for (const s of scripts) {
    const idx = normalizedPriority.indexOf(s.toLowerCase());
    if (idx >= 0) byPriority.push({ s, idx }); else remaining.push(s);
  }
  byPriority.sort((a, b) => a.idx - b.idx);
  return byPriority.map(x => x.s).concat(remaining.sort());
};

const scriptsDir = __dirname;
const all = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js'));
const candidates = all.filter(f => !NON_SEEDER_NAMES.includes(f));

const mongoPattern = /mongoose|mongodb|MongoClient|MONGO_URI|create_mongo_superadmin/i;
const pgPattern = /models_sql|_raw|sequelize|Sequelize|bulkCreate|findOrCreate|create\(|INSERT INTO|INSERT INTO/i;
const pg = [];
const mongo = [];
for (const s of candidates) {
  const content = fs.readFileSync(path.join(scriptsDir, s), 'utf8');
  // In Postgres mode, accept both Postgres and Mongo patterns as Postgres-compatible
  if (pgPattern.test(content) || mongoPattern.test(content)) pg.push(s); 
  else mongo.push(s);
}

const pgOrdered = orderScripts(pg, postgresSeedersList);
const mongoOrdered = orderScripts(mongo, mongooseSeedersList);

console.log('All candidate seeder JS files (excluding known helpers):', candidates.length);
console.log('\nPostgres candidates (' + pgOrdered.length + '):');
pgOrdered.forEach(s => console.log(' -', s));
console.log('\nMongo candidates (' + mongoOrdered.length + '):');
mongoOrdered.forEach(s => console.log(' -', s));
console.log('\nTotal planned (Postgres + Mongo):', pgOrdered.length + mongoOrdered.length);
