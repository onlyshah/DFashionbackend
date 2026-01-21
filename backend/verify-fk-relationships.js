const { sequelize } = require('./models_sql');

async function verifyAllFKRelationships() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');
    console.log('═'.repeat(80));
    console.log('🔍 COMPLETE FOREIGN KEY RELATIONSHIP VERIFICATION');
    console.log('═'.repeat(80) + '\n');

    // Define all FK relationships (with actual database column names in snake_case)
    const fkRelationships = [
      { table: 'users', fkColumn: 'role_id', parentTable: 'roles', description: 'User → Role' },
      { table: 'users', fkColumn: 'department_id', parentTable: 'departments', description: 'User → Department' },
      { table: 'sessions', fkColumn: 'userId', parentTable: 'users', description: 'Session → User' },
      { table: 'posts', fkColumn: 'userId', parentTable: 'users', description: 'Post → User' },
      { table: 'stories', fkColumn: 'userId', parentTable: 'users', description: 'Story → User' },
      { table: 'reels', fkColumn: 'userId', parentTable: 'users', description: 'Reel → User' },
      { table: 'live_streams', fkColumn: 'hostId', parentTable: 'users', description: 'LiveStream → User' },
      { table: 'products', fkColumn: 'brandId', parentTable: 'brands', description: 'Product → Brand' },
      { table: 'products', fkColumn: 'categoryId', parentTable: 'categories', description: 'Product → Category' },
      { table: 'product_comments', fkColumn: 'userId', parentTable: 'users', description: 'ProductComment → User' },
      { table: 'product_comments', fkColumn: 'productId', parentTable: 'products', description: 'ProductComment → Product' },
      { table: 'product_shares', fkColumn: 'productId', parentTable: 'products', description: 'ProductShare → Product' },
      { table: 'product_shares', fkColumn: 'sharedBy', parentTable: 'users', description: 'ProductShare → User (sharedBy)' },
      { table: 'carts', fkColumn: 'userId', parentTable: 'users', description: 'Cart → User' },
      { table: 'wishlists', fkColumn: 'userId', parentTable: 'users', description: 'Wishlist → User' },
      { table: 'wishlists', fkColumn: 'productId', parentTable: 'products', description: 'Wishlist → Product' },
      { table: 'orders', fkColumn: 'customerId', parentTable: 'users', description: 'Order → User (Customer)' },
      { table: 'payments', fkColumn: 'orderId', parentTable: 'orders', description: 'Payment → Order' },
      { table: 'returns', fkColumn: 'orderId', parentTable: 'orders', description: 'Return → Order' },
      { table: 'returns', fkColumn: 'userId', parentTable: 'users', description: 'Return → User' },
      { table: 'shipments', fkColumn: 'orderId', parentTable: 'orders', description: 'Shipment → Order' },
      { table: 'shipments', fkColumn: 'courierId', parentTable: 'couriers', description: 'Shipment → Courier' },
      { table: 'notifications', fkColumn: 'userId', parentTable: 'users', description: 'Notification → User' },
      { table: 'rewards', fkColumn: 'userId', parentTable: 'users', description: 'Reward → User' },
      { table: 'search_history', fkColumn: 'userId', parentTable: 'users', description: 'SearchHistory → User' },
      { table: 'user_behaviors', fkColumn: 'userId', parentTable: 'users', description: 'UserBehavior → User' },
      { table: 'audit_logs', fkColumn: 'userId', parentTable: 'users', description: 'AuditLog → User' },
      { table: 'transactions', fkColumn: 'userId', parentTable: 'users', description: 'Transaction → User' },
      { table: 'tickets', fkColumn: 'userId', parentTable: 'users', description: 'Ticket → User' },
      { table: 'kyc_documents', fkColumn: 'userId', parentTable: 'users', description: 'KYCDocument → User' },
      { table: 'seller_commissions', fkColumn: 'sellerId', parentTable: 'users', description: 'SellerCommission → User (Seller)' },
      { table: 'seller_commissions', fkColumn: 'orderId', parentTable: 'orders', description: 'SellerCommission → Order' },
      { table: 'seller_performance', fkColumn: 'sellerId', parentTable: 'users', description: 'SellerPerformance → User (Seller)' },
    ];

    let totalChecked = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    for (const fk of fkRelationships) {
      try {
        // Check if table exists and has the FK column
        const tableExists = await sequelize.query(`
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = '${fk.table}'
        `, { type: sequelize.QueryTypes.SELECT });

        if (tableExists.length === 0) {
          console.log(`⚠️  ${fk.description.padEnd(40)} → Table '${fk.table}' not found`);
          totalChecked++;
          continue;
        }

        // Check if column exists
        const columnExists = await sequelize.query(`
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = '${fk.table}' AND column_name = '${fk.fkColumn}'
        `, { type: sequelize.QueryTypes.SELECT });

        if (columnExists.length === 0) {
          console.log(`⚠️  ${fk.description.padEnd(40)} → Column '${fk.fkColumn}' not found`);
          totalChecked++;
          continue;
        }

        // Count total records and NULL values
        const result = await sequelize.query(`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN "${fk.fkColumn}" IS NULL THEN 1 END) as null_count,
            COUNT(CASE WHEN "${fk.fkColumn}" IS NOT NULL THEN 1 END) as valid_count
          FROM "${fk.table}"
        `, { type: sequelize.QueryTypes.SELECT });

        const { total, null_count, valid_count } = result[0];

        if (total === 0) {
          console.log(`⚪ ${fk.description.padEnd(40)} → 0 records (table empty)`);
        } else if (null_count === 0) {
          console.log(`✅ ${fk.description.padEnd(40)} → ${valid_count}/${total} valid FKs (100%)`);
          totalPassed++;
        } else {
          console.log(`❌ ${fk.description.padEnd(40)} → ${valid_count}/${total} valid FKs (${null_count} NULL)`);
          totalFailed++;
        }

        totalChecked++;
      } catch (err) {
        console.log(`⚠️  ${fk.description.padEnd(40)} → Error: ${err.message.substring(0, 50)}`);
        totalChecked++;
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('📊 SUMMARY\n');
    console.log(`Total Relationships Checked: ${totalChecked}`);
    console.log(`✅ Passed (All FKs populated): ${totalPassed}`);
    console.log(`❌ Failed (Some NULL FKs): ${totalFailed}`);
    console.log(`⚪ Skipped (Tables empty/not found): ${totalChecked - totalPassed - totalFailed}`);
    
    const passPercentage = totalChecked > 0 ? ((totalPassed / totalChecked) * 100).toFixed(1) : 0;
    console.log(`\n📈 Overall Success Rate: ${passPercentage}%`);

    if (totalFailed === 0) {
      console.log('\n🎉 All Foreign Key Relationships are properly maintained!');
    } else {
      console.log('\n⚠️  Some foreign key relationships need attention.');
    }

    console.log('\n' + '═'.repeat(80) + '\n');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sequelize.close();
  }
}

verifyAllFKRelationships();
