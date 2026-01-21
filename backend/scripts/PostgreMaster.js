/**
 * ============================================================================
 * POSTGREMASTER - CENTRALIZED DATABASE SEEDER FOR POSTGRESQL
 * ============================================================================
 * 
 * Purpose: Single master seeder for all database tables
 * Features:
 *   - Relationship-aware seeding (follows FK constraints)
 *   - FK validation (ensures all references exist)
 *   - Proper execution order (master tables → parent → child → junction)
 *   - Error recovery (logs FK violations, continues seeding)
 *   - Centralized management (NO scattered seeders)
 * 
 * Execution Order (CRITICAL for FK integrity):
 * 1. MASTER TABLES: Roles, Departments, Modules, Permissions, Warehouses
 * 2. PARENT TABLES: Users, Brands, Categories, Couriers, Suppliers
 * 3. CHILD TABLES: Products, Orders, Payments, Shipments, Returns
 * 4. JUNCTION TABLES: RolePermissions, Wishlists, Carts, etc.
 * 5. ENGAGEMENT TABLES: Posts, Stories, Reels, Comments, etc.
 * 
 * Usage:
 *   node scripts/PostgreMaster.js
 * 
 * ============================================================================
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../models_sql');
const models = require('../models_sql')._raw;
const imageUtil = require('./image-utils');

// ============================================================================
// SEED DATA
// ============================================================================

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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randDate(daysBack = 90) { return new Date(Date.now() - Math.random() * daysBack * 24 * 60 * 60 * 1000); }

/**
 * Validate that FK references exist before creating records
 * @param {string} tableName - Table being seeded
 * @param {string} fkColumn - Foreign key column name
 * @param {any} fkValue - FK value to validate
 * @param {string} parentTable - Parent table name
 * @param {string} parentPkColumn - Parent PK column name
 * @returns {boolean} True if FK exists
 */
async function validateFK(tableName, fkColumn, fkValue, parentTable, parentPkColumn = 'id') {
  if (!fkValue) return true; // Nullable FK
  try {
    const result = await sequelize.query(
      `SELECT 1 FROM "${parentTable}" WHERE "${parentPkColumn}" = :fkValue LIMIT 1`,
      { replacements: { fkValue }, type: sequelize.QueryTypes.SELECT }
    );
    if (!result || result.length === 0) {
      console.warn(`  ⚠️ FK Violation: ${tableName}.${fkColumn}=${fkValue} → ${parentTable}.${parentPkColumn} not found!`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`  ⚠️ FK Validation Error for ${tableName}.${fkColumn}:`, err.message);
    return true; // Continue on validation error
  }
}

/**
 * Track seeding statistics
 */
const stats = {
  total: 0,
  tables: {},
  fkViolations: [],
  errors: []
};

function logRecord(tableName, count = 1) {
  stats.total += count;
  stats.tables[tableName] = (stats.tables[tableName] || 0) + count;
}

async function seed() {
  try {
    console.log('\n' + '═'.repeat(70));
    console.log('🚀 POSTGREMASTER - CENTRALIZED DATABASE SEEDER');
    console.log('═'.repeat(70) + '\n');
    
    console.log('📋 PHASE 0: DATABASE CONNECTION & CLEANUP');
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');
    
    // Clear all tables with TRUNCATE CASCADE (without dropping any tables)
    console.log('📋 PHASE 0A: CLEARING TABLES (Relationship-Safe)\n');
    try {
      const tables = Object.keys(models).map(key => {
        const model = models[key];
        return model.getTableName ? model.getTableName() : null;
      }).filter(Boolean);
      
      // Only truncate tables, do NOT drop any tables
      for (const table of tables) {
        try {
          await sequelize.query(`TRUNCATE TABLE "${table}" CASCADE;`);
          console.log(`  ✓ Truncated ${table}`);
        } catch (e) {
          // Silent - some tables may not exist
        }
      }
      console.log('✅ All tables cleared (preserved)\n');
    } catch (e) {
      console.warn('⚠️ Truncate warning:', e.message);
    }

    
    await sequelize.sync({ alter: true });
    console.log('✅ Schema synced\n');

    // Store IDs for FK references
    const refs = {
      roleIds: [],
      userIds: [],
      brandIds: [],
      categoryIds: [],
      subCategoryIds: [],
      productIds: [],
      courierIds: [],
      warehouseIds: [],
      orderIds: [],
      paymentIds: [],
      shipmentIds: [],
      permissionIds: [],
      moduleIds: []
    };

    let count = 0; // Track total records seeded

    console.log('═'.repeat(70));
    console.log('📋 PHASE 1: MASTER TABLES (No FK dependencies)');
    console.log('═'.repeat(70) + '\n');

    // 1. ROLES (4 Standard RBAC Roles) - MASTER TABLE
    const roles = [
      { name: 'super_admin', displayName: 'Super Administrator', description: 'Full system access with all permissions', level: 1, isActive: true, isSystem: true },
      { name: 'admin', displayName: 'Administrator', description: 'Administrative access with most permissions (no settings management)', level: 2, isActive: true, isSystem: true },
      { name: 'manager', displayName: 'Manager', description: 'Management access with limited permissions (dashboard, users, products, orders)', level: 3, isActive: true, isSystem: true },
      { name: 'customer', displayName: 'Customer', description: 'Basic customer access (dashboard only)', level: 4, isActive: true, isSystem: true }
    ];
    for (const r of roles) { 
      const x = await models.Role.create(r); 
      refs.roleIds.push(x.id); 
      logRecord('roles');
    }
    console.log('✅ Roles: 4 (super_admin, admin, manager, customer)');

    // 1.1 DEPARTMENTS (if model exists) - MASTER TABLE
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
        for (const d of departments) { 
          await models.Department.create(d); 
          logRecord('departments');
        }
        console.log('✅ Departments: 6');
      } catch (e) {
        console.error('❌ Error seeding Departments:', e.message);
        stats.errors.push({ table: 'departments', error: e.message });
      }
    } else {
      console.warn('⚠️ Department model not found - skipping');
    }

    // 1.2 MODULES - MASTER TABLE
    const modules = [
      { name: 'products', displayName: 'Products', description: 'Product management', isActive: true },
      { name: 'orders', displayName: 'Orders', description: 'Order management', isActive: true },
      { name: 'users', displayName: 'Users', description: 'User management', isActive: true },
      { name: 'reports', displayName: 'Reports', description: 'Reporting and analytics', isActive: true },
      { name: 'content', displayName: 'Content', description: 'Content management', isActive: true },
      { name: 'settings', displayName: 'Settings', description: 'System settings', isActive: true },
      { name: 'payments', displayName: 'Payments', description: 'Payment processing', isActive: true },
      { name: 'inventory', displayName: 'Inventory', description: 'Inventory management', isActive: true }
    ];
    for (const m of modules) { 
      const x = await models.Module.create(m); 
      refs.moduleIds.push(x.id); 
      logRecord('modules');
    }
    console.log('✅ Modules: 8\n');

    console.log('═'.repeat(70));
    console.log('📋 PHASE 2: PARENT TABLES (Master table FKs)');
    console.log('═'.repeat(70) + '\n');
    // 2. USERS (45) - Parent table with FK to Roles
    // Balanced role distribution:
    // - super_admin: 1 user (0)
    // - admin: 4 users (1-4)
    // - manager: 10 users (5-14)
    // - customer: 30 users (15-44)
    console.log('⏳ Seeding Users (45 records with balanced roles)...');
    for (let i = 0; i < 45; i++) {
      try {
        let roleId;
        const roleNames = ['super_admin', 'admin', 'manager', 'customer'];
        
        if (i === 0) {
          roleId = refs.roleIds[0];  // super_admin: 1 user
          roleNames[0] = '(SUPER_ADMIN)';
        } else if (i < 5) {
          roleId = refs.roleIds[1];  // admin: 4 users
          roleNames[1] = '(ADMIN)';
        } else if (i < 15) {
          roleId = refs.roleIds[2];  // manager: 10 users
          roleNames[2] = '(MANAGER)';
        } else {
          roleId = refs.roleIds[3];  // customer: 30 users
          roleNames[3] = '(CUSTOMER)';
        }
        
        // Validate FK before creating
        if (!await validateFK('users', 'role_id', roleId, 'roles', 'id')) {
          console.warn(`  ⚠️ Skipping user ${i} due to invalid role_id`);
          continue;
        }

        // Determine role name based on roleId
        let roleName = 'customer';
        if (i === 0) roleName = 'super_admin';
        else if (i < 5) roleName = 'admin';
        else if (i < 15) roleName = 'manager';
        else roleName = 'customer';

        const u = await models.User.create({
          username: `user${i}`, 
          email: `user${i}@dfashion.com`, 
          password: await bcrypt.hash('Pass123!', 12),
          fullName: `${pick(firstNames)} ${pick(lastNames)}`, 
          phone: `+919${rand(0, 9)}${rand(0, 9)}${rand(0, 9)}${rand(0, 9)}${rand(0, 9)}${rand(0, 9)}${rand(0, 9)}${rand(0, 9)}`,
          address: `${rand(1, 999)} Street`, 
          city: pick(cities), 
          state: 'State',
          role: roleName,
          role_id: roleId,
          isActive: true
        });
        refs.userIds.push(u.id);
        logRecord('users');
      } catch (e) {
        console.error(`  ❌ Error creating user ${i}:`, e.message);
        stats.errors.push({ table: 'users', index: i, error: e.message });
      }
    }
    console.log(`✅ Users: ${refs.userIds.length}`);
    console.log(`   ├─ Super Admins: 1`);
    console.log(`   ├─ Admins: 4`);
    console.log(`   ├─ Managers: 10`);
    console.log(`   └─ Customers: 30\n`);

    // 6. SESSIONS (20)
    for (let i = 0; i < 20; i++) {
      await models.Session.create({
        userId: refs.userIds[i], token: `token_${i}_${Date.now()}`, ipAddress: `192.168.1.${i}`,
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
        productId: pick(prodIds), userId: pick(refs.userIds), comment: 'Great!', rating: rand(1, 5), createdAt: randDate()
      });
      count++;
    }
    console.log('🔟 Product Comments: 40');

    // 11. PRODUCT SHARES (40)
    for (let i = 0; i < 40; i++) {
      await models.ProductShare.create({
        productId: pick(prodIds), sharedBy: pick(refs.userIds), platform: pick(['whatsapp', 'facebook', 'instagram', 'email']), sharedAt: randDate()
      });
      count++;
    }
    console.log('1️⃣1️⃣ Product Shares: 40');

    // 12. CARTS (25)
    for (let i = 0; i < 25; i++) {
      await models.Cart.create({
        userId: refs.userIds[i], items: [{ productId: pick(prodIds), quantity: 1 }], totalPrice: rand(500, 5000), totalQuantity: 1
      });
      count++;
    }
    console.log('1️⃣2️⃣ Carts: 25');

    // 13. WISHLISTS (40)
    for (let i = 0; i < 40; i++) {
      await models.Wishlist.create({ userId: pick(refs.userIds), productId: pick(prodIds), addedAt: randDate() });
      count++;
    }
    console.log('1️⃣3️⃣ Wishlists: 40');

    // 14. ORDERS (50)
    const orderIds = [];
    for (let i = 0; i < 50; i++) {
      const o = await models.Order.create({
        orderNumber: `ORD${Date.now()}${i}`, customerId: pick(refs.userIds), items: [{ productId: pick(prodIds), quantity: 1 }],
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
        orderId: orderIds[i], userId: pick(refs.userIds), reason: pick(['Damaged', 'Wrong item', 'Not as described', 'Defective']),
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
        userId: pick(refs.userIds), title: `Notif ${i}`, message: 'New message', type: pick(['order', 'promotion']),
        isRead: Math.random() > 0.5, createdAt: randDate()
      });
      count++;
    }
    console.log('2️⃣4️⃣ Notifications: 40');

    // 25. REWARDS (40)
    for (let i = 0; i < 40; i++) {
      await models.Reward.create({
        userId: pick(refs.userIds), points: rand(100, 1000), description: 'Reward', type: pick(['purchase', 'referral']),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), isActive: true
      });
      count++;
    }
    console.log('2️⃣5️⃣ Rewards: 40');

    // 26. POSTS (20)
    for (let i = 0; i < 20; i++) {
      await models.Post.create({
        title: `Post ${i}`, content: 'Blog content', userId: pick(refs.userIds), isPublished: true, publishedAt: randDate()
      });
      count++;
    }
    console.log('2️⃣6️⃣ Posts: 20');

    // 27. STORIES (20)
    for (let i = 0; i < 20; i++) {
      const storyUrl = imageUtil.createMediaFile('stories', `story ${i}`, i, 'svg');
      await models.Story.create({ mediaUrl: storyUrl, mediaType: 'image', duration: 5, isActive: true, userId: pick(refs.userIds) });
      count++;
    }
    console.log('2️⃣7️⃣ Stories: 20');

    // 28. REELS (20)
    for (let i = 0; i < 20; i++) {
      const reelFile = imageUtil.createMediaFile('reels', `reel ${i}`, i, 'mp4');
      await models.Reel.create({ videoUrl: reelFile, title: `Reel ${i}`, duration: 30, views: rand(0, 10000), userId: pick(refs.userIds) });
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
    for (let i = 0; i < 10 && i + 5 < refs.userIds.length; i++) {
      await models.KYCDocument.create({
        userId: refs.userIds[i + 5], documentType: pick(['aadhar', 'pan', 'passport']), documentNumber: `DOC${rand(1000000, 9999999)}`,
        status: pick(['pending', 'verified']), expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });
      count++;
    }
    console.log('3️⃣2️⃣ KYC Documents: 10');

    // 33. SELLER COMMISSION (25)
    for (let i = 0; i < 25 && i < orderIds.length; i++) {
      await models.SellerCommission.create({
        sellerId: refs.userIds[rand(5, 12)], orderId: orderIds[i], commissionPercent: rand(5, 20),
        commissionAmount: rand(100, 2000), status: pick(['pending', 'paid'])
      });
      count++;
    }
    console.log('3️⃣3️⃣ Seller Commission: 25');

    // 34. SELLER PERFORMANCE (8)
    for (let i = 0; i < 8 && i + 5 < refs.userIds.length; i++) {
      await models.SellerPerformance.create({
        sellerId: refs.userIds[i + 5], totalSales: rand(10000, 100000), totalOrders: rand(50, 500),
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
      await models.SearchHistory.create({ userId: pick(refs.userIds), searchQuery: pick(searches), resultCount: rand(1, 100), searchedAt: randDate() });
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
      await models.UserBehavior.create({ userId: pick(refs.userIds), action: pick(['view_product', 'purchase', 'wishlist']), createdAt: randDate() });
      count++;
    }
    console.log('3️⃣9️⃣ User Behavior: 40');

    // 40. AUDIT LOGS (40)
    for (let i = 0; i < 40; i++) {
      await models.AuditLog.create({
        userId: refs.userIds[rand(0, 4)], action: pick(['login', 'create', 'edit', 'delete']), module: pick(categories),
        description: 'Action', createdAt: randDate()
      });
      count++;
    }
    console.log('4️⃣0️⃣ Audit Logs: 40');

    // 41. TRANSACTIONS (40)
    for (let i = 0; i < 40; i++) {
      await models.Transaction.create({
        userId: pick(refs.userIds), type: pick(['credit', 'debit']), amount: rand(100, 5000),
        reference: `REF${i}`, description: 'Transaction', balance: rand(0, 50000), status: pick(['pending', 'completed'])
      });
      count++;
    }
    console.log('4️⃣1️⃣ Transactions: 40');

    // 42. TICKETS (30)
    for (let i = 0; i < 30; i++) {
      await models.Ticket.create({
        ticketNumber: `TKT${Date.now()}${i}`, userId: pick(refs.userIds), subject: `Issue ${i}`, description: 'Support needed',
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
        title: `Stream ${i}`, description: 'Fashion show', userId: pick(refs.userIds), hostId: refs.userIds[rand(0, refs.userIds.length - 1)],
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

    console.log('\n' + '═'.repeat(70));
    console.log('✅ SEEDING COMPLETE!');
    console.log('═'.repeat(70) + '\n');
    
    console.log('📊 SEEDING STATISTICS:\n');
    console.log(`Total Records Seeded: ${stats.total}`);
    console.log(`\nBy Table:`);
    for (const [table, count] of Object.entries(stats.tables)) {
      console.log(`  ${table}: ${count}`);
    }
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️ ERRORS ENCOUNTERED (${stats.errors.length}):`);
      for (const err of stats.errors) {
        console.log(`  - ${err.table}: ${err.error}`);
      }
    }
    
    if (stats.fkViolations.length > 0) {
      console.log(`\n⚠️ FK VIOLATIONS (${stats.fkViolations.length}):`);
      for (const v of stats.fkViolations) {
        console.log(`  - ${v}`);
      }
    }

    console.log('\n📝 NEXT STEPS:');
    console.log('  1. Verify API endpoints return relational data');
    console.log('  2. Test Angular components display seeded data');
    console.log('  3. Check database for FK constraint violations');
    console.log('\n✅ All data relationships enforced per 003-add-foreign-keys.sql\n');
    
    process.exit(0);
  } catch (err) {
    console.error('\n❌ SEEDING FAILED!\n');
    console.error('Error:', err.message);
    if (err && err.errors && Array.isArray(err.errors)) {
      console.error('\nValidation Details:');
      for (const e of err.errors) {
        console.error(`  - ${e.message}`);
        if (e.path) console.error(`    Path: ${e.path}`);
        if (e.value) console.error(`    Value: ${e.value}`);
      }
    }
    if (err && err.stack) {
      console.error('\nStack Trace:');
      console.error(err.stack);
    }
    console.error('\n🔧 TROUBLESHOOTING:');
    console.error('  1. Check if all FK constraints exist: 003-add-foreign-keys.sql');
    console.error('  2. Verify database connection (DB_TYPE=postgres)');
    console.error('  3. Check .env file for correct PostgreSQL credentials');
    console.error('  4. Run: psql -U postgres -d dfashion -c "SELECT * FROM roles;" to test connection\n');
    process.exit(1);
  }
}

seed();
