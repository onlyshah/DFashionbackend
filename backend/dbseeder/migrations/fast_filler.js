require('dotenv').config();
const models = require('../../models_sql');

async function fillRemainingTables() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    await models.reinitializeModels();
    
    console.log('🚀 Quickly filling remaining 14 tables...\n');
    
    // 1. Banners
    if (models.Banner) {
      const count = await models.Banner.count();
      if (count === 0) {
        await models.Banner.bulkCreate([
          { title: 'Summer Sale', imageUrl: 'summer.jpg', link: '/sale', position: 'top', isActive: true },
          { title: 'New Collection', imageUrl: 'new.jpg', link: '/new', position: 'middle', isActive: true }
        ]);
        console.log('✅ Banners: 2 records');
      }
    }
    
    // 2. Inventories
    if (models.Inventory && models.Product) {
      const count = await models.Inventory.count();
      if (count === 0) {
        const products = await models.Product.findAll({ limit: 5 });
        if (products.length > 0) {
          const invData = products.map((p, i) => ({
            productId: p.id,
            warehouseId: null,
            sku: `SKU-${i}`,
            quantity: 100 + (i * 20),
            reorderLevel: 20,
            isActive: true
          }));
          await models.Inventory.bulkCreate(invData);
          console.log(`✅ Inventories: ${invData.length} records`);
        }
      }
    }
    
    // 3. KYC Documents
    if (models.KYCDocument && models.User) {
      const count = await models.KYCDocument.count();
      if (count === 0) {
        const users = await models.User.findAll({ limit: 2 });
        if (users.length > 0) {
          const kycData = users.map(u => ({
            userId: u.id,
            documentType: 'passport',
            documentNumber: `DOC-${u.id}`,
            issuedDate: new Date(),
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            isVerified: true
          }));
          await models.KYCDocument.bulkCreate(kycData);
          console.log(`✅ KYC Documents: ${kycData.length} records`);
        }
      }
    }
    
    // 4. Posts
    if (models.Post) {
      const count = await models.Post.count();
      if (count === 0) {
        await models.Post.bulkCreate([
          { title: 'Style Tips', content: 'How to style your outfit', authorId: null, isPublished: true },
          { title: 'Fashion Trends', content: '2024 Fashion trends', authorId: null, isPublished: true }
        ]);
        console.log('✅ Posts: 2 records');
      }
    }
    
    // 5. Search History
    if (models.SearchHistory && models.User) {
      const count = await models.SearchHistory.count();
      if (count === 0) {
        const users = await models.User.findAll({ limit: 2 });
        if (users.length > 0) {
          const searches = users.map(u => ({
            userId: u.id,
            searchQuery: 'summer dress',
            resultCount: 42,
            timestamp: new Date()
          }));
          await models.SearchHistory.bulkCreate(searches);
          console.log(`✅ Search History: ${searches.length} records`);
        }
      }
    }
    
    // 6. Reels
    if (models.Reel) {
      const count = await models.Reel.count();
      if (count === 0) {
        await models.Reel.bulkCreate([
          { title: 'Fashion Reel 1', videoUrl: 'reel1.mp4', description: 'Fashion', duration: 30, views: 1000, isActive: true },
          { title: 'Fashion Reel 2', videoUrl: 'reel2.mp4', description: 'Style', duration: 45, views: 800, isActive: true }
        ]);
        console.log('✅ Reels: 2 records');
      }
    }
    
    // 7. Transactions
    if (models.Transaction) {
      const count = await models.Transaction.count();
      if (count === 0) {
        await models.Transaction.bulkCreate([
          { transactionType: 'payment', amount: 500, status: 'completed', description: 'Order payment', metadata: {} },
          { transactionType: 'refund', amount: 100, status: 'completed', description: 'Return refund', metadata: {} }
        ]);
        console.log('✅ Transactions: 2 records');
      }
    }
    
    // 8. Tickets
    if (models.Ticket) {
      const count = await models.Ticket.count();
      if (count === 0) {
        await models.Ticket.bulkCreate([
          { title: 'Delivery Issue', description: 'Product not delivered', priority: 'high', status: 'open', userId: null },
          { title: 'Quality Concern', description: 'Product defect', priority: 'medium', status: 'open', userId: null }
        ]);
        console.log('✅ Tickets: 2 records');
      }
    }
    
    // 9. Inventory Alerts
    if (models.InventoryAlert) {
      const count = await models.InventoryAlert.count();
      if (count === 0) {
        await models.InventoryAlert.bulkCreate([
          { inventoryId: null, alertType: 'low_stock', message: 'Low stock alert', isActive: true },
          { inventoryId: null, alertType: 'overstock', message: 'Overstock alert', isActive: true }
        ]);
        console.log('✅ Inventory Alerts: 2 records');
      }
    }
    
    // 10. Inventory Histories
    if (models.InventoryHistory) {
      const count = await models.InventoryHistory.count();
      if (count === 0) {
        await models.InventoryHistory.bulkCreate([
          { inventoryId: null, action: 'in', quantity: 100, reason: 'Stock received', timestamp: new Date() },
          { inventoryId: null, action: 'out', quantity: 10, reason: 'Order fulfilled', timestamp: new Date() }
        ]);
        console.log('✅ Inventory Histories: 2 records');
      }
    }
    
    // 11. Live Streams
    if (models.LiveStream) {
      const count = await models.LiveStream.count();
      if (count === 0) {
        await models.LiveStream.bulkCreate([
          { title: 'Fashion Show', url: 'stream1', isLive: false, startTime: new Date(), endTime: new Date() },
          { title: 'Product Launch', url: 'stream2', isLive: false, startTime: new Date(), endTime: new Date() }
        ]);
        console.log('✅ Live Streams: 2 records');
      }
    }
    
    // 12. Product Shares
    if (models.ProductShare) {
      const count = await models.ProductShare.count();
      if (count === 0) {
        await models.ProductShare.bulkCreate([
          { productId: null, userId: null, sharedOn: 'social', timestamp: new Date() },
          { productId: null, userId: null, sharedOn: 'email', timestamp: new Date() }
        ]);
        console.log('✅ Product Shares: 2 records');
      }
    }
    
    // 13. Seller Commission (try again with different approach)
    if (models.SellerCommission) {
      const count = await models.SellerCommission.count();
      if (count === 0) {
        await models.SellerCommission.bulkCreate([
          { sellerId: null, orderId: null, commissionPercent: 10, commissionAmount: 100, status: 'due' },
          { sellerId: null, orderId: null, commissionPercent: 10, commissionAmount: 150, status: 'paid' }
        ]);
        console.log('✅ Seller Commission: 2 records');
      }
    }
    
    // 14. Seller Performance
    if (models.SellerPerformance) {
      const count = await models.SellerPerformance.count();
      if (count === 0) {
        await models.SellerPerformance.bulkCreate([
          { sellerId: null, rating: 4.8, reviews: 150, ordersCompleted: 450, IsActive: true },
          { sellerId: null, rating: 4.5, reviews: 95, ordersCompleted: 230, IsActive: true }
        ]);
        console.log('✅ Seller Performance: 2 records');
      }
    }
    
    console.log('\n✨ All 14 tables filled successfully!');
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fillRemainingTables();
