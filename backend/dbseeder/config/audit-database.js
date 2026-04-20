/**
 * 📊 Comprehensive Database Audit
 * Analyzes data integrity, missing relationships, and NULL fields
 */

const { Sequelize } = require('sequelize');

(async () => {
  const s = new Sequelize({
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: '1234',
    database: 'dfashion',
    dialect: 'postgres',
    logging: false
  });
  
  try {
    await s.authenticate();
    console.log('✅ Connected to PostgreSQL\n');
    
    const issues = [];
    
    // 1. Check NULL values in critical fields
    console.log('🔍 STEP 1: Checking NULL values in critical fields...\n');
    
    const nullChecks = [
      {
        table: 'users',
        fields: ['email', 'username', 'password_hash', 'role_id'],
        description: 'User core fields'
      },
      {
        table: 'products',
        fields: ['title', 'price', 'category_id'],
        description: 'Product core fields'
      },
      {
        table: 'orders',
        fields: ['customer_id', 'total_amount', 'status'],
        description: 'Order core fields'
      },
      {
        table: 'carts',
        fields: ['user_id', 'product_id', 'quantity'],
        description: 'Cart core fields'
      },
      {
        table: 'posts',
        fields: ['user_id', 'content', 'product_ids'],
        description: 'Post core fields'
      },
      {
        table: 'stories',
        fields: ['user_id', 'media_url', 'product_ids'],
        description: 'Story core fields'
      }
    ];
    
    for (const check of nullChecks) {
      for (const field of check.fields) {
        const [result] = await s.query(
          `SELECT COUNT(*) as null_count FROM "${check.table}" WHERE "${field}" IS NULL`
        );
        const nullCount = parseInt(result[0].null_count);
        if (nullCount > 0) {
          issues.push({
            severity: 'HIGH',
            table: check.table,
            field: field,
            issue: `${nullCount} NULL values found`,
            description: check.description
          });
        }
      }
    }
    
    // 2. Check orphaned records (Foreign key violations)
    console.log('🔗 STEP 2: Checking for orphaned records...\n');
    
    // Carts with invalid user_id
    const [invalidCarts] = await s.query(`
      SELECT COUNT(*) as count FROM carts c
      WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = c.user_id)
    `);
    if (parseInt(invalidCarts[0].count) > 0) {
      issues.push({
        severity: 'CRITICAL',
        table: 'carts',
        field: 'user_id',
        issue: `${invalidCarts[0].count} carts with invalid user_id`,
        description: 'Orphaned cart records'
      });
    }
    
    // Wishlist with invalid user_id
    const [invalidWishlist] = await s.query(`
      SELECT COUNT(*) as count FROM wishlists w
      WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = w.user_id)
    `);
    if (parseInt(invalidWishlist[0].count) > 0) {
      issues.push({
        severity: 'CRITICAL',
        table: 'wishlists',
        field: 'user_id',
        issue: `${invalidWishlist[0].count} wishlist items with invalid user_id`,
        description: 'Orphaned wishlist records'
      });
    }
    
    // Posts with invalid user_id
    const [invalidPosts] = await s.query(`
      SELECT COUNT(*) as count FROM posts p
      WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.user_id)
    `);
    if (parseInt(invalidPosts[0].count) > 0) {
      issues.push({
        severity: 'CRITICAL',
        table: 'posts',
        field: 'user_id',
        issue: `${invalidPosts[0].count} posts with invalid user_id`,
        description: 'Orphaned post records'
      });
    }
    
    // Products with invalid category_id
    const [invalidProducts] = await s.query(`
      SELECT COUNT(*) as count FROM products p
      WHERE p.category_id IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = p.category_id)
    `);
    if (parseInt(invalidProducts[0].count) > 0) {
      issues.push({
        severity: 'MEDIUM',
        table: 'products',
        field: 'category_id',
        issue: `${invalidProducts[0].count} products with invalid category_id`,
        description: 'Products linked to non-existent categories'
      });
    }
    
    // Orders with invalid customer_id
    const [invalidOrders] = await s.query(`
      SELECT COUNT(*) as count FROM orders o
      WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = o.customer_id)
    `);
    if (parseInt(invalidOrders[0].count) > 0) {
      issues.push({
        severity: 'CRITICAL',
        table: 'orders',
        field: 'customer_id',
        issue: `${invalidOrders[0].count} orders with invalid customer_id`,
        description: 'Orphaned order records'
      });
    }
    
    // 3. Check for empty product lists in social content
    console.log('📱 STEP 3: Checking social content without products...\n');
    
    // Posts without products
    const [postsNoProducts] = await s.query(`
      SELECT COUNT(*) as count FROM posts 
      WHERE product_ids IS NULL OR json_array_length(product_ids) = 0
    `);
    if (parseInt(postsNoProducts[0].count) > 0) {
      issues.push({
        severity: 'MEDIUM',
        table: 'posts',
        field: 'product_ids',
        issue: `${postsNoProducts[0].count} posts without product references`,
        description: 'Social posts not linked to any products'
      });
    }
    
    // Stories without products
    const [storiesNoProducts] = await s.query(`
      SELECT COUNT(*) as count FROM stories 
      WHERE product_ids IS NULL OR json_array_length(product_ids) = 0
    `);
    if (parseInt(storiesNoProducts[0].count) > 0) {
      issues.push({
        severity: 'MEDIUM',
        table: 'stories',
        field: 'product_ids',
        issue: `${storiesNoProducts[0].count} stories without product references`,
        description: 'Stories not linked to any products'
      });
    }
    
    // 4. Check data volume
    console.log('\n📈 STEP 4: Data Volume Summary\n');
    
    const tables = ['users', 'products', 'categories', 'orders', 'carts', 'wishlists', 'posts', 'stories'];
    const volumes = {};
    
    for (const table of tables) {
      const [result] = await s.query(`SELECT COUNT(*) as count FROM "${table}"`);
      volumes[table] = parseInt(result[0].count);
    }
    
    // 5. Check for incomplete cart items
    console.log('\n🛒 STEP 5: Checking Cart Items...\n');
    const [cartItems] = await s.query(`SELECT COUNT(*) as count FROM cart_items`);
    if (parseInt(cartItems[0].count) === 0) {
      issues.push({
        severity: 'MEDIUM',
        table: 'cart_items',
        issue: 'Cart items table is completely empty',
        description: 'No cart items in database despite having carts'
      });
    }
    
    // REPORT
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 DATABASE AUDIT REPORT');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('📈 DATA VOLUME:');
    for (const [table, count] of Object.entries(volumes)) {
      console.log(`   ${table.padEnd(15)} : ${count} rows`);
    }
    
    console.log('\n🔴 ISSUES FOUND: ' + issues.length);
    if (issues.length > 0) {
      console.log('───────────────────────────────────────────────────────────────\n');
      
      const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
      const mediumIssues = issues.filter(i => i.severity === 'MEDIUM');
      const highIssues = issues.filter(i => i.severity === 'HIGH');
      
      if (criticalIssues.length > 0) {
        console.log('🚨 CRITICAL ISSUES (' + criticalIssues.length + '):');
        criticalIssues.forEach(issue => {
          console.log(`   ❌ ${issue.table}.${issue.field}`);
          console.log(`      Problem: ${issue.issue}`);
          console.log(`      Details: ${issue.description}\n`);
        });
      }
      
      if (highIssues.length > 0) {
        console.log('⚠️  HIGH PRIORITY ISSUES (' + highIssues.length + '):');
        highIssues.forEach(issue => {
          console.log(`   ⚠️  ${issue.table}.${issue.field}`);
          console.log(`      Problem: ${issue.issue}\n`);
        });
      }
      
      if (mediumIssues.length > 0) {
        console.log('📋 MEDIUM PRIORITY ISSUES (' + mediumIssues.length + '):');
        mediumIssues.forEach(issue => {
          console.log(`   📋 ${issue.table}.${issue.field}`);
          console.log(`      Problem: ${issue.issue}\n`);
        });
      }
    } else {
      console.log('✅ No critical issues found!\n');
    }
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('RECOMMENDATIONS:');
    console.log('   1. Clean up orphaned records');
    console.log('   2. Fill NULL values with appropriate defaults');
    console.log('   3. Link social content to products');
    console.log('   4. Seed cart items and complete user relationships');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
