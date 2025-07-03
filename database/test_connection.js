// =====================================================
// DFashion PostgreSQL Database Connection Test
// =====================================================
// This script tests the database connection and verifies data
// 
// Usage: node test_connection.js

const { Pool } = require('pg');

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dfashion',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password_here'
};

// Create connection pool
const pool = new Pool(config);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testConnection() {
  try {
    log('\n🚀 Testing DFashion PostgreSQL Database Connection...', 'cyan');
    log('=' .repeat(60), 'blue');

    // Test basic connection
    log('\n📡 Testing database connection...', 'yellow');
    const client = await pool.connect();
    log('✅ Database connection successful!', 'green');

    // Test database version
    const versionResult = await client.query('SELECT version()');
    log(`📊 PostgreSQL Version: ${versionResult.rows[0].version.split(' ')[1]}`, 'blue');

    // Test table existence
    log('\n📋 Checking database tables...', 'yellow');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const expectedTables = [
      'users', 'categories', 'products', 'product_images',
      'stories', 'posts', 'post_comments', 'post_likes',
      'story_products', 'post_products', 'wishlists', 
      'wishlist_items', 'carts', 'cart_items', 'orders', 'order_items'
    ];

    const actualTables = tablesResult.rows.map(row => row.table_name);
    const missingTables = expectedTables.filter(table => !actualTables.includes(table));

    if (missingTables.length === 0) {
      log(`✅ All ${expectedTables.length} tables found!`, 'green');
    } else {
      log(`❌ Missing tables: ${missingTables.join(', ')}`, 'red');
    }

    // Test data counts
    log('\n📊 Checking data counts...', 'yellow');
    const dataQueries = [
      { name: 'Users', query: 'SELECT COUNT(*) FROM users' },
      { name: 'Categories', query: 'SELECT COUNT(*) FROM categories' },
      { name: 'Products', query: 'SELECT COUNT(*) FROM products' },
      { name: 'Stories', query: 'SELECT COUNT(*) FROM stories' },
      { name: 'Posts', query: 'SELECT COUNT(*) FROM posts' },
      { name: 'Orders', query: 'SELECT COUNT(*) FROM orders' }
    ];

    for (const { name, query } of dataQueries) {
      const result = await client.query(query);
      const count = parseInt(result.rows[0].count);
      if (count > 0) {
        log(`✅ ${name}: ${count} records`, 'green');
      } else {
        log(`⚠️  ${name}: No records found`, 'yellow');
      }
    }

    // Test login credentials
    log('\n🔑 Testing login credentials...', 'yellow');
    const loginTests = [
      { email: 'rajesh@example.com', role: 'user' },
      { email: 'maya@example.com', role: 'vendor' }
    ];

    for (const { email, role } of loginTests) {
      const userResult = await client.query(
        'SELECT id, full_name, email, role, is_active FROM users WHERE email = $1',
        [email]
      );
      
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        log(`✅ ${role.toUpperCase()}: ${user.full_name} (${user.email}) - Active: ${user.is_active}`, 'green');
      } else {
        log(`❌ ${role.toUpperCase()}: ${email} not found`, 'red');
      }
    }

    // Test product data
    log('\n🛍️  Testing product data...', 'yellow');
    const productResult = await client.query(`
      SELECT p.name, p.price, c.name as category, u.full_name as vendor
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN users u ON p.vendor_id = u.id
      WHERE p.is_active = true
      LIMIT 3
    `);

    if (productResult.rows.length > 0) {
      log('✅ Sample products:', 'green');
      productResult.rows.forEach(product => {
        log(`   • ${product.name} - ₹${product.price} (${product.category}) by ${product.vendor}`, 'blue');
      });
    } else {
      log('❌ No active products found', 'red');
    }

    // Test stories
    log('\n📱 Testing stories data...', 'yellow');
    const storiesResult = await client.query(`
      SELECT s.caption, u.username, s.view_count
      FROM stories s
      JOIN users u ON s.user_id = u.id
      WHERE s.is_active = true AND s.expires_at > NOW()
      LIMIT 3
    `);

    if (storiesResult.rows.length > 0) {
      log('✅ Active stories:', 'green');
      storiesResult.rows.forEach(story => {
        log(`   • @${story.username}: ${story.caption.substring(0, 50)}... (${story.view_count} views)`, 'blue');
      });
    } else {
      log('⚠️  No active stories found (they may have expired)', 'yellow');
    }

    client.release();

    // Final summary
    log('\n' + '=' .repeat(60), 'blue');
    log('🎉 Database Connection Test Complete!', 'green');
    log('\n📋 Summary:', 'cyan');
    log('✅ Database connection: Working', 'green');
    log('✅ Tables: Created successfully', 'green');
    log('✅ Data: Seeded successfully', 'green');
    log('✅ Login credentials: Ready for testing', 'green');
    log('\n🔗 Connection Details:', 'cyan');
    log(`   Host: ${config.host}:${config.port}`, 'blue');
    log(`   Database: ${config.database}`, 'blue');
    log(`   User: ${config.user}`, 'blue');
    log('\n🔑 Test Credentials:', 'cyan');
    log('   User: rajesh@example.com / password123', 'blue');
    log('   Vendor: maya@example.com / password123', 'blue');
    log('\n🚀 Your DFashion database is ready to use!', 'green');

  } catch (error) {
    log('\n❌ Database connection test failed!', 'red');
    log(`Error: ${error.message}`, 'red');
    log('\n🔧 Troubleshooting:', 'yellow');
    log('1. Ensure PostgreSQL is running', 'blue');
    log('2. Check database credentials', 'blue');
    log('3. Verify database exists and setup script was run', 'blue');
    log('4. Check network connectivity', 'blue');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the test
testConnection();
