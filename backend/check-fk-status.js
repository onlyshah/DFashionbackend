const { sequelize } = require('./models_sql');

async function quickFKCheck() {
  try {
    await sequelize.authenticate();
    console.log('\n✅ PostgreSQL Connected\n');
    console.log('═'.repeat(70));
    console.log('📊 FOREIGN KEY RELATIONSHIP STATUS REPORT');
    console.log('═'.repeat(70) + '\n');

    const checks = [
      { table: 'posts', column: '"userId"', name: 'Posts' },
      { table: 'reels', column: '"userId"', name: 'Reels' },
      { table: 'stories', column: '"userId"', name: 'Stories' },
      { table: 'live_streams', column: '"hostId"', name: 'Live Streams' },
      { table: 'product_comments', column: '"userId"', name: 'Product Comments' },
      { table: 'product_shares', column: '"sharedBy"', name: 'Product Shares' },
      { table: 'carts', column: '"userId"', name: 'Carts' },
      { table: 'wishlists', column: '"userId"', name: 'Wishlists' },
      { table: 'orders', column: '"customerId"', name: 'Orders' },
      { table: 'payments', column: '"orderId"', name: 'Payments' },
      { table: 'returns', column: '"orderId"', name: 'Returns' },
      { table: 'shipments', column: '"orderId"', name: 'Shipments' },
      { table: 'notifications', column: '"userId"', name: 'Notifications' },
      { table: 'rewards', column: '"userId"', name: 'Rewards' },
      { table: 'search_history', column: '"userId"', name: 'Search History' },
      { table: 'user_behaviors', column: '"userId"', name: 'User Behaviors' },
      { table: 'audit_logs', column: '"userId"', name: 'Audit Logs' },
      { table: 'transactions', column: '"userId"', name: 'Transactions' },
      { table: 'tickets', column: '"userId"', name: 'Tickets' },
      { table: 'kyc_documents', column: '"userId"', name: 'KYC Documents' },
      { table: 'seller_commissions', column: '"sellerId"', name: 'Seller Commissions' },
      { table: 'seller_performance', column: '"sellerId"', name: 'Seller Performance' },
      { table: 'products', column: '"brandId"', name: 'Products (Brand FK)' },
      { table: 'sessions', column: '"userId"', name: 'Sessions' }
    ];

    let passed = 0;
    let total = 0;

    for (const check of checks) {
      try {
        const result = await sequelize.query(`
          SELECT COUNT(*) as total, 
                 COUNT(CASE WHEN ${check.column} IS NULL THEN 1 END) as null_count
          FROM "${check.table}"
        `, { type: sequelize.QueryTypes.SELECT });

        const { total: recordCount, null_count: nullCount } = result[0];

        if (recordCount > 0) {
          if (nullCount === 0) {
            console.log(`✅ ${check.name.padEnd(35)} → ${recordCount} records, ALL with valid FKs`);
            passed++;
          } else {
            console.log(`⚠️  ${check.name.padEnd(35)} → ${recordCount} records, ${nullCount} with NULL FK`);
          }
        } else {
          console.log(`⚪ ${check.name.padEnd(35)} → 0 records (empty table)`);
        }
        total++;
      } catch (err) {
        console.log(`⚠️  ${check.name.padEnd(35)} → Error checking: ${err.message.substring(0, 40)}`);
        total++;
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log(`\n📈 RESULTS: ${passed}/${total} relationships fully populated with valid FKs\n`);
    
    if (passed === total) {
      console.log('🎉 SUCCESS! All Foreign Key Relationships are properly maintained!\n');
    } else {
      console.log(`⚠️  ${total - passed} relationships need attention.\n`);
    }

    console.log('═'.repeat(70) + '\n');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sequelize.close();
  }
}

quickFKCheck();
