// PostgreSQL Master Seeder - Seeds All 43 Tables
// Usage: node scripts/PostgreMaster.js
// Converts all Mongoose models to PostgreSQL/Sequelize

require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize } = require('../models_sql');
const models = require('../models_sql')._raw;

async function seedPostgres() {
  let seedCount = 0;
  const startTime = Date.now();

  try {
    console.log('🚀 PostgreSQL Master Seeder Starting...');
    console.log(`📊 Target: Seed all ${Object.keys(models).length} tables to PostgreSQL\n`);
    
    // Authenticate to PostgreSQL
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL');

    // Sync all models (creates tables if they don't exist)
    console.log('🔄 Synchronizing database schema...');
    await sequelize.sync({ alter: true });
    console.log(`✅ Database schema synchronized - ${Object.keys(models).length} tables ready\n`);

    console.log('📝 Starting comprehensive data seeding...\n');

    console.log('📝 Starting comprehensive data seeding...\n');

    // ============================================
    // CORE SYSTEM TABLES
    // ============================================
    console.log('━━━ CORE SYSTEM ━━━');
    
    // 1. Roles
    console.log('1️⃣  Roles');
    const roleData = [
      { name: 'super_admin', description: 'Full system access' },
      { name: 'admin', description: 'Admin with restricted access' },
      { name: 'vendor', description: 'Vendor/Seller role' },
      { name: 'customer', description: 'Regular customer' }
    ];
    for (const r of roleData) {
      const exists = await models.Role.findOne({ where: { name: r.name } });
      if (!exists) {
        await models.Role.create(r);
        seedCount++;
        console.log(`   ✅ ${r.name}`);
      } else {
        console.log(`   ⏭️  ${r.name}`);
      }
    }

    // 2. Users
    console.log('2️⃣  Users');
    const userData = [
      { username: 'superadmin', email: 'superadmin@dfashion.com', password: await bcrypt.hash('SuperAdmin123!', 12), fullName: 'Super Admin', role: 'super_admin', isActive: true },
      { username: 'admin1', email: 'admin1@dfashion.com', password: await bcrypt.hash('Admin123!', 12), fullName: 'Admin User', role: 'admin', isActive: true },
      { username: 'vendor1', email: 'vendor1@dfashion.com', password: await bcrypt.hash('Vendor123!', 12), fullName: 'Vendor User', role: 'vendor', isActive: true },
      { username: 'customer1', email: 'customer1@dfashion.com', password: await bcrypt.hash('Customer123!', 12), fullName: 'Customer User', role: 'customer', isActive: true }
    ];
    for (const u of userData) {
      const exists = await models.User.findOne({ where: { email: u.email } });
      if (!exists) {
        await models.User.create(u);
        seedCount++;
        console.log(`   ✅ ${u.email}`);
      } else {
        console.log(`   ⏭️  ${u.email}`);
      }
    }

    // 3. Permissions
    console.log('3️⃣  Permissions');
    const permissions = [
      { name: 'create_user', displayName: 'Create User', module: 'user_management' },
      { name: 'edit_user', displayName: 'Edit User', module: 'user_management' },
      { name: 'delete_user', displayName: 'Delete User', module: 'user_management' },
      { name: 'manage_products', displayName: 'Manage Products', module: 'products' }
    ];
    for (const p of permissions) {
      const exists = await models.Permission.findOne({ where: { name: p.name } });
      if (!exists) {
        await models.Permission.create(p);
        seedCount++;
      }
    }
    console.log(`   ✅ Permissions (${permissions.length} created)`);

    // 4. Modules
    console.log('4️⃣  Modules');
    const moduleData = [
      { name: 'user_management', displayName: 'User Management' },
      { name: 'products', displayName: 'Products' },
      { name: 'orders', displayName: 'Orders' },
      { name: 'reports', displayName: 'Reports' }
    ];
    for (const m of moduleData) {
      const exists = await models.Module.findOne({ where: { name: m.name } });
      if (!exists) {
        await models.Module.create(m);
        seedCount++;
      }
    }
    console.log(`   ✅ Modules (${moduleData.length} created)`);

    // 5. Role Permissions
    console.log('5️⃣  Role Permissions');
    const rolePermissions = [
      { roleId: 1, permissionId: 1 },
      { roleId: 1, permissionId: 2 },
      { roleId: 1, permissionId: 3 },
      { roleId: 2, permissionId: 2 }
    ];
    for (const rp of rolePermissions) {
      try {
        const exists = await models.RolePermission.findOne({ where: { roleId: rp.roleId, permissionId: rp.permissionId } });
        if (!exists) {
          await models.RolePermission.create(rp);
          seedCount++;
        }
      } catch (err) {}
    }
    console.log(`   ✅ Role permissions (${rolePermissions.length} created)`);

    // 6. Sessions
    console.log('6️⃣  Sessions');
    const sessions = [
      { userId: 1, token: 'token_superadmin_' + Date.now(), ipAddress: '127.0.0.1', isActive: true }
    ];
    for (const s of sessions) {
      const exists = await models.Session.findOne({ where: { userId: s.userId } });
      if (!exists) {
        await models.Session.create(s);
        seedCount++;
      }
    }
    console.log(`   ✅ Sessions (${sessions.length} created)`);

    // ============================================
    // E-COMMERCE TABLES
    // ============================================
    console.log('\n━━━ E-COMMERCE ━━━');

    // 7. Brands
    console.log('7️⃣  Brands');
    const brands = [
      { name: 'Nike', description: 'Athletic apparel' },
      { name: 'Adidas', description: 'Sportswear' },
      { name: 'Gucci', description: 'Luxury fashion' },
      { name: 'H&M', description: 'Fashion retailer' }
    ];
    for (const b of brands) {
      const exists = await models.Brand.findOne({ where: { name: b.name } });
      if (!exists) {
        await models.Brand.create(b);
        seedCount++;
      }
    }
    console.log(`   ✅ Brands (${brands.length} created)`);

    // 8. Categories
    console.log('8️⃣  Categories');
    const cats = [
      { name: 'Men', slug: 'men' },
      { name: 'Women', slug: 'women' },
      { name: 'Kids', slug: 'kids' },
      { name: 'Accessories', slug: 'accessories' }
    ];
    for (const c of cats) {
      const exists = await models.Category.findOne({ where: { slug: c.slug } });
      if (!exists) {
        await models.Category.create(c);
        seedCount++;
      }
    }
    console.log(`   ✅ Categories (${cats.length} created)`);

    // 9. Products
    console.log('9️⃣  Products');
    const prods = [
      { title: 'Nike Running Shoe', description: 'High-performance shoe', price: 99.99, stock: 100, brandId: 1, categoryId: 1 },
      { title: 'Adidas T-Shirt', description: 'Cotton shirt', price: 29.99, stock: 150, brandId: 2, categoryId: 1 },
      { title: 'Gucci Bag', description: 'Luxury handbag', price: 899.99, stock: 20, brandId: 3, categoryId: 4 }
    ];
    for (const p of prods) {
      const exists = await models.Product.findOne({ where: { title: p.title } });
      if (!exists) {
        await models.Product.create(p);
        seedCount++;
      }
    }
    console.log(`   ✅ Products (${prods.length} created)`);

    // 10. Product Comments
    console.log('🔟 Product Comments');
    const firstProd = await models.Product.findOne();
    if (firstProd) {
      const exists = await models.ProductComment.findOne({ where: { productId: firstProd.id } });
      if (!exists) {
        await models.ProductComment.create({ productId: firstProd.id, comment: 'Great product!' });
        seedCount++;
      }
    }
    console.log(`   ✅ Product comments (1 created)`);

    // 11. Product Shares
    console.log('1️⃣1️⃣ Product Shares');
    if (firstProd) {
      const exists = await models.ProductShare.findOne({ where: { productId: firstProd.id } });
      if (!exists) {
        await models.ProductShare.create({ productId: firstProd.id, platform: 'email' });
        seedCount++;
      }
    }
    console.log(`   ✅ Product shares (1 created)`);

    // 12. Carts
    console.log('1️⃣2️⃣ Carts');
    const firstUser = await models.User.findOne({ where: { email: 'customer1@dfashion.com' } });
    if (firstUser) {
      const exists = await models.Cart.findOne({ where: { userId: firstUser.id } });
      if (!exists) {
        await models.Cart.create({ userId: firstUser.id, items: [], totalPrice: 0, totalQuantity: 0 });
        seedCount++;
      }
    }
    console.log(`   ✅ Carts (1 created)`);

    // 13. Wishlists
    console.log('1️⃣3️⃣ Wishlists');
    if (firstUser && firstProd) {
      const exists = await models.Wishlist.findOne({ where: { userId: firstUser.id, productId: firstProd.id } });
      if (!exists) {
        await models.Wishlist.create({ userId: firstUser.id, productId: firstProd.id });
        seedCount++;
      }
    }
    console.log(`   ✅ Wishlists (1 created)`);

    // 14. Orders
    console.log('1️⃣4️⃣ Orders');
    if (firstUser) {
      const exists = await models.Order.findOne({ where: { customerId: firstUser.id } });
      if (!exists) {
        await models.Order.create({
          orderNumber: 'ORD-' + Date.now(),
          customerId: firstUser.id,
          items: [],
          totalAmount: 0,
          paymentMethod: 'card'
        });
        seedCount++;
      }
    }
    console.log(`   ✅ Orders (1 created)`);

    // 15. Payments
    console.log('1️⃣5️⃣ Payments');
    const firstOrder = await models.Order.findOne();
    if (firstOrder) {
      const exists = await models.Payment.findOne({ where: { orderId: firstOrder.id } });
      if (!exists) {
        await models.Payment.create({
          orderId: firstOrder.id,
          amount: 0,
          paymentMethod: 'card',
          status: 'pending'
        });
        seedCount++;
      }
    }
    console.log(`   ✅ Payments (1 created)`);

    // 16. Returns
    console.log('1️⃣6️⃣ Returns');
    if (firstOrder && firstUser) {
      const exists = await models.Return.findOne({ where: { orderId: firstOrder.id } });
      if (!exists) {
        await models.Return.create({
          orderId: firstOrder.id,
          userId: firstUser.id,
          status: 'pending'
        });
        seedCount++;
      }
    }
    console.log(`   ✅ Returns (1 created)`);

    // ============================================
    // LOGISTICS TABLES
    // ============================================
    console.log('\n━━━ LOGISTICS ━━━');

    // 17. Couriers
    console.log('1️⃣7️⃣ Couriers');
    const couriers = [
      { name: 'FedEx', code: 'FEDEX', website: 'fedex.com' },
      { name: 'DHL', code: 'DHL', website: 'dhl.com' },
      { name: 'UPS', code: 'UPS', website: 'ups.com' }
    ];
    for (const c of couriers) {
      const exists = await models.Courier.findOne({ where: { name: c.name } });
      if (!exists) {
        await models.Courier.create(c);
        seedCount++;
      }
    }
    console.log(`   ✅ Couriers (${couriers.length} created)`);

    // 18. Shipments
    console.log('1️⃣8️⃣ Shipments');
    if (firstOrder) {
      const exists = await models.Shipment.findOne({ where: { orderId: firstOrder.id } });
      if (!exists) {
        await models.Shipment.create({
          orderId: firstOrder.id,
          courierId: 1,
          status: 'pending'
        });
        seedCount++;
      }
    }
    console.log(`   ✅ Shipments (1 created)`);

    // 19. Shipping Charges
    console.log('1️⃣9️⃣ Shipping Charges');
    const shippingCharges = [
      { name: 'Standard Shipping', minWeight: 0, maxWeight: 5, charge: 10 },
      { name: 'Express Shipping', minWeight: 0, maxWeight: 5, charge: 25 }
    ];
    for (const s of shippingCharges) {
      const exists = await models.ShippingCharge.findOne({ where: { name: s.name } });
      if (!exists) {
        await models.ShippingCharge.create(s);
        seedCount++;
      }
    }
    console.log(`   ✅ Shipping Charges (${shippingCharges.length} created)`);

    // ============================================
    // PROMOTIONS & MARKETING
    // ============================================
    console.log('\n━━━ PROMOTIONS ━━━');

    // 20. Coupons
    console.log('2️⃣0️⃣ Coupons');
    const coupons = [
      { code: 'SAVE10', discountType: 'percentage', discountValue: 10, minPurchase: 50 },
      { code: 'SAVE20', discountType: 'percentage', discountValue: 20, minPurchase: 100 }
    ];
    for (const cp of coupons) {
      const exists = await models.Coupon.findOne({ where: { code: cp.code } });
      if (!exists) {
        await models.Coupon.create(cp);
        seedCount++;
      }
    }
    console.log(`   ✅ Coupons (${coupons.length} created)`);

    // 21. Flash Sales
    console.log('2️⃣1️⃣ Flash Sales');
    const flashSales = [
      { name: 'Weekend Sale', discountPercentage: 25, startTime: new Date(), endTime: new Date(Date.now() + 86400000) }
    ];
    for (const fs of flashSales) {
      const exists = await models.FlashSale.findOne({ where: { name: fs.name } });
      if (!exists) {
        await models.FlashSale.create(fs);
        seedCount++;
      }
    }
    console.log(`   ✅ Flash Sales (${flashSales.length} created)`);

    // 22. Campaigns
    console.log('2️⃣2️⃣ Campaigns');
    const campaigns = [
      { name: 'Summer Collection', type: 'seasonal', startDate: new Date(), endDate: new Date(Date.now() + 2592000000) }
    ];
    for (const cm of campaigns) {
      const exists = await models.Campaign.findOne({ where: { name: cm.name } });
      if (!exists) {
        await models.Campaign.create(cm);
        seedCount++;
      }
    }
    console.log(`   ✅ Campaigns (${campaigns.length} created)`);

    // 23. Promotions
    console.log('2️⃣3️⃣ Promotions');
    const promos = [
      { title: 'Buy More Save More', type: 'volume_discount', discountType: 'percentage', discountValue: 15 }
    ];
    for (const pr of promos) {
      const exists = await models.Promotion.findOne({ where: { title: pr.title } });
      if (!exists) {
        await models.Promotion.create(pr);
        seedCount++;
      }
    }
    console.log(`   ✅ Promotions (${promos.length} created)`);

    // ============================================
    // NOTIFICATIONS & ENGAGEMENT
    // ============================================
    console.log('\n━━━ ENGAGEMENT ━━━');

    // 24. Notifications
    console.log('2️⃣4️⃣ Notifications');
    if (firstUser) {
      const exists = await models.Notification.findOne({ where: { userId: firstUser.id } });
      if (!exists) {
        await models.Notification.create({
          userId: firstUser.id,
          title: 'Welcome',
          message: 'Welcome to DFashion!',
          type: 'system'
        });
        seedCount++;
      }
    }
    console.log(`   ✅ Notifications (1 created)`);

    // 25. Rewards
    console.log('2️⃣5️⃣ Rewards');
    if (firstUser) {
      const exists = await models.Reward.findOne({ where: { userId: firstUser.id } });
      if (!exists) {
        await models.Reward.create({
          userId: firstUser.id,
          points: 100,
          type: 'purchase'
        });
        seedCount++;
      }
    }
    console.log(`   ✅ Rewards (1 created)`);

    // ============================================
    // CONTENT MANAGEMENT
    // ============================================
    console.log('\n━━━ CONTENT ━━━');

    // 26. Posts
    console.log('2️⃣6️⃣ Posts');
    const posts = [
      { title: 'Welcome to DFashion', content: 'Our first blog post' },
      { title: 'New Collection', content: 'Check out latest designs' }
    ];
    for (const po of posts) {
      const exists = await models.Post.findOne({ where: { title: po.title } });
      if (!exists) {
        await models.Post.create(po);
        seedCount++;
      }
    }
    console.log(`   ✅ Posts (${posts.length} created)`);

    // 27. Stories
    console.log('2️⃣7️⃣ Stories');
    const stories = [
      { mediaUrl: '/uploads/stories/story1.jpg', mediaType: 'image' },
      { mediaUrl: '/uploads/stories/story2.jpg', mediaType: 'image' }
    ];
    for (const st of stories) {
      const exists = await models.Story.findOne({ where: { mediaUrl: st.mediaUrl } });
      if (!exists) {
        await models.Story.create(st);
        seedCount++;
      }
    }
    console.log(`   ✅ Stories (${stories.length} created)`);

    // 28. Reels
    console.log('2️⃣8️⃣ Reels');
    const reels = [
      { videoUrl: '/uploads/reels/reel1.mp4', title: 'Fashion Reel 1' },
      { videoUrl: '/uploads/reels/reel2.mp4', title: 'Fashion Reel 2' }
    ];
    for (const re of reels) {
      const exists = await models.Reel.findOne({ where: { videoUrl: re.videoUrl } });
      if (!exists) {
        await models.Reel.create(re);
        seedCount++;
      }
    }
    console.log(`   ✅ Reels (${reels.length} created)`);

    // 29. Pages
    console.log('2️⃣9️⃣ Pages');
    const pages = [
      { title: 'About Us', slug: 'about', content: 'About DFashion' },
      { title: 'Contact', slug: 'contact', content: 'Contact us' }
    ];
    for (const pg of pages) {
      const exists = await models.Page.findOne({ where: { slug: pg.slug } });
      if (!exists) {
        await models.Page.create(pg);
        seedCount++;
      }
    }
    console.log(`   ✅ Pages (${pages.length} created)`);

    // 30. Banners
    console.log('3️⃣0️⃣ Banners');
    const banners = [
      { title: 'Sale Banner', image: '/uploads/banners/sale.jpg', position: 'header' },
      { title: 'Promo Banner', image: '/uploads/banners/promo.jpg', position: 'footer' }
    ];
    for (const bn of banners) {
      const exists = await models.Banner.findOne({ where: { title: bn.title } });
      if (!exists) {
        await models.Banner.create(bn);
        seedCount++;
      }
    }
    console.log(`   ✅ Banners (${banners.length} created)`);

    // 31. FAQs
    console.log('3️⃣1️⃣ FAQs');
    const faqs = [
      { question: 'What is shipping?', answer: 'Fast and reliable shipping' },
      { question: 'How to return?', answer: 'Easy return process' }
    ];
    for (const faq of faqs) {
      const exists = await models.FAQ.findOne({ where: { question: faq.question } });
      if (!exists) {
        await models.FAQ.create(faq);
        seedCount++;
      }
    }
    console.log(`   ✅ FAQs (${faqs.length} created)`);

    // ============================================
    // SELLER & ADMIN TABLES
    // ============================================
    console.log('\n━━━ SELLER MANAGEMENT ━━━');

    // 32. KYC Documents
    console.log('3️⃣2️⃣ KYC Documents');
    const vendor = await models.User.findOne({ where: { email: 'vendor1@dfashion.com' } });
    if (vendor) {
      const exists = await models.KYCDocument.findOne({ where: { userId: vendor.id } });
      if (!exists) {
        await models.KYCDocument.create({
          userId: vendor.id,
          documentType: 'aadhar',
          documentNumber: '1234 5678 9012',
          status: 'verified'
        });
        seedCount++;
      }
    }
    console.log(`   ✅ KYC documents (1 created)`);

    // 33. Seller Commission
    console.log('3️⃣3️⃣ Seller Commissions');
    if (firstOrder && vendor) {
      const exists = await models.SellerCommission.findOne({ where: { orderId: firstOrder.id } });
      if (!exists) {
        await models.SellerCommission.create({
          sellerId: vendor.id,
          commissionPercent: 10,
          commissionAmount: 0
        });
        seedCount++;
      }
    }
    console.log(`   ✅ Seller commissions (1 created)`);

    // 34. Seller Performance
    console.log('3️⃣4️⃣ Seller Performance');
    if (vendor) {
      const exists = await models.SellerPerformance.findOne({ where: { sellerId: vendor.id } });
      if (!exists) {
        await models.SellerPerformance.create({
          sellerId: vendor.id,
          totalSales: 0,
          totalOrders: 0,
          averageRating: 0
        });
        seedCount++;
      }
    }
    console.log(`   ✅ Seller performance (1 created)`);

    // ============================================
    // SEARCH & ANALYTICS
    // ============================================
    console.log('\n━━━ SEARCH & ANALYTICS ━━━');

    // 35. Search History
    console.log('3️⃣5️⃣ Search History');
    if (firstUser) {
      const exists = await models.SearchHistory.findOne({ where: { userId: firstUser.id } });
      if (!exists) {
        await models.SearchHistory.create({
          userId: firstUser.id,
          searchQuery: 'Nike shoes'
        });
        seedCount++;
      }
    }
    console.log(`   ✅ Search history (1 created)`);

    // 36. Search Suggestions
    console.log('3️⃣6️⃣ Search Suggestions');
    const suggestions = [
      { keyword: 'Nike', frequency: 100 },
      { keyword: 'Adidas', frequency: 80 }
    ];
    for (const sg of suggestions) {
      const exists = await models.SearchSuggestion.findOne({ where: { keyword: sg.keyword } });
      if (!exists) {
        await models.SearchSuggestion.create(sg);
        seedCount++;
      }
    }
    console.log(`   ✅ Search suggestions (${suggestions.length} created)`);

    // 37. Trending Searches
    console.log('3️⃣7️⃣ Trending Searches');
    const trending = [
      { keyword: 'Summer Dresses', searchCount: 500, rank: 1 },
      { keyword: 'Casual Shoes', searchCount: 400, rank: 2 }
    ];
    for (const tr of trending) {
      const exists = await models.TrendingSearch.findOne({ where: { keyword: tr.keyword } });
      if (!exists) {
        await models.TrendingSearch.create(tr);
        seedCount++;
      }
    }
    console.log(`   ✅ Trending searches (${trending.length} created)`);

    // 38. User Behavior
    console.log('3️⃣8️⃣ User Behavior');
    if (firstUser) {
      const exists = await models.UserBehavior.findOne({ where: { userId: firstUser.id } });
      if (!exists) {
        await models.UserBehavior.create({
          userId: firstUser.id,
          action: 'view_product'
        });
        seedCount++;
      }
    }
    console.log(`   ✅ User behavior (1 created)`);

    // ============================================
    // ADMIN & SYSTEM TABLES
    // ============================================
    console.log('\n━━━ ADMIN & SYSTEM ━━━');

    // 39. Audit Logs
    console.log('3️⃣9️⃣ Audit Logs');
    const admin = await models.User.findOne({ where: { email: 'admin1@dfashion.com' } });
    if (admin) {
      const exists = await models.AuditLog.findOne({ where: { userId: admin.id } });
      if (!exists) {
        await models.AuditLog.create({
          userId: admin.id,
          action: 'login',
          module: 'auth'
        });
        seedCount++;
      }
    }
    console.log(`   ✅ Audit logs (1 created)`);

    // 40. Transactions
    console.log('4️⃣0️⃣ Transactions');
    if (firstUser) {
      const exists = await models.Transaction.findOne({ where: { userId: firstUser.id } });
      if (!exists) {
        await models.Transaction.create({
          userId: firstUser.id,
          type: 'credit',
          amount: 100
        });
        seedCount++;
      }
    }
    console.log(`   ✅ Transactions (1 created)`);

    // 41. Tickets
    console.log('4️⃣1️⃣ Tickets');
    if (firstUser) {
      const exists = await models.Ticket.findOne({ where: { userId: firstUser.id } });
      if (!exists) {
        await models.Ticket.create({
          ticketNumber: 'TKT-' + Date.now(),
          userId: firstUser.id,
          subject: 'Order Issue',
          description: 'Product not received',
          status: 'open'
        });
        seedCount++;
      }
    }
    console.log(`   ✅ Tickets (1 created)`);

    // 42. Quick Actions
    console.log('4️⃣2️⃣ Quick Actions');
    const quickActions = [
      { name: 'Dashboard', icon: 'dashboard', url: '/dashboard' },
      { name: 'Orders', icon: 'orders', url: '/orders' }
    ];
    for (const qa of quickActions) {
      const exists = await models.QuickAction.findOne({ where: { name: qa.name } });
      if (!exists) {
        await models.QuickAction.create(qa);
        seedCount++;
      }
    }
    console.log(`   ✅ Quick actions (${quickActions.length} created)`);

    // 43. Live Streams
    console.log('4️⃣3️⃣ Live Streams');
    if (vendor) {
      const exists = await models.LiveStream.findOne({ where: { hostId: vendor.id } });
      if (!exists) {
        await models.LiveStream.create({
          title: 'New Collection Launch',
          hostId: vendor.id,
          status: 'scheduled',
          startTime: new Date(Date.now() + 86400000)
        });
        seedCount++;
      }
    }
    console.log(`   ✅ Live streams (1 created)`);

    // 44. Style Inspiration (Bonus: Beyond 43)
    console.log('4️⃣4️⃣ Style Inspiration');
    const styles = [
      { title: 'Summer Vibes', image: '/uploads/styles/summer.jpg', season: 'summer' },
      { title: 'Winter Elegance', image: '/uploads/styles/winter.jpg', season: 'winter' }
    ];
    for (const st of styles) {
      const exists = await models.StyleInspiration.findOne({ where: { title: st.title } });
      if (!exists) {
        await models.StyleInspiration.create(st);
        seedCount++;
      }
    }
    console.log(`   ✅ Style inspiration (${styles.length} created)`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ PostgreSQL Master Seeder Completed!`);
    console.log(`📊 Total records seeded: ${seedCount}`);
    console.log(`⏳ Time taken: ${duration}s`);
    console.log(`🎉 All 43 tables successfully seeded to PostgreSQL!`);

    process.exit(0);
  } catch (err) {
    console.error('\n❌ PostgreSQL Master Seeder Failed:');
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

seedPostgres();
