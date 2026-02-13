
# 🌱 PostgreSQL Database Seeding System (Fresh Build)

## Overview

This is a **completely refactored PostgreSQL seeding system** built from scratch based on:
- ✅ Current Sequelize PostgreSQL models in `/backend/models_sql/`
- ✅ Actual project requirements and data structures
- ✅ Foreign key constraints and associations
- ✅ Proper dependency execution order

## 📊 Seeding Architecture

### Phase-Based Execution (5 Phases)

The system uses a **5-phase dependency-driven approach** to seed all 54 PostgreSQL tables:

```
Phase 1: 24 Root Models  → No dependencies
         ↓
Phase 2:  4 Tier 1       → Depend on Phase 1
         ↓
Phase 3:  2 Tier 2       → Depend on Phase 1 & 2
         ↓
Phase 4: 13 Tier 3       → Depend on Phase 1, 2, 3
         ↓
Phase 5:  4 Tier 4       → Depend on previous phases + Order
```

### Model Dependency Map

**Phase 1 - Root Models (24)**
- Role, Permission, Department, Category, Brand, Warehouse, Supplier, Courier
- Module, FeatureFlag, Analytics, Coupon, Page, Upload, FAQ
- Promotion, Campaign, FlashSale, Banner, StyleInspiration, SmartCollection
- SearchSuggestion, TrendingSearch, QuickAction

**Phase 2 - Tier 1 (4)**
- User ← (Role, Department)
- SubCategory ← (Category)
- ShippingCharge ← (Courier)
- RolePermission ← (Role, Permission)

**Phase 3 - Tier 2 (2)**
- Product ← (Brand, Category, User/Seller)
- Inventory ← (Product, Warehouse)

**Phase 4 - Tier 3 (13)**
- Cart, Order, Wishlist, Session, UserBehavior, Post, Transaction
- Notification, AuditLog, Story, ProductComment, SearchHistory, Reward

**Phase 5 - Tier 4 (4)**
- Payment ← (Order)
- Shipment ← (Order, Courier)
- Return ← (Order, User)
- SellerCommission ← (Order, User)

## 🚀 Usage

### Run Complete Seeding (Recommended)

```bash
cd d:\NikunjShah\Fashion\DFashionbackend\backend\dbseeder\scripts\postgres

# Run master seeder (executes all phases in order)
node master.seeder.js
```

### Run Individual Phase

```bash
# Phase 1 - Root models
node 01-role.seeder.js
node 02-permission.seeder.js
node 03-department.seeder.js
# ... continue with other phase 1 models

# Phase 2 - Tier 1
node 25-user.seeder.js
node 26-subcategory.seeder.js
# ... etc
```

### Run Single Seeder

```bash
node 29-product.seeder.js
```

## 📋 File Structure

```
/backend/dbseeder/scripts/postgres/
├── master.seeder.js                    # 🎯 Main orchestrator
├── 01-role.seeder.js                   # Phase 1
├── 02-permission.seeder.js
├── 03-department.seeder.js
├── ...
├── 25-user.seeder.js                   # Phase 2
├── 26-subcategory.seeder.js
├── 27-shippingcharge.seeder.js
├── 28-rolepermission.seeder.js
├── 29-product.seeder.js                # Phase 3
├── 30-inventory.seeder.js
├── 31-cart.seeder.js                   # Phase 4
├── 32-order.seeder.js
├── ...
├── 38-payment.seeder.js                # Phase 5
├── 39-shipment.seeder.js
├── 40-return.seeder.js
├── 47-sellercommission.seeder.js
├── uuidHelper.js                       # Utility
└── SEEDING_README.md                   # 📖 This file
```

## ✨ Key Features

### ✅ Idempotent Design
- All seeders check if data already exists before inserting
- Safe to run multiple times without duplicates
- No data loss on re-runs

### ✅ Proper FK Relationships
- Parent data inserted before child data
- All foreign keys respected
- No orphaned records

### ✅ Dynamic ID Fetching
- Seeders fetch inserted IDs dynamically
- No hardcoded UUIDs
- Proper linking of related tables

### ✅ Async/Await Throughout
- Proper Promise handling
- Transaction support where needed
- Error handling and rollbacks

### ✅ Comprehensive Logging
- Meaningful success/failure messages
- Phase-level summaries
- Execution time tracking
- Clear error reporting

## 🔑 Sample Data Seeded

### Users
- `superadmin@example.com` / `Admin@123`
- `admin@example.com` / `Admin@123`
- `seller1@example.com` / `Seller@123`
- `customer1@example.com` / `Customer@123`
- `customer2@example.com` / `Customer@123`

### Products
- 12+ sample products with various brands and categories
- Realistic pricing with discounts
- Stock levels and ratings

### Orders
- Sample orders for each customer
- Various statuses (pending, confirmed, shipped, delivered)
- Payment information included

### Other Data
- 6 roles with permissions
- 10+ categories with subcategories
- 15+ brands
- 4 warehouses
- 5 couriers
- 10+ coupons and promotions
- And much more...

## 🔧 Configuration

### Environment Variables
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dfashion
DB_USER=postgres
DB_PASSWORD=password
DB_TYPE=postgres
```

### Database Requirements
- PostgreSQL 12+
- Sequelize ORM
- Node.js 14+

## 📝 Adding New Seeders

### Template for New Seeder

```javascript
/**
 * 🌱 ModelName Seeder (Phase X - Tier Y)
 * Depends on: DependencyModels
 */

const models = require('../../../models_sql');

async function seedModelNames() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting ModelName seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const ModelName = models._raw?.ModelName || models.ModelName;
    const DependencyModel = models._raw?.DependencyModel || models.DependencyModel;

    if (!ModelName || !ModelName.create) throw new Error('ModelName model not available');

    // Get dependencies
    const dependencies = await DependencyModel.findAll();
    if (dependencies.length === 0) throw new Error('Dependencies not found');

    let createdCount = 0;

    for (const data of dataArray) {
      const existing = await ModelName.findOne({
        where: { uniqueField: data.uniqueField }
      });

      if (existing) {
        console.log(`✅ Record already exists (skipping)`);
        continue;
      }

      await ModelName.create(data);
      console.log(`✅ Created: ${data.name}`);
      createdCount++;
    }

    console.log(`✨ Seeding completed (${createdCount} new records)\n`);
    return true;
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedModelNames };
```

### Steps to Add New Seeder

1. Create file following naming: `XX-modelname.seeder.js`
2. Use appropriate phase number based on dependencies
3. Follow the template above
4. Add to `master.seeder.js` in correct phase
5. Test individually: `node XX-modelname.seeder.js`
6. Run full master: `node master.seeder.js`

##  🐛 Troubleshooting

### Error: "Model not available"
- Ensure all dependencies were seeded first
- Check Phase order in master.seeder.js
- Verify model exists in `/backend/models_sql/`

### Error: "Foreign key constraint failed"
- Check dependency order
- Ensure parent data is seeded
- Verify IDs match between parent and child

### Error: "Duplicate key value"
- Data already exists (safe - seeders skip existing records)
- Use fresh database for clean seed
- Or manually clear tables before re-seeding

### Slow Performance
- First run is typically slower (table creation)
- Subsequent runs faster (checking existing records)
- Add indexes as needed for your queries

## 📊 Seeding Report Format

```
═══════════════════════════════════════════════════════════
🌱 STARTING POSTGRESQL DATABASE SEEDING (FRESH BUILD)
═══════════════════════════════════════════════════════════

📋 Connecting to PostgreSQL...
✅ Connected to PostgreSQL

📋 Reinitializing models with active connection...
✅ Models reinitialized

════════════════════════════════════════════════════════════
PHASE 1: ROOT MODELS (No Dependencies)
════════════════════════════════════════════════════════════

✅ Created role: Super Administrator
✅ Created role: Administrator
...

Phase 1 Summary: 24 succeeded, 0 failed

════════════════════════════════════════════════════════════
PHASE 2: TIER 1 (Depend on Root Models)
════════════════════════════════════════════════════════════

✅ Created user: superadmin@example.com
...

Phase 2 Summary: 4 succeeded, 0 failed

... (Phases 3-5)

════════════════════════════════════════════════════════════
🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY! 🎉
════════════════════════════════════════════════════════════
Total seeders executed: 47
Total duration: 25 seconds
════════════════════════════════════════════════════════════
```

## 🔒 Security Notes

- ✅ Passwords are hashed using bcrypt (12 rounds)
- ✅ Sample credentials should be changed in production
- ✅ Environment variables should use `.env` file
- ✅ Database backups recommended before seeding

## 📚 Related Documentation

- **Models:** `/backend/models_sql/index.js`
- **Database Config:** `/backend/config/postgres.js`
- **Environment:** `.env` file in project root

## 🎯 Success Criteria

Your seeding is successful when:

✅ All 5 phases complete without errors
✅ All tables populated with sample data
✅ No foreign key constraint violations
✅ Sample users can login
✅ Products visible in database
✅ Orders and payments linked correctly
✅ Inventory levels set properly

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review individual seeder files for specific logic
3. Check PostgreSQL error logs
4. Verify Node.js version is 14+
5. Ensure all dependencies installed: `npm install`

---

**Last Updated:** February 12, 2026
**Seeding Format:** PostgreSQL Sequelize
**Total Models:** 54
**Total Seeders:** 47+
**Status:** ✅ Production Ready
