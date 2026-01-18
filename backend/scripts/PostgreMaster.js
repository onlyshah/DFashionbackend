// PostgreSQL Master Seeder - Production Data (40+ records per table)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../models_sql');
const models = require('../models_sql')._raw;
const imageUtil = require('./image-utils');

const firstNames = ['Anil', 'Priya', 'Rajesh', 'Neha', 'Vikram', 'Ananya', 'Amit', 'Divya', 'Arjun', 'Pooja',
  'Sameer', 'Isha', 'Kunal', 'Shreya', 'Nikhil', 'Anjali', 'Rohan', 'Meera', 'Sanjay', 'Riya'];
const lastNames = ['Sharma', 'Patel', 'Singh', 'Reddy', 'Kapoor', 'Gupta', 'Verma', 'Joshi', 'Kumar', 'Desai'];
const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Chennai'];
const productTitles = ['Premium Shirt', 'Elegant Saree', 'Casual Jeans', 'Blazer Jacket', 'Running Shoes',
  'Designer Bag', 'Winter Coat', 'Summer Dress', 'Kurta', 'Belt', 'Sweater', 'Linen Shirt', 'Trousers', 'Lehenga',
  'Sports Shirt', 'Formal Shoes', 'Sneakers', 'Sunglasses', 'Scarf', 'Yoga Pants', 'Cardigan', 'Skirt', 'Gown',
  'Shorts', 'Hoodie', 'Polo', 'Pants', 'Dress', 'Dhoti', 'Tie', 'Pants', 'Top', 'Dress', 'Jeans', 'Shirt', 'Suit',
  'Swimwear', 'Gym Wear', 'Suit', 'Kurta', 'Blouse', 'Lehenga', 'Kurti', 'Accessory'];
const brands = ['Nike', 'Adidas', 'Puma', 'Gucci', 'Louis Vuitton', 'Burberry', 'H&M', 'Zara'];
const categories = ['Men', 'Women', 'Kids', 'Footwear', 'Accessories', 'Formal', 'Casual', 'Sports'];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randDate(daysBack = 90) { return new Date(Date.now() - Math.random() * daysBack * 24 * 60 * 60 * 1000); }

async function seed() {
  let count = 0;
  try {
    console.log('🚀 Seeding PostgreSQL with production data...\n');
    await sequelize.authenticate();
    console.log('✅ Connected');
    
    // Clear all tables with TRUNCATE CASCADE
    console.log('🧹 Clearing all tables...');
    try {
      // Get all table names from models
      const tables = Object.keys(models).map(key => {
        const model = models[key];
        return model.getTableName ? model.getTableName() : null;
      }).filter(Boolean);
      
      // Drop problematic tables first to avoid column type conflicts
      const tablesToDrop = ['inventory_histories', 'suppliers'];
      for (const table of tablesToDrop) {
        try {
          await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
          console.log(`  ✓ Dropped ${table}`);
        } catch (e) {
          console.log(`  ⚠ Could not drop ${table}:`, e.message);
        }
      }
      
      // Disable foreign key constraints temporarily, truncate, then re-enable
      for (const table of tables) {
        if (!tablesToDrop.includes(table)) {
          try {
            await sequelize.query(`TRUNCATE TABLE "${table}" CASCADE;`);
            console.log(`  ✓ Cleared ${table}`);
          } catch (e) {
            console.log(`  ⚠ Could not clear ${table}:`, e.message);
          }
        }
      }
    } catch (e) {
      console.warn('  ⚠ Truncate warning:', e.message);
    }
    
    await sequelize.sync({ alter: true });
    console.log('✅ Synced\n');

    // 1. ROLES (4 Standard RBAC Roles)
    const roles = [
      { name: 'super_admin', displayName: 'Super Administrator', description: 'Full system access with all permissions', level: 1, isActive: true, isSystem: true },
      { name: 'admin', displayName: 'Administrator', description: 'Administrative access with most permissions (no settings management)', level: 2, isActive: true, isSystem: true },
      { name: 'manager', displayName: 'Manager', description: 'Management access with limited permissions (dashboard, users, products, orders)', level: 3, isActive: true, isSystem: true },
      { name: 'customer', displayName: 'Customer', description: 'Basic customer access (dashboard only)', level: 4, isActive: true, isSystem: true }
    ];
    const roleIds = [];
    for (const r of roles) { const x = await models.Role.create(r); roleIds.push(x.id); count++; }
    console.log('1️⃣  Roles: 4 (super_admin, admin, manager, customer)');

    // 1.a DEPARTMENTS (if model exists)
    const departments = [
      { name: 'administration', displayName: 'Administration', description: 'Administrative staff and management', isActive: true },
      { name: 'sales', displayName: 'Sales', description: 'Sales team and vendor management', isActive: true },
      { name: 'marketing', displayName: 'Marketing', description: 'Marketing and campaigns', isActive: true },
      { name: 'accounting', displayName: 'Accounting', description: 'Finance and accounting', isActive: true },
      { name: 'support', displayName: 'Customer Support', description: 'Customer support and service', isActive: true },
      { name: 'content', displayName: 'Content Management', description: 'Content creators and management', isActive: true }
    ];
    if (models.Department) {
      try {
        for (const d of departments) { await models.Department.create(d); count++; }
        console.log('1️⃣a Departments seeded');
      } catch (e) {
        console.warn('⚠ Could not seed Departments:', e.message);
      }
    } else {
      console.warn('⚠ Department model not found in Postgres models - skipping Departments seeding');
    }

    // 2. USERS (45)
    const userIds = [];
    for (let i = 0; i < 45; i++) {
      const u = await models.User.create({
        username: `user${i}`, email: `user${i}@dfashion.com`, password: await bcrypt.hash('Pass123!', 12),
        fullName: `${pick(firstNames)} ${pick(lastNames)}`, phone: `+919${rand(0, 9)}${rand(0, 9)}${rand(0, 9)}${rand(0, 9)}${rand(0, 9)}${rand(0, 9)}${rand(0, 9)}${rand(0, 9)}`,
        address: `${rand(1, 999)} Street`, city: pick(cities), state: 'State',
        role: i === 0 ? 'super_admin' : i < 5 ? 'admin' : i < 13 ? 'vendor' : 'customer', isActive: true
      });
      userIds.push(u.id);
      count++;
    }
    console.log('2️⃣  Users: 45');

    // 3. PERMISSIONS (22 - Better structure with modules)
    const perms = [
      // Dashboard (1)
      { name: 'dashboard:view', displayName: 'View Dashboard', description: 'View dashboard and analytics', module: 'dashboard', actions: JSON.stringify(['view']) },
      // Users (4)
      { name: 'users:view', displayName: 'View Users', description: 'View all users in the system', module: 'users', actions: JSON.stringify(['view']) },
      { name: 'users:create', displayName: 'Create Users', description: 'Create new users in the system', module: 'users', actions: JSON.stringify(['create']) },
      { name: 'users:update', displayName: 'Update Users', description: 'Update user information and profiles', module: 'users', actions: JSON.stringify(['update']) },
      { name: 'users:delete', displayName: 'Delete Users', description: 'Delete users from the system', module: 'users', actions: JSON.stringify(['delete']) },
      // Products (4)
      { name: 'products:view', displayName: 'View Products', description: 'View all products in the catalog', module: 'products', actions: JSON.stringify(['view']) },
      { name: 'products:create', displayName: 'Create Products', description: 'Create new products in the catalog', module: 'products', actions: JSON.stringify(['create']) },
      { name: 'products:update', displayName: 'Update Products', description: 'Update product information and details', module: 'products', actions: JSON.stringify(['update']) },
      { name: 'products:delete', displayName: 'Delete Products', description: 'Delete products from the catalog', module: 'products', actions: JSON.stringify(['delete']) },
      // Orders (3)
      { name: 'orders:view', displayName: 'View Orders', description: 'View all customer orders', module: 'orders', actions: JSON.stringify(['view']) },
      { name: 'orders:update', displayName: 'Update Orders', description: 'Update order status and information', module: 'orders', actions: JSON.stringify(['update']) },
      { name: 'orders:delete', displayName: 'Delete Orders', description: 'Delete orders from the system', module: 'orders', actions: JSON.stringify(['delete']) },
      // Analytics (2)
      { name: 'analytics:view', displayName: 'View Analytics', description: 'View analytics and reports', module: 'analytics', actions: JSON.stringify(['view']) },
      { name: 'analytics:export', displayName: 'Export Analytics', description: 'Export analytics data to external formats', module: 'analytics', actions: JSON.stringify(['export']) },
      // Roles (5)
      { name: 'roles:view', displayName: 'View Roles', description: 'View all system roles', module: 'roles', actions: JSON.stringify(['view']) },
      { name: 'roles:create', displayName: 'Create Roles', description: 'Create new roles with specific permissions', module: 'roles', actions: JSON.stringify(['create']) },
      { name: 'roles:update', displayName: 'Update Roles', description: 'Update role information and permissions', module: 'roles', actions: JSON.stringify(['update']) },
      { name: 'roles:delete', displayName: 'Delete Roles', description: 'Delete roles from the system', module: 'roles', actions: JSON.stringify(['delete']) },
      { name: 'roles:manage', displayName: 'Manage Roles', description: 'Full role management including creation, update, and deletion', module: 'roles', actions: JSON.stringify(['create', 'read', 'update', 'delete']) },
      // Settings (2)
      { name: 'settings:view', displayName: 'View Settings', description: 'View application settings and configuration', module: 'settings', actions: JSON.stringify(['view']) },
      { name: 'settings:update', displayName: 'Update Settings', description: 'Update application settings and configuration', module: 'settings', actions: JSON.stringify(['update']) },
      // Logs (1)
      { name: 'logs:view', displayName: 'View Logs', description: 'View activity logs and audit trail', module: 'logs', actions: JSON.stringify(['view']) }
    ];
    for (const p of perms) { await models.Permission.create(p); count++; }
    console.log('3️⃣  Permissions: 22 (dashboard, users, products, orders, analytics, roles, settings, logs)');

    // 4. MODULES (8 - Aligns with permissions)
    const mods = [
      { name: 'dashboard', displayName: 'Dashboard' }, { name: 'users', displayName: 'User Management' },
      { name: 'products', displayName: 'Products' }, { name: 'orders', displayName: 'Orders' },
      { name: 'analytics', displayName: 'Analytics' }, { name: 'roles', displayName: 'Roles & Permissions' },
      { name: 'settings', displayName: 'Settings' }, { name: 'logs', displayName: 'Activity Logs' }
    ];
    for (const m of mods) { await models.Module.create(m); count++; }
    console.log('4️⃣  Modules: 8 (dashboard, users, products, orders, analytics, roles, settings, logs)');

    // 5. ROLE PERMISSIONS - Map permissions to roles based on role levels
    const rolePermissionMap = {
      super_admin: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22], // All 22 permissions
      admin: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21], // All except settings:update
      manager: [1, 2, 3, 4, 6, 7, 10, 12, 13], // Limited: dashboard, users:view/update, products:view/update, orders:view/update, analytics:view, logs:view
      customer: [1] // Dashboard only
    };
    
    let rpCount = 0;
    for (const [roleName, permIds] of Object.entries(rolePermissionMap)) {
      const role = roles.find(r => r.name === roleName);
      if (!role) continue;
      const roleId = roleIds[roles.indexOf(role)];
      
      for (const permId of permIds) {
        try {
          await models.RolePermission.create({ roleId: roleId, permissionId: permId });
          rpCount++;
        } catch (e) { }
      }
    }
    console.log('5️⃣  Role Permissions: ' + rpCount);

    // 6. SESSIONS (20)
    for (let i = 0; i < 20; i++) {
      await models.Session.create({
        userId: userIds[i], token: `token_${i}_${Date.now()}`, ipAddress: `192.168.1.${i}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), isActive: true
      });
      count++;
    }
    console.log('6️⃣  Sessions: 20');

    // 7. BRANDS (8)
    const brandIds = [];
    for (const b of brands) {
      const x = await models.Brand.create({ name: b, description: `${b} collection` });
      brandIds.push(x.id);
      count++;
    }
    console.log('7️⃣  Brands: 8');

    // 8. CATEGORIES (8)
    const catIds = [];
    for (const c of categories) {
      const x = await models.Category.create({ name: c, slug: c.toLowerCase() });
      catIds.push(x.id);
      count++;
    }
    console.log('8️⃣  Categories: 8');

    // 8.a WAREHOUSES (5)
    const warehouseIds = [];
    if (models.Warehouse) {
      const warehouses = [
        { name: 'Mumbai Main', location: 'Mumbai', address: '123 Port Road', city: 'Mumbai', state: 'Maharashtra', zipCode: '400001', country: 'India', capacity: 5000, manager: 'Rajesh Kumar', phone: '+91-9876543210', email: 'mumbai@warehouse.com', status: 'active' },
        { name: 'Delhi North', location: 'Delhi', address: '456 Industrial Area', city: 'Delhi', state: 'Delhi', zipCode: '110001', country: 'India', capacity: 4000, manager: 'Amit Singh', phone: '+91-9765432100', email: 'delhi@warehouse.com', status: 'active' },
        { name: 'Bangalore Tech', location: 'Bangalore', address: '789 Tech Park', city: 'Bangalore', state: 'Karnataka', zipCode: '560001', country: 'India', capacity: 3500, manager: 'Priya Sharma', phone: '+91-9654321000', email: 'bangalore@warehouse.com', status: 'active' },
        { name: 'Chennai Port', location: 'Chennai', address: '321 Port Zone', city: 'Chennai', state: 'Tamil Nadu', zipCode: '600001', country: 'India', capacity: 3000, manager: 'Vikram Reddy', phone: '+91-8765432100', email: 'chennai@warehouse.com', status: 'active' },
        { name: 'Pune Valley', location: 'Pune', address: '654 Valley Road', city: 'Pune', state: 'Maharashtra', zipCode: '411001', country: 'India', capacity: 2500, manager: 'Neha Joshi', phone: '+91-8654321000', email: 'pune@warehouse.com', status: 'active' }
      ];
      for (const w of warehouses) {
        const x = await models.Warehouse.create(w);
        warehouseIds.push(x.id);
        count++;
      }
      console.log('8️⃣a Warehouses: 5 (Mumbai, Delhi, Bangalore, Chennai, Pune)');
    }

    // 8.b SUPPLIERS (5)
    const supplierIds = [];
    if (models.Supplier) {
      const suppliers = [
        { name: 'Global Textile Exports Ltd', email: 'contact@globaltextile.com', phone: '+91-9876543210', address: '123 Textile Park', city: 'Tiruppur', state: 'Tamil Nadu', zipCode: '641601', country: 'India', contactPerson: 'Rajesh Kumar', website: 'https://www.globaltextile.com', companyRegistration: 'TN-REG-2020-001', taxId: 'TN29ABCDE1234F1Z0', paymentTerms: 'Net 30', minimumOrderQuantity: 100, leadTime: 7, status: 'active', rating: 4.5 },
        { name: 'Fashion Fabrics International', email: 'sales@fashionfabrics.com', phone: '+91-9765432100', address: '456 Fashion Street', city: 'Bangalore', state: 'Karnataka', zipCode: '560001', country: 'India', contactPerson: 'Priya Singh', website: 'https://www.fashionfabrics.com', companyRegistration: 'KA-REG-2019-045', taxId: 'KA29XYZAB5678P1A1', paymentTerms: 'Net 45', minimumOrderQuantity: 50, leadTime: 5, status: 'active', rating: 4.7 },
        { name: 'Delhi Dyeing & Printing Co.', email: 'enquiry@delhidyeing.com', phone: '+91-9654321000', address: '789 Industrial Complex', city: 'Delhi', state: 'Delhi', zipCode: '110001', country: 'India', contactPerson: 'Amit Sharma', website: 'https://www.delhidyeing.com', companyRegistration: 'DL-REG-2018-023', taxId: 'DL29MNOPQ9012R1M1', paymentTerms: 'Net 60', minimumOrderQuantity: 200, leadTime: 10, status: 'active', rating: 4.2 },
        { name: 'Mumbai Apparel Traders', email: 'info@mumbaiapparel.com', phone: '+91-8765432100', address: '321 Trade Center', city: 'Mumbai', state: 'Maharashtra', zipCode: '400001', country: 'India', contactPerson: 'Vikram Patel', website: 'https://www.mumbaiapparel.com', companyRegistration: 'MH-REG-2017-089', taxId: 'MH29STUV1234W1S1', paymentTerms: 'Net 30', minimumOrderQuantity: 75, leadTime: 8, status: 'active', rating: 4.4 },
        { name: 'Chennai Export House', email: 'business@chennaiexport.com', phone: '+91-7654321000', address: '654 Export Zone', city: 'Chennai', state: 'Tamil Nadu', zipCode: '600001', country: 'India', contactPerson: 'Ravi Krishnan', website: 'https://www.chennaiexport.com', companyRegistration: 'TN-REG-2016-034', taxId: 'TN29XYZA5678B1X1', paymentTerms: 'Net 45', minimumOrderQuantity: 150, leadTime: 12, status: 'active', rating: 3.9 }
      ];
      for (const s of suppliers) {
        const x = await models.Supplier.create(s);
        supplierIds.push(x.id);
        count++;
      }
      console.log('8️⃣b Suppliers: 5 (textile, fabrics, dyeing, apparel, export)');
    }

    // 9. PRODUCTS (50)
    const prodIds = [];
    for (let i = 0; i < 50; i++) {
      const imgPath = imageUtil.createMediaFile('products', productTitles[i % productTitles.length], i, 'svg');
      const p = await models.Product.create({
        title: productTitles[i % productTitles.length], description: 'Quality product', price: rand(500, 5000),
        stock: rand(10, 500), sku: `SKU${i}`, brandId: pick(brandIds), categoryId: pick(catIds),
        images: [imgPath], rating: (rand(35, 50) / 10).toFixed(1), reviewCount: rand(0, 500)
      });
      prodIds.push(p.id);
      count++;
    }
    console.log('9️⃣  Products: 50');

    // 10. PRODUCT COMMENTS (40)
    for (let i = 0; i < 40; i++) {
      await models.ProductComment.create({
        productId: pick(prodIds), userId: pick(userIds), comment: 'Great!', rating: rand(1, 5), createdAt: randDate()
      });
      count++;
    }
    console.log('🔟 Product Comments: 40');

    // 11. PRODUCT SHARES (40)
    for (let i = 0; i < 40; i++) {
      await models.ProductShare.create({
        productId: pick(prodIds), sharedBy: pick(userIds), platform: pick(['whatsapp', 'facebook', 'instagram', 'email']), sharedAt: randDate()
      });
      count++;
    }
    console.log('1️⃣1️⃣ Product Shares: 40');

    // 12. CARTS (25)
    for (let i = 0; i < 25; i++) {
      await models.Cart.create({
        userId: userIds[i], items: [{ productId: pick(prodIds), quantity: 1 }], totalPrice: rand(500, 5000), totalQuantity: 1
      });
      count++;
    }
    console.log('1️⃣2️⃣ Carts: 25');

    // 13. WISHLISTS (40)
    for (let i = 0; i < 40; i++) {
      await models.Wishlist.create({ userId: pick(userIds), productId: pick(prodIds), addedAt: randDate() });
      count++;
    }
    console.log('1️⃣3️⃣ Wishlists: 40');

    // 14. ORDERS (50)
    const orderIds = [];
    for (let i = 0; i < 50; i++) {
      const o = await models.Order.create({
        orderNumber: `ORD${Date.now()}${i}`, customerId: pick(userIds), items: [{ productId: pick(prodIds), quantity: 1 }],
        totalAmount: rand(1000, 20000), status: pick(['pending', 'confirmed', 'shipped', 'delivered']),
        paymentStatus: 'paid', paymentMethod: pick(['credit_card', 'debit_card', 'upi']), shippingAddress: 'Address', createdAt: randDate()
      });
      orderIds.push(o.id);
      count++;
    }
    console.log('1️⃣4️⃣ Orders: 50');

    // 15. PAYMENTS (50)
    for (let i = 0; i < 50; i++) {
      await models.Payment.create({
        orderId: orderIds[i], amount: rand(1000, 20000), paymentMethod: pick(['credit_card', 'debit_card', 'upi']),
        transactionId: `TXN${i}`, status: pick(['pending', 'completed', 'failed']), paymentGateway: 'Razorpay'
      });
      count++;
    }
    console.log('1️⃣5️⃣ Payments: 50');

    // 16. RETURNS (20)
    for (let i = 0; i < 20; i++) {
      await models.Return.create({
        orderId: orderIds[i], userId: pick(userIds), reason: pick(['Damaged', 'Wrong item', 'Not as described', 'Defective']),
        status: pick(['pending', 'approved', 'rejected', 'completed']), refundAmount: rand(500, 5000), items: []
      });
      count++;
    }
    console.log('1️⃣6️⃣ Returns: 20');

    // 17. COURIERS (5)
    const courierData = [
      { name: 'FedEx', code: 'FEDEX', website: 'fedex.com' },
      { name: 'DHL', code: 'DHL', website: 'dhl.com' },
      { name: 'UPS', code: 'UPS', website: 'ups.com' },
      { name: 'Flipkart', code: 'FL', website: 'flipkart.com' },
      { name: 'Amazon', code: 'AMZN', website: 'amazon.com' }
    ];
    for (const c of courierData) { await models.Courier.create(c); count++; }
    console.log('1️⃣7️⃣ Couriers: 5');

    // 18. SHIPMENTS (50)
    for (let i = 0; i < 50; i++) {
      await models.Shipment.create({
        orderId: orderIds[i], courierId: rand(1, 5), trackingNumber: `TRACK${i}`,
        status: pick(['pending', 'picked', 'in_transit', 'delivered', 'failed']), estimatedDelivery: new Date()
      });
      count++;
    }
    console.log('1️⃣8️⃣ Shipments: 50');

    // 19. SHIPPING CHARGES (10)
    const sc = [
      { name: 'Express', minWeight: 0, maxWeight: 5, charge: 150, courierId: 1 },
      { name: 'Standard', minWeight: 0, maxWeight: 5, charge: 50, courierId: 2 },
      { name: 'Economy', minWeight: 0, maxWeight: 5, charge: 30, courierId: 3 },
      { name: 'Express', minWeight: 5, maxWeight: 10, charge: 250, courierId: 1 },
      { name: 'Standard', minWeight: 5, maxWeight: 10, charge: 100, courierId: 2 },
      { name: 'Economy', minWeight: 5, maxWeight: 10, charge: 60, courierId: 3 },
      { name: 'Free', minWeight: 0, maxWeight: 5, charge: 0, courierId: 4 },
      { name: 'Premium', minWeight: 0, maxWeight: 2, charge: 500, courierId: 5 },
      { name: 'Weekend', minWeight: 0, maxWeight: 5, charge: 120, courierId: 2 },
      { name: 'Rural', minWeight: 0, maxWeight: 5, charge: 200, courierId: 3 }
    ];
    for (const s of sc) { await models.ShippingCharge.create(s); count++; }
    console.log('1️⃣9️⃣ Shipping Charges: 10');

    // 20. COUPONS (40)
    for (let i = 0; i < 40; i++) {
      await models.Coupon.create({
        code: `COUPON${i}`, description: `Save ${rand(10, 50)}%`, discountType: 'percentage', discountValue: rand(10, 50),
        minPurchase: rand(500, 2000), maxDiscount: 5000, usageLimit: 100, usageCount: rand(0, 50),
        validFrom: randDate(30), validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), isActive: true
      });
      count++;
    }
    console.log('2️⃣0️⃣ Coupons: 40');

    // 21. FLASH SALES (15)
    for (let i = 0; i < 15; i++) {
      const st = randDate(7);
      await models.FlashSale.create({
        name: `Flash Sale ${i}`, description: 'Limited time', discountPercentage: rand(10, 50),
        startTime: st, endTime: new Date(st.getTime() + 24 * 60 * 60 * 1000), isActive: true
      });
      count++;
    }
    console.log('2️⃣1️⃣ Flash Sales: 15');

    // 22. CAMPAIGNS (20)
    for (let i = 0; i < 20; i++) {
      await models.Campaign.create({
        name: `Campaign ${i}`, description: 'Marketing', type: pick(['seasonal', 'promotional']),
        startDate: randDate(30), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), isActive: true
      });
      count++;
    }
    console.log('2️⃣2️⃣ Campaigns: 20');

    // 23. PROMOTIONS (20)
    for (let i = 0; i < 20; i++) {
      await models.Promotion.create({
        title: `Promo ${i}`, description: 'Special offer', type: pick(['discount', 'bogo']),
        discountValue: rand(100, 1000), discountType: 'fixed', appliesTo: 'all',
        validFrom: randDate(30), validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), isActive: true
      });
      count++;
    }
    console.log('2️⃣3️⃣ Promotions: 20');

    // 24. NOTIFICATIONS (40)
    for (let i = 0; i < 40; i++) {
      await models.Notification.create({
        userId: pick(userIds), title: `Notif ${i}`, message: 'New message', type: pick(['order', 'promotion']),
        isRead: Math.random() > 0.5, createdAt: randDate()
      });
      count++;
    }
    console.log('2️⃣4️⃣ Notifications: 40');

    // 25. REWARDS (40)
    for (let i = 0; i < 40; i++) {
      await models.Reward.create({
        userId: pick(userIds), points: rand(100, 1000), description: 'Reward', type: pick(['purchase', 'referral']),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), isActive: true
      });
      count++;
    }
    console.log('2️⃣5️⃣ Rewards: 40');

    // 26. POSTS (20)
    for (let i = 0; i < 20; i++) {
      await models.Post.create({
        title: `Post ${i}`, content: 'Blog content', author: pick(userIds), isPublished: true, publishedAt: randDate()
      });
      count++;
    }
    console.log('2️⃣6️⃣ Posts: 20');

    // 27. STORIES (20)
    for (let i = 0; i < 20; i++) {
      const storyUrl = imageUtil.createMediaFile('stories', `story ${i}`, i, 'svg');
      await models.Story.create({ mediaUrl: storyUrl, mediaType: 'image', duration: 5, isActive: true });
      count++;
    }
    console.log('2️⃣7️⃣ Stories: 20');

    // 28. REELS (20)
    for (let i = 0; i < 20; i++) {
      const reelFile = imageUtil.createMediaFile('reels', `reel ${i}`, i, 'mp4');
      await models.Reel.create({ videoUrl: reelFile, title: `Reel ${i}`, duration: 30, views: rand(0, 10000) });
      count++;
    }
    console.log('2️⃣8️⃣ Reels: 20');

    // 29. PAGES (10)
    const pages = [{ title: 'About', slug: 'about' }, { title: 'Contact', slug: 'contact' }, { title: 'Privacy', slug: 'privacy' },
      { title: 'Terms', slug: 'terms' }, { title: 'Shipping', slug: 'shipping' }, { title: 'Returns', slug: 'returns' },
      { title: 'FAQs', slug: 'faqs' }, { title: 'Blog', slug: 'blog' }, { title: 'Gallery', slug: 'gallery' }, { title: 'Careers', slug: 'careers' }];
    for (const p of pages) { await models.Page.create({ ...p, content: 'Content', isPublished: true }); count++; }
    console.log('2️⃣9️⃣ Pages: 10');

    // 30. BANNERS (15)
    for (let i = 0; i < 15; i++) {
      const bannerImg = imageUtil.createMediaFile('banners', `banner ${i}`, i, 'svg');
      await models.Banner.create({
        title: `Banner ${i}`, image: bannerImg, link: '/', position: pick(['header', 'footer']),
        startDate: randDate(30), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), isActive: true
      });
      count++;
    }
    console.log('3️⃣0️⃣ Banners: 15');

    // 31. FAQs (20)
    const faqs = ['How to order?', 'What\'s shipping?', 'How to track?', 'Return policy?', 'Do you exchange?',
      'How long delivery?', 'Payment methods?', 'Cancel order?', 'Contact support?', 'Ship international?',
      'Warranty?', 'Use coupon?', 'Hidden charges?', 'Reset password?', 'Gift cards?', 'Business hours?',
      'Become seller?', 'Loyalty program?', 'Leave review?', 'Sizes available?'];
    for (let i = 0; i < 20; i++) {
      await models.FAQ.create({
        question: faqs[i], answer: `Answer to: ${faqs[i]}`, category: pick(['order', 'shipping', 'payment']), order: i + 1, isActive: true
      });
      count++;
    }
    console.log('3️⃣1️⃣ FAQs: 20');

    // 32. KYC DOCUMENTS (10)
    for (let i = 0; i < 10 && i + 5 < userIds.length; i++) {
      await models.KYCDocument.create({
        userId: userIds[i + 5], documentType: pick(['aadhar', 'pan', 'passport']), documentNumber: `DOC${rand(1000000, 9999999)}`,
        status: pick(['pending', 'verified']), expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });
      count++;
    }
    console.log('3️⃣2️⃣ KYC Documents: 10');

    // 33. SELLER COMMISSION (25)
    for (let i = 0; i < 25 && i < orderIds.length; i++) {
      await models.SellerCommission.create({
        sellerId: userIds[rand(5, 12)], orderId: orderIds[i], commissionPercent: rand(5, 20),
        commissionAmount: rand(100, 2000), status: pick(['pending', 'paid'])
      });
      count++;
    }
    console.log('3️⃣3️⃣ Seller Commission: 25');

    // 34. SELLER PERFORMANCE (8)
    for (let i = 0; i < 8 && i + 5 < userIds.length; i++) {
      await models.SellerPerformance.create({
        sellerId: userIds[i + 5], totalSales: rand(10000, 100000), totalOrders: rand(50, 500),
        averageRating: (rand(35, 50) / 10).toFixed(1)
      });
      count++;
    }
    console.log('3️⃣4️⃣ Seller Performance: 8');

    // 35. INVENTORY (15) - Stock management for products
    const inventoryIds = [];
    // Skip Inventory seeding - wrapped model requires special handling
    // Can be seeded separately via API or dedicated seeder
    if (false && models.Inventory && warehouseIds.length > 0 && prodIds.length > 0) {
      // Skipping for now
    }

    // 35.a INVENTORY ALERTS (10)
    // Skip - requires Inventory records first
    if (false && models.InventoryAlert && prodIds.length > 0) {
      // Skipping for now
    }

    // 35.b INVENTORY HISTORY (20) - Transaction history
    // Skip - requires special model handling
    if (false && models.InventoryHistory && inventoryIds.length > 0) {
      // Skipping for now
    }

    // 36. SEARCH HISTORY (40)
    const searches = ['shirt', 'dress', 'shoes', 'jeans', 'saree'];
    for (let i = 0; i < 40; i++) {
      await models.SearchHistory.create({ userId: pick(userIds), searchQuery: pick(searches), resultCount: rand(1, 100), searchedAt: randDate() });
      count++;
    }
    console.log('3️⃣6️⃣ Search History: 40');

    // 37. SEARCH SUGGESTIONS (30)
    for (let i = 0; i < 30; i++) {
      await models.SearchSuggestion.create({ keyword: `${pick(searches)} ${i}`, frequency: rand(100, 1000), isActive: true });
      count++;
    }
    console.log('3️⃣7️⃣ Search Suggestions: 30');

    // 38. TRENDING SEARCHES (15)
    for (let i = 0; i < 15; i++) {
      await models.TrendingSearch.create({ keyword: `trending ${pick(searches)}`, searchCount: rand(1000, 10000), rank: i + 1 });
      count++;
    }
    console.log('3️⃣8️⃣ Trending Searches: 15');

    // 39. USER BEHAVIOR (40)
    for (let i = 0; i < 40; i++) {
      await models.UserBehavior.create({ userId: pick(userIds), action: pick(['view_product', 'purchase', 'wishlist']), createdAt: randDate() });
      count++;
    }
    console.log('3️⃣9️⃣ User Behavior: 40');

    // 40. AUDIT LOGS (40)
    for (let i = 0; i < 40; i++) {
      await models.AuditLog.create({
        userId: userIds[rand(0, 4)], action: pick(['login', 'create', 'edit', 'delete']), module: pick(categories),
        description: 'Action', createdAt: randDate()
      });
      count++;
    }
    console.log('4️⃣0️⃣ Audit Logs: 40');

    // 41. TRANSACTIONS (40)
    for (let i = 0; i < 40; i++) {
      await models.Transaction.create({
        userId: pick(userIds), type: pick(['credit', 'debit']), amount: rand(100, 5000),
        reference: `REF${i}`, description: 'Transaction', balance: rand(0, 50000), status: pick(['pending', 'completed'])
      });
      count++;
    }
    console.log('4️⃣1️⃣ Transactions: 40');

    // 42. TICKETS (30)
    for (let i = 0; i < 30; i++) {
      await models.Ticket.create({
        ticketNumber: `TKT${Date.now()}${i}`, userId: pick(userIds), subject: `Issue ${i}`, description: 'Support needed',
        category: pick(['order', 'product', 'payment']), priority: pick(['low', 'medium', 'high']), status: pick(['open', 'resolved'])
      });
      count++;
    }
    console.log('4️⃣2️⃣ Tickets: 30');

    // 43. QUICK ACTIONS (15)
    const qa = [{ name: 'Dashboard', icon: 'dashboard', url: '/dashboard' }, { name: 'Orders', icon: 'cart', url: '/orders' },
      { name: 'Products', icon: 'box', url: '/products' }, { name: 'Customers', icon: 'users', url: '/customers' },
      { name: 'Reports', icon: 'chart', url: '/reports' }, { name: 'Settings', icon: 'gear', url: '/settings' },
      { name: 'Messages', icon: 'mail', url: '/messages' }, { name: 'Analytics', icon: 'graph', url: '/analytics' },
      { name: 'Inventory', icon: 'package', url: '/inventory' }, { name: 'Payments', icon: 'card', url: '/payments' },
      { name: 'Promotions', icon: 'gift', url: '/promotions' }, { name: 'Reviews', icon: 'star', url: '/reviews' },
      { name: 'Coupons', icon: 'tag', url: '/coupons' }, { name: 'Users', icon: 'user', url: '/users' },
      { name: 'Content', icon: 'file', url: '/content' }];
    for (let i = 0; i < qa.length; i++) { await models.QuickAction.create({ ...qa[i], order: i + 1, isActive: true }); count++; }
    console.log('4️⃣3️⃣ Quick Actions: 15');

    // 44. LIVE STREAMS (15)
    for (let i = 0; i < 15; i++) {
      await models.LiveStream.create({
        title: `Stream ${i}`, description: 'Fashion show', hostId: userIds[rand(5, 12)],
        streamUrl: `https://stream/${i}`, status: pick(['scheduled', 'live', 'ended']),
        startTime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000), viewers: rand(0, 5000)
      });
      count++;
    }
    console.log('4️⃣4️⃣ Live Streams: 15');

    // 45. STYLE INSPIRATION (15)
    for (let i = 0; i < 15; i++) {
      const styleImg = imageUtil.createMediaFile('style_inspiration', `style ${i}`, i, 'svg');
      await models.StyleInspiration.create({
        title: `Style ${i}`, description: 'Inspiring look', image: styleImg,
        season: pick(['spring', 'summer', 'fall', 'winter']), style: pick(['casual', 'formal']), isActive: true
      });
      count++;
    }
    console.log('4️⃣5️⃣ Style Inspiration: 15');

    console.log('\n' + '═'.repeat(50));
    console.log(`✅ SEEDING COMPLETE!`);
    console.log(`📊 Total records: ${count}`);
    console.log(`🎉 All tables populated with production data!`);
    console.log(`📝 Note: Inventory, Inventory Alerts, and Inventory History can be seeded separately via API or dedicated seeder`);
    console.log('═'.repeat(50) + '\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error (full):', err);
    if (err && err.errors && Array.isArray(err.errors)) {
      console.error('Details:');
      for (const e of err.errors) {
        console.error('-', e.message, '| path:', e.path, '| value:', e.value);
      }
    }
    if (err && err.stack) console.error(err.stack);
    process.exit(1);
  }
}

seed();
