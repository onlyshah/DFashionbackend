// Master Seeder Script
// Usage: node scripts/master.seeder.js
// Routes to appropriate seeder based on DB_MODE
// DB_MODE values: postgres | mongo | both

require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');

// DATABASE MODE: postgres | mongo | both
const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
const VALID_MODES = ['postgres', 'mongo', 'both'];
if (!VALID_MODES.includes(DB_MODE)) {
  console.error(`❌ Invalid DB_MODE: "${DB_MODE}". Must be one of: ${VALID_MODES.join(', ')}`);
  process.exit(1);
}

const runPostgres = DB_MODE === 'postgres' || DB_MODE === 'both';
const runMongo = DB_MODE === 'mongo' || DB_MODE === 'both';
const DRY_RUN = (process.env.MASTER_DRY_RUN || '').toLowerCase() === '1' || (process.env.MASTER_DRY_RUN || '').toLowerCase() === 'true';
const AUTO_DETECT = (process.env.MASTER_AUTO_DETECT || '').toLowerCase() === '1' || (process.env.MASTER_AUTO_DETECT || '').toLowerCase() === 'true';

// PostgreSQL Master Seeder (handles all Postgres tables)
const postgresSeeder = 'PostgreMaster.js';

// MongoDB seeders (Mongoose-based)
const mongooseSeedersList = [
  // 1. System initialization
  'bootstrap.seeder.js',            // Initial setup (superadmin, core module, base role)
  
  // 2. Core system and security
  'permission-management.seeder.js', // Permissions configuration
  'module.seeder.js',               // System modules
  'role.seeder.js',                 // User roles
  'role-permission.seeder.js',      // Role-permission mappings
  
  // 3. User management
  'user.seeder.js',                 // All user types (includes vendors/sellers)
  'session.seeder.js',              // User sessions
  'sellers.seeder.js',              // Vendor/seller profiles with KYC and commission data
  
  // 4. Content management
  'category.seeder.js',             // Product categories
  'product.seeder.js',              // Products catalog
  'productComment.seeder.js',       // Product comments/reviews
  'productShare.seeder.js',         // Product sharing data
  'post.seeder.js',                 // User posts
  'story.seeder.js',                // User stories
  'reel.seeder.js',                 // Video reels
  'styleInspiration.seeder.js',     // Style guides
  
  // 5. E-commerce core
  'cart.seeder.js',                 // Shopping carts
  'wishlist.seeder.js',             // User wishlists
  'order.seeder.js',                // Purchase orders
  'payment.seeder.js',              // Payment records
  
  // 6. Returns management (depends on orders)
  'returns.seeder.js',              // Return records with refund data
  
  // 7. Logistics and shipping (depends on orders)
  'logistics.seeder.js',            // Couriers, shipments, and shipping charges
  
  // 8. Promotions and marketing (depends on products)
  'promotions.seeder.js',           // Coupons, flash sales, campaigns
  'livestream.seeder.js',           // Live commerce streams
  'marketing.seeder.js',            // Marketing campaigns, coupons, flash sales
  
  // 9. CMS content
  'cms.seeder.js',                  // Pages, banners, FAQs
  
  // 10. KYC and compliance (depends on sellers)
  'kycDocument.seeder.js',          // KYC document records for sellers
  
  // 11. Engagement and gamification
  'reward.seeder.js',               // User rewards
  'notification.seeder.js',         // System notifications
  
  // 12. Search and discovery
  'searchHistory.seeder.js',        // User search history
  'searchSuggestion.seeder.js',     // Search suggestions
  'trendingSearch.seeder.js',       // Trending searches
  
  // 13. Analytics and tracking
  'userBehavior.seeder.js',         // User behavior analytics
  
  // 14. Demo data scripts (if needed)
  'download_demo_product_images.js', // Download product images
  'cleanup_and_replace_images.js',   // Clean up image assets
];

// Select appropriate seeders based on DB_TYPE (selection deferred to prepareSeedPlan)
const fs = require('fs');
const net = require('net');
let seeders = [];
let runners = [];

// Files that are NOT seeders and should be ignored when auto-discovering
const NON_SEEDER_NAMES = [
  path.basename(__filename),
  'generate_frontend_models.js',
  'runAllPostgresSeeders.js',
  'run_seed_postgres.ps1',
  'checkPostgresUser.js',
  'create_mongo_superadmin.js',
  'create_postgres_superadmin.js',
  'testPostgres.js',
  '.env.example',
  'list_seed_candidates.js',
  'mongoToPostgresAdapter.js'
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

const checkTcp = (host, port, timeout = 1500) => new Promise((resolve) => {
  const socket = new net.Socket();
  let called = false;
  socket.setTimeout(timeout);
  socket.once('connect', () => { called = true; socket.destroy(); resolve(true); });
  socket.once('timeout', () => { if (!called) { called = true; socket.destroy(); resolve(false); } });
  socket.once('error', () => { if (!called) { called = true; socket.destroy(); resolve(false); } });
  socket.connect(port, host);
});

const checkHttpUrl = (urlString, timeout = 1500) => new Promise((resolve) => {
  try {
    const u = new URL(urlString);
    const lib = u.protocol === 'https:' ? require('https') : require('http');
    const opts = {
      method: 'GET',
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname || '/',
      timeout
    };
    const req = lib.request(opts, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  } catch (e) { resolve(false); }
});

const detectBackend = async () => {
  // Prefer explicit BACKEND_URL / API_URL env vars; fallback to localhost and common ports
  const candidates = [process.env.BACKEND_URL, process.env.API_URL, process.env.SERVER_URL, process.env.BASE_URL, process.env.APP_URL].filter(Boolean);
  if (candidates.length > 0) {
    for (const c of candidates) {
      const ok = await checkHttpUrl(c, 1000);
      if (ok) return { url: c, ok: true };
    }
    return { url: candidates[0], ok: false };
  }
  const host = process.env.BACKEND_HOST || process.env.HOST || 'localhost';
  const port = process.env.BACKEND_PORT || process.env.PORT || process.env.SERVER_PORT || '3000';
  const guess = `http://${host}:${port.replace(/^:\/?\/?/, '')}`;
  const ok = await checkHttpUrl(guess, 1000);
  return { url: guess, ok };
};

const parseMongoHostPort = (uri) => {
  if (!uri) return null;
  try {
    const m = uri.match(/mongodb(?:\+srv)?:\/\/(?:[^@]+@)?([^\/?]+)(?:\/.+)?/i);
    if (!m) return null;
    const hostpart = m[1];
    if (hostpart.includes(',')) {
      const first = hostpart.split(',')[0];
      const [h, p] = first.split(':');
      return { host: h, port: p ? parseInt(p, 10) : 27017, srv: uri.includes('+srv') };
    }
    const [host, port] = hostpart.split(':');
    return { host, port: port ? parseInt(port, 10) : 27017, srv: uri.includes('+srv') };
  } catch (err) {
    return null;
  }
};

const detectDatabases = async () => {
  const pgHost = process.env.PGHOST || process.env.DB_HOST || process.env.DB_HOSTNAME || 'localhost';
  const pgPort = parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10) || 5432;
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  const mongo = parseMongoHostPort(mongoUri);
  const result = { pg: false, mongo: false };
  try { result.pg = await checkTcp(pgHost, pgPort, 1000); } catch (e) { result.pg = false; }
  if (mongo) {
    if (mongo.srv) { result.mongo = true; }
    else { try { result.mongo = await checkTcp(mongo.host, mongo.port || 27017, 1000); } catch (e) { result.mongo = false; } }
  }
  return result;
};

const prepareSeedPlan = async () => {
  // DB_MODE is already set at top: postgres | mongo | both
  // No need for auto-detect unless explicitly requested
  
  if (AUTO_DETECT && DB_MODE === 'both') {
    console.log('🔎 Auto-detecting available databases...');
    try {
      const avail = await detectDatabases();
      console.log(`   Postgres reachable: ${avail.pg}`);
      console.log(`   Mongo reachable: ${avail.mongo}`);
    } catch (err) {
      console.warn('Auto-detect failed, proceeding with both mode:', err.message);
    }
  }

  let localSeeders = [];
  let localRunners = [];

  if (runPostgres && !runMongo) {
    // DB_MODE=postgres: ONLY run PostgreMaster seeder (handles all Postgres tables)
    localSeeders = [postgresSeeder];
    console.log(`✅ DB_MODE=postgres: Running PostgreSQL Master Seeder`);
    console.log('   Will seed all Postgres-available tables');
    console.log('   MongoDB will NOT be accessed or connected to');
    console.log('ℹ️  Seeder to execute:');
    console.log('   -', postgresSeeder);
  } else if (!runPostgres && runMongo) {
    // DB_MODE=mongo: only run Mongo seeders
    localSeeders = mongooseSeedersList;
    console.log(`✅ DB_MODE=mongo: Running ONLY MongoDB seeders`);
    console.log('   PostgreSQL seeders will be skipped');
    console.log('ℹ️  Seeders to execute:');
    localSeeders.forEach(s => console.log('   -', s));
  } else if (runPostgres && runMongo) {
    // DB_MODE=both: run both sets of seeders in sequence
    console.log(`✅ DB_MODE=both: Running BOTH PostgreSQL and MongoDB seeders`);
    console.log('--- PostgreSQL:');
    console.log('   -', postgresSeeder);
    console.log('\n--- MongoDB seeders:');
    mongooseSeedersList.forEach(s => console.log('   -', s));
    localRunners.push({ label: 'PostgreSQL', scripts: [postgresSeeder] });
    localRunners.push({ label: 'MongoDB', scripts: mongooseSeedersList });
  }

  return { seeders: localSeeders, runners: localRunners };
};
 

// No files to delete - we'll keep all scripts
const filesToDelete = [];

const deleteFiles = () => {
  const fs = require('fs');
  filesToDelete.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted duplicate/obsolete seeder: ${file}`);
      } catch (err) {
        console.warn(`Warning: Could not delete ${file}:`, err.message);
      }
    }
  });
};

const runSeeders = async () => {
  // Ensure detection/plan is prepared so printed mode matches reality
  const plan = await prepareSeedPlan();
  seeders = plan.seeders;
  runners = plan.runners;

  // Detect backend server availability for API-based seeders
  let backendInfo = { url: null, ok: false };
  try {
    backendInfo = await detectBackend();
  } catch (e) {
    backendInfo = { url: null, ok: false };
  }
  const backendReachable = backendInfo.ok;
  if (backendInfo.url) console.log(`🔎 Backend URL checked: ${backendInfo.url} — reachable: ${backendReachable}`);

  const modeLabel = runPostgres && runMongo ? 'Postgres+Mongo' : (runPostgres ? 'PostgreSQL' : (runMongo ? 'MongoDB' : 'None'));
  console.log(`\n🌱 Starting ${modeLabel} seeding process...${DRY_RUN ? ' (dry-run)' : ''}\n`);

  let successful = 0;
  let failed = 0;
  const errors = [];

  const execOne = (seeder) => {
    const seederPath = path.join(__dirname, seeder);
    if (DRY_RUN) {
      console.log(`📍 (dry-run) Would run: ${seeder}`);
      return true;
    }
    try {
      // Skip API-dependent scripts when backend is not running
      const apiScripts = ['seedViaAPI.js', 'testLoginRequest.js', 'seedViaBackendAPI.js'];
      if (!backendReachable && apiScripts.includes(seeder)) {
        console.warn(`⚠️  Skipping API-dependent seeder (backend not reachable): ${seeder}`);
        return true; // count as success/skip
      }
      console.log(`📍 Running: ${seeder}`);
      // Run seeders from backend root so relative requires inside seeders work
      const backendRoot = path.resolve(__dirname, '..');
      execSync(`node "${seederPath}"`, { stdio: 'inherit', cwd: backendRoot });
      console.log(`✅ Completed: ${seeder}\n`);
      return true;
    } catch (err) {
      console.error(`❌ Error in ${seeder}:`, err.message);
      errors.push({ seeder, error: err.message });
      return false;
    }
  };

  if (runners.length) {
    // run each group's scripts in order
    for (const group of runners) {
      console.log(`\n--- Running group: ${group.label} (${group.scripts.length} scripts) ---\n`);
      for (const seeder of group.scripts) {
        const ok = execOne(seeder);
        if (ok) successful++; else failed++;
      }
    }
  } else {
    // single list mode
    // ensure seeders/runners prepared (in case prepareSeedPlan was not called yet)
    if ((!seeders || seeders.length === 0) && (!runners || runners.length === 0)) {
      const plan = await prepareSeedPlan();
      seeders = plan.seeders;
      runners = plan.runners;
      // update run flags for reporting
      runPostgres = plan.runPostgres;
      runMongo = plan.runMongo;
    }
    for (const seeder of seeders) {
      const ok = execOne(seeder);
      if (ok) successful++; else failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✨ Seeding process completed!`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(60));
  
  if (errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    errors.forEach(({ seeder, error }) => {
      console.log(`  - ${seeder}: ${error}`);
    });
  }
  
  return failed === 0;
};

(async () => {
  try {
    const success = await runSeeders();
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('Master seeder failed:', err);
    process.exit(1);
  }
})();
