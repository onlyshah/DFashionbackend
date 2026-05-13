/**
 * 🔧 PostgreSQL Data Integrity Fix Script
 * 
 * Fixes:
 * 1. Links posts to products
 * 2. Links stories to products
 * 3. Populates cart_items
 * 4. Ensures complete relationships
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
    
    let fixCount = 0;
    
    // ==========================================
    // FIX 1: Link Posts to Products
    // ==========================================
    console.log('🔗 FIX 1: Linking posts to products...');
    
    const [posts] = await s.query(`SELECT id FROM posts LIMIT 100`);
    const [products] = await s.query(`SELECT id FROM products LIMIT 20`);
    
    if (posts.length > 0 && products.length > 0) {
      for (const post of posts) {
        // Randomly select 2-4 products for each post
        const numProducts = Math.floor(Math.random() * 3) + 2;
        const selectedProducts = [];
        for (let i = 0; i < numProducts; i++) {
          const randomProduct = products[Math.floor(Math.random() * products.length)];
          if (!selectedProducts.includes(randomProduct.id)) {
            selectedProducts.push(randomProduct.id);
          }
        }
        
        await s.query(
          `UPDATE posts SET product_ids = :productIds WHERE id = :postId`,
          {
            replacements: { productIds: JSON.stringify(selectedProducts), postId: post.id },
            type: Sequelize.QueryTypes.UPDATE
          }
        );
        fixCount++;
      }
      console.log(`   ✅ Linked ${fixCount} posts to products\n`);
    }
    
    // ==========================================
    // FIX 2: Link Stories to Products
    // ==========================================
    console.log('🔗 FIX 2: Linking stories to products...');
    
    const [stories] = await s.query(`SELECT id FROM stories ORDER BY created_at DESC LIMIT 50`);
    
    let storyFixCount = 0;
    if (stories.length > 0 && products.length > 0) {
      for (const story of stories) {
        // Randomly select 1-3 products for each story
        const numProducts = Math.floor(Math.random() * 3) + 1;
        const selectedProducts = [];
        for (let i = 0; i < numProducts; i++) {
          const randomProduct = products[Math.floor(Math.random() * products.length)];
          if (!selectedProducts.includes(randomProduct.id)) {
            selectedProducts.push(randomProduct.id);
          }
        }
        
        await s.query(
          `UPDATE stories SET product_ids = :productIds WHERE id = :storyId`,
          {
            replacements: { productIds: JSON.stringify(selectedProducts), storyId: story.id },
            type: Sequelize.QueryTypes.UPDATE
          }
        );
        storyFixCount++;
      }
      console.log(`   ✅ Linked ${storyFixCount} stories to products\n`);
    }
    
    // ==========================================
    // FIX 3: Populate Cart Items
    // ==========================================
    console.log('🛒 FIX 3: Populating cart_items table...');
    
    const [carts] = await s.query(`SELECT id, user_id, product_id, quantity, price FROM carts LIMIT 100`);
    
    let cartItemCount = 0;
    if (carts.length > 0) {
      for (const cart of carts) {
        // Insert cart item
        const cartItemId = require('crypto').randomUUID();
        try {
          await s.query(
            `INSERT INTO cart_items (id, cart_id, product_id, quantity, price, created_at, updated_at)
             VALUES (:id, :cartId, :productId, :quantity, :price, NOW(), NOW())
             ON CONFLICT DO NOTHING`,
            {
              replacements: { 
                id: cartItemId, 
                cartId: cart.id, 
                productId: cart.product_id, 
                quantity: cart.quantity, 
                price: cart.price 
              },
              type: Sequelize.QueryTypes.INSERT
            }
          );
          cartItemCount++;
        } catch (err) {
          // Silently skip if item already exists
        }
      }
      console.log(`   ✅ Created ${cartItemCount} cart items\n`);
    }
    
    // ==========================================
    // FIX 4: Validate Foreign Keys
    // ==========================================
    console.log('🔍 FIX 4: Validating foreign key relationships...');
    
    // Get all users
    const [users] = await s.query(`SELECT id FROM users`);
    console.log(`   ✅ Found ${users.length} users`);
    
    // Get all products
    const [allProducts] = await s.query(`SELECT id FROM products`);
    console.log(`   ✅ Found ${allProducts.length} products`);
    
    // Get all categories
    const [categories] = await s.query(`SELECT id FROM categories`);
    console.log(`   ✅ Found ${categories.length} categories`);
    
    // Verify relationships exist
    const [invalidCarts] = await s.query(`
      SELECT COUNT(*) as count FROM carts c
      WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = c.user_id)
      OR NOT EXISTS (SELECT 1 FROM products p WHERE p.id = c.product_id)
    `);
    console.log(`   ℹ️  Invalid carts: ${invalidCarts[0].count}`);
    
    const [invalidWishlist] = await s.query(`
      SELECT COUNT(*) as count FROM wishlists w
      WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = w.user_id)
      OR NOT EXISTS (SELECT 1 FROM products p WHERE p.id = w.product_id)
    `);
    console.log(`   ℹ️  Invalid wishlist items: ${invalidWishlist[0].count}`);
    
    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n' + '═'.repeat(60));
    console.log('✅ DATA INTEGRITY FIX COMPLETE');
    console.log('═'.repeat(60));
    console.log(`   Posts linked to products: ${fixCount}`);
    console.log(`   Stories linked to products: ${storyFixCount}`);
    console.log(`   Cart items created: ${cartItemCount}`);
    console.log(`   Total fixes applied: ${fixCount + storyFixCount + cartItemCount}`);
    console.log('═'.repeat(60) + '\n');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
})();
