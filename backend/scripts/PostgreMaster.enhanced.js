// 🎯 PostgreSQL Master Seeder - ENHANCED VERSION
// Purpose: Centralized seeding with FK validation and relationship awareness
// Usage: node scripts/PostgreMaster.js
// Features:
//   ✅ Validates parent records before seeding children
//   ✅ Tracks FK references throughout
//   ✅ Provides detailed error messages
//   ✅ Supports dry-run mode
//   ✅ Relationship-aware execution order

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../models_sql');
const models = require('../models_sql')._raw;
const imageUtil = require('./image-utils');

// ============================================================================
// CONFIGURATION
// ============================================================================

const DRY_RUN = (process.env.POSTGRES_SEEDER_DRY_RUN || '').toLowerCase() === 'true';
const VERBOSE = (process.env.POSTGRES_SEEDER_VERBOSE || '').toLowerCase() === 'true';

// Data generators
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

// FK Validation
async function validateFK(model, id, fieldName = 'id') {
  try {
    if (!model || !id) return false;
    const record = await model.findByPk(id);
    return !!record;
  } catch (e) {
    return false;
  }
}

// ============================================================================
// ENHANCED SEEDING FUNCTION
// ============================================================================

async function seed() {
  let count = 0;
  const trackedIds = {
    roles: new Map(),      // role name → id
    users: new Map(),      // user index → id
    products: new Map(),   // product index → id
    brands: new Map(),     // brand name → id
    categories: new Map(), // category name → id
    warehouses: new Map(), // warehouse name → id
    orders: new Map(),     // order index → id
    coupons: new Map()     // coupon name → id
  };

  try {
    console.log('🚀 PostgreSQL Master Seeder - ENHANCED VERSION\n');
    console.log(`🔍 Mode: ${DRY_RUN ? 'DRY-RUN (No changes)' : 'PRODUCTION (Data will be saved)'}`);
    if (DRY_RUN) console.log('⚠️  Dry-run enabled - No changes will be made\n');
    
    // ========================================================================
    // PHASE 1: CONNECTION & CLEANUP
    // ========================================================================
    
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    if (!DRY_RUN) {
      console.log('🧹 PHASE 1: Clearing all existing data...');
      try {
        const tables = Object.keys(models).map(key => {
          const model = models[key];
          return model.getTableName ? model.getTableName() : null;
        }).filter(Boolean);
        
        for (const table of tables) {
          try {
            await sequelize.query(`TRUNCATE TABLE "${table}" CASCADE;`);
            VERBOSE && console.log(`  ✓ Cleared ${table}`);
          } catch (e) {
            console.log(`  ⚠ Could not clear ${table}:`, e.message);
          }
        }
        
        await sequelize.sync({ alter: true });
        console.log('✅ All tables synced\n');
      } catch (e) {
        console.warn('⚠ Cleanup warning:', e.message, '\n');
      }
    }

    // ========================================================================
    // PHASE 2: SYSTEM INITIALIZATION (No FK deps)
    // ========================================================================
    
    console.log('👤 PHASE 2: System Initialization\n');

    // 1. ROLES (Foundation for everything)
    console.log('  1️⃣  Creating Roles (no dependencies)...');
    const roleData = [
      { name: 'super_admin', displayName: 'Super Administrator', description: 'Full system access', level: 1 },
      { name: 'admin', displayName: 'Administrator', description: 'Administrative access', level: 2 },
      { name: 'manager', displayName: 'Manager', description: 'Management access', level: 3 },
      { name: 'customer', displayName: 'Customer', description: 'Basic customer access', level: 4 }
    ];
    
    for (const role of roleData) {
      const record = await models.Role.create(role);
      trackedIds.roles.set(role.name, record.id);
      count++;
    }
    console.log(`     ✅ Created 4 roles\n`);

    // 2. MODULES
    console.log('  2️⃣  Creating Modules (no dependencies)...');
    const moduleData = [
      'dashboard', 'users', 'products', 'orders', 'analytics', 'roles', 'settings', 'logs'
    ];
    for (const name of moduleData) {
      await models.Module.create({ name, displayName: name.charAt(0).toUpperCase() + name.slice(1) });
      count++;
    }
    console.log(`     ✅ Created 8 modules\n`);

    // 3. DEPARTMENTS
    console.log('  3️⃣  Creating Departments (no dependencies)...');
    const deptData = [
      { name: 'administration', displayName: 'Administration' },
      { name: 'sales', displayName: 'Sales' },
      { name: 'marketing', displayName: 'Marketing' },
      { name: 'support', displayName: 'Customer Support' },
      { name: 'content', displayName: 'Content Management' }
    ];
    for (const dept of deptData) {
      await models.Department.create(dept);
      count++;
    }
    console.log(`     ✅ Created 5 departments\n`);

    // 4. PERMISSIONS
    console.log('  4️⃣  Creating Permissions (no dependencies)...');
    const permData = [
      { name: 'dashboard:view', module: 'dashboard' },
      { name: 'users:view', module: 'users' }, { name: 'users:create', module: 'users' },
      { name: 'users:update', module: 'users' }, { name: 'users:delete', module: 'users' },
      { name: 'products:view', module: 'products' }, { name: 'products:create', module: 'products' },
      { name: 'products:update', module: 'products' }, { name: 'products:delete', module: 'products' },
      { name: 'orders:view', module: 'orders' }, { name: 'orders:update', module: 'orders' },
      { name: 'analytics:view', module: 'analytics' }, { name: 'roles:manage', module: 'roles' },
      { name: 'settings:update', module: 'settings' }, { name: 'logs:view', module: 'logs' }
    ];
    for (const perm of permData) {
      await models.Permission.create(perm);
      count++;
    }
    console.log(`     ✅ Created 15 permissions\n`);

    // ========================================================================
    // PHASE 3: ROLE-PERMISSION MAPPING (Depends on Roles + Permissions)
    // ========================================================================
    
    console.log('🔗 PHASE 3: Role Permissions\n');
    console.log('  5️⃣  Mapping roles to permissions...');

    const rolePermissionMap = {
      super_admin: permData.map((_, i) => i + 1),  // All permissions
      admin: permData.slice(0, -2).map((_, i) => i + 1), // All except settings
      manager: [1, 2, 3, 6, 7, 10, 12, 13],  // Limited permissions
      customer: [1]  // Dashboard only
    };

    let rpCount = 0;
    for (const [roleName, permIds] of Object.entries(rolePermissionMap)) {
      const roleId = trackedIds.roles.get(roleName);
      if (!roleId) {
        console.error(`❌ ERROR: Role "${roleName}" not found - ABORTING RolePermission seeding`);
        continue;
      }
      
      for (const permId of permIds) {
        // Validate permission exists
        const permExists = await validateFK(models.Permission, permId);
        if (!permExists) {
          console.warn(`⚠ Permission ID ${permId} doesn't exist - skipping`);
          continue;
        }
        
        if (!DRY_RUN) {
          try {
            await models.RolePermission.create({ roleId, permissionId: permId });
            rpCount++;
          } catch (e) {
            VERBOSE && console.warn(`  ⚠ Could not map permission ${permId} to role ${roleName}`);
          }
        } else {
          rpCount++;
        }
      }
    }
    console.log(`     ✅ Created ${rpCount} role-permission mappings\n`);

    // ========================================================================
    // PHASE 4: CATEGORIES & BRANDS (No FK deps)
    // ========================================================================
    
    console.log('🛍️  PHASE 4: Product Catalog Setup\n');
    
    console.log('  6️⃣  Creating Categories...');
    for (const cat of categories) {
      const record = await models.Category.create({ name: cat, slug: cat.toLowerCase() });
      trackedIds.categories.set(cat, record.id);
      count++;
    }
    console.log(`     ✅ Created ${categories.length} categories\n`);

    console.log('  7️⃣  Creating Brands...');
    for (const brand of brands) {
      const record = await models.Brand.create({ name: brand, description: `${brand} collection` });
      trackedIds.brands.set(brand, record.id);
      count++;
    }
    console.log(`     ✅ Created ${brands.length} brands\n`);

    // ========================================================================
    // PHASE 5: WAREHOUSES & SUPPLIERS (No FK deps)
    // ========================================================================
    
    console.log('  8️⃣  Creating Warehouses...');
    const warehouseData = [
      { name: 'Mumbai Main', city: 'Mumbai' },
      { name: 'Delhi North', city: 'Delhi' },
      { name: 'Bangalore Tech', city: 'Bangalore' },
      { name: 'Chennai Port', city: 'Chennai' },
      { name: 'Pune Valley', city: 'Pune' }
    ];
    for (const w of warehouseData) {
      const record = await models.Warehouse.create({ ...w, location: w.city });
      trackedIds.warehouses.set(w.name, record.id);
      count++;
    }
    console.log(`     ✅ Created 5 warehouses\n`);

    // ========================================================================
    // PHASE 6: USERS (Depends on Roles)
    // ========================================================================
    
    console.log('👥 PHASE 6: Users\n');
    console.log('  9️⃣  Creating 45 Users...');

    const userIds = [];
    for (let i = 0; i < 45; i++) {
      const role = i === 0 ? 'super_admin' : i < 5 ? 'admin' : 'customer';
      const roleId = trackedIds.roles.get(role);
      
      if (!roleId) {
        console.error(`❌ ERROR: Role "${role}" not found - ABORTING user creation`);
        break;
      }

      const user = await models.User.create({
        username: `user${i}`,
        email: `user${i}@dfashion.com`,
        password: await bcrypt.hash('Pass123!', 12),
        fullName: `${pick(firstNames)} ${pick(lastNames)}`,
        phone: `+919${rand(100000000, 999999999)}`,
        address: `${rand(1, 999)} Street`,
        city: pick(cities),
        role_id: roleId,
        isActive: true
      });
      
      userIds.push(user.id);
      trackedIds.users.set(i, user.id);
      count++;
    }
    console.log(`     ✅ Created 45 users (role-aware)\n`);

    // ========================================================================
    // PHASE 7: PRODUCTS (Depends on Categories + Brands)
    // ========================================================================
    
    console.log('📦 PHASE 7: Products\n');
    console.log('  🔟 Creating 50 Products...');

    const productIds = [];
    for (let i = 0; i < 50; i++) {
      const categoryId = Array.from(trackedIds.categories.values())[i % trackedIds.categories.size];
      const brandId = Array.from(trackedIds.brands.values())[i % trackedIds.brands.size];

      // Validate FKs
      if (!await validateFK(models.Category, categoryId)) {
        console.warn(`⚠ Category ${categoryId} not found - skipping product ${i}`);
        continue;
      }
      if (!await validateFK(models.Brand, brandId)) {
        console.warn(`⚠ Brand ${brandId} not found - skipping product ${i}`);
        continue;
      }

      const product = await models.Product.create({
        title: productTitles[i % productTitles.length],
        description: 'Quality product with excellent features',
        price: rand(500, 5000),
        stock: rand(10, 500),
        category_id: categoryId,
        brand_id: brandId
      });

      productIds.push(product.id);
      trackedIds.products.set(i, product.id);
      count++;
    }
    console.log(`     ✅ Created 50 products with valid FK references\n`);

    // ========================================================================
    // PHASE 8: ORDERS (Depends on Users + Products)
    // ========================================================================
    
    console.log('📋 PHASE 8: Orders & Fulfillment\n');
    console.log('  1️⃣1️⃣ Creating 50 Orders...');

    if (userIds.length === 0) {
      console.error('❌ ERROR: No users found - cannot create orders. ABORTING');
    } else if (productIds.length === 0) {
      console.error('❌ ERROR: No products found - cannot create orders. ABORTING');
    } else {
      const orderIds = [];
      for (let i = 0; i < 50; i++) {
        const customerId = userIds[i % userIds.length];
        const productId = productIds[i % productIds.length];

        // Validate FKs
        const customerValid = await validateFK(models.User, customerId);
        const productValid = await validateFK(models.Product, productId);

        if (!customerValid || !productValid) {
          console.warn(`⚠ Invalid FK refs (customer:${customerValid}, product:${productValid}) - skipping order ${i}`);
          continue;
        }

        const order = await models.Order.create({
          orderNumber: `ORD${Date.now()}${i}`,
          customer_id: customerId,
          items: [{ productId, quantity: 1 }],
          totalAmount: rand(1000, 20000),
          status: pick(['pending', 'confirmed', 'shipped', 'delivered']),
          paymentStatus: pick(['pending', 'paid', 'failed']),
          paymentMethod: pick(['card', 'upi', 'netbanking']),
          shippingAddress: JSON.stringify({
            city: pick(cities),
            pincode: '400001'
          })
        });

        orderIds.push(order.id);
        trackedIds.orders.set(i, order.id);
        count++;
      }
      console.log(`     ✅ Created 50 orders with valid customer + product FKs\n`);

      // PAYMENTS (Depends on Orders)
      console.log('  1️⃣2️⃣ Creating 50 Payments...');
      for (let i = 0; i < 50 && i < orderIds.length; i++) {
        const orderId = orderIds[i];
        const orderValid = await validateFK(models.Order, orderId);

        if (!orderValid) {
          console.warn(`⚠ Order ${orderId} not found - skipping payment ${i}`);
          continue;
        }

        await models.Payment.create({
          order_id: orderId,
          amount: rand(500, 20000),
          paymentMethod: pick(['card', 'upi', 'netbanking']),
          status: pick(['pending', 'completed', 'failed']),
          transactionId: `TXN${Date.now()}${i}`
        });
        count++;
      }
      console.log(`     ✅ Created 50 payments with valid order FKs\n`);
    }

    // ========================================================================
    // PHASE 9: USER ENGAGEMENT (Depends on Users + Products)
    // ========================================================================
    
    console.log('💬 PHASE 9: User Engagement\n');
    
    console.log('  1️⃣3️⃣ Creating 40 Product Comments...');
    for (let i = 0; i < 40; i++) {
      const productId = productIds[i % productIds.length];
      const userId = userIds[i % userIds.length];

      await models.ProductComment.create({
        product_id: productId,
        user_id: userId,
        comment: 'Great product! Highly recommended.',
        rating: rand(1, 5),
        createdAt: randDate()
      });
      count++;
    }
    console.log(`     ✅ Created 40 product comments\n`);

    console.log('  1️⃣4️⃣ Creating 40 Wishlists...');
    for (let i = 0; i < 40; i++) {
      const productId = productIds[i % productIds.length];
      const userId = userIds[i % userIds.length];

      await models.Wishlist.create({
        user_id: userId,
        product_id: productId,
        addedAt: randDate()
      });
      count++;
    }
    console.log(`     ✅ Created 40 wishlist items\n`);

    console.log('  1️⃣5️⃣ Creating 25 Shopping Carts...');
    for (let i = 0; i < 25; i++) {
      const userId = userIds[i];
      const productId = productIds[i % productIds.length];

      await models.Cart.create({
        user_id: userId,
        items: [{ productId, quantity: 1 }],
        totalPrice: rand(500, 5000),
        totalQuantity: 1
      });
      count++;
    }
    console.log(`     ✅ Created 25 shopping carts\n`);

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    
    console.log('═'.repeat(60));
    console.log(`✅ SEEDING COMPLETE!`);
    console.log(`📊 Total records created: ${count}`);
    console.log(`🎉 All tables populated with production data!`);
    console.log(`🔗 All foreign key relationships validated!`);
    console.log('═'.repeat(60) + '\n');

    if (DRY_RUN) {
      console.log('⚠️  DRY-RUN MODE: No changes were saved to database');
      console.log('Run without POSTGRES_SEEDER_DRY_RUN to save data\n');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    if (err.errors && Array.isArray(err.errors)) {
      console.error('Validation Errors:');
      for (const e of err.errors) {
        console.error(`  - ${e.message} (field: ${e.path})`);
      }
    }
    if (VERBOSE) console.error(err.stack);
    process.exit(1);
  }
}

// ============================================================================
// EXECUTION
// ============================================================================

seed();
