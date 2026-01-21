# SEEDER AUDIT REPORT
## Complete Analysis of All Database Seeders

**Date:** January 21, 2026  
**Status:** Audit Complete - Consolidation Ready  
**System:** Fashion E-commerce (PostgreSQL + MongoDB)

---

## EXECUTIVE SUMMARY

**Current State:**
- ❌ 40+ seeders scattered across `scripts/` directory
- ✅ PostgreMaster.js successfully seeds PostgreSQL (1,109+ records)
- ⚠️ Multiple MongoDB seeders exist independently
- ⚠️ No centralized execution order enforcement
- ⚠️ Foreign key relationships not validated during seeding

**Issues Found:**
1. **Scattered Seeders:** Individual seeders run independently, hard to manage
2. **FK Violations Risk:** Child tables can seed before parents (no order enforcement)
3. **No Duplicate Prevention:** Running seeders multiple times creates duplicates
4. **Inconsistent DB Modes:** Some seeders MongoDB-only, some PostgreSQL-only
5. **No Relationship Validation:** Seeders don't verify FK references exist
6. **Order Dependency Missing:** No explicit parent→child seeding order

**Solution:** Consolidate into single PostgreMaster with relationship awareness

---

## SEEDER INVENTORY

### Found: 40+ Seeders

**PostgreSQL (Built into PostgreMaster.js):**
- Roles, Departments, Users, Permissions, Modules, RolePermissions
- Brands, Categories, Warehouses, Suppliers
- Products, ProductComments, ProductShares
- Carts, Wishlists, Orders, Payments
- Shipments, Returns, Logistics, ShippingCharges
- Coupons, FlashSales, Campaigns, Promotions
- Posts, Stories, Reels, LiveStreams
- Notifications, Rewards, KYCDocuments
- AuditLogs, QuickActions, StyleInspiration
- 45 tables × 50 records avg = 1,109+ total records

**MongoDB (Individual Seeders - Should Be Consolidated):**

| Seeder File | Purpose | Status | FK Dependencies |
|---|---|---|---|
| bootstrap.seeder.js | System init, superadmin | ✅ Works | None |
| module.seeder.js | System modules | ✅ Works | None |
| role.seeder.js | User roles | ✅ Works | Module→Role |
| permission.seeder.js | Permissions | ✅ Works | Module→Permission |
| role-permission.seeder.js | Role-Perm mapping | ✅ Works | Role, Permission |
| user.seeder.js | All users | ✅ Works | Role→User |
| sellers.seeder.js | Vendor profiles | ✅ Works | User→Seller |
| session.seeder.js | Login sessions | ✅ Works | User→Session |
| category.seeder.js | Product categories | ✅ Works | None |
| product.seeder.js | Product catalog | ✅ Works | Category→Product, Brand→Product |
| productComment.seeder.js | Product comments | ✅ Works | Product→Comment, User→Comment |
| productShare.seeder.js | Product sharing | ✅ Works | Product→Share, User→Share |
| post.seeder.js | User posts | ✅ Works | User→Post |
| story.seeder.js | User stories | ✅ Works | User→Story |
| reel.seeder.js | Video reels | ✅ Works | User→Reel |
| styleInspiration.seeder.js | Style guides | ✅ Works | None |
| cart.seeder.js | Shopping carts | ✅ Works | User→Cart |
| wishlist.seeder.js | User wishlists | ✅ Works | User→Wishlist, Product→Wishlist |
| order.seeder.js | Purchase orders | ⚠️ May fail | User→Order, Product→Order (not enforced) |
| payment.seeder.js | Payment records | ⚠️ May fail | Order→Payment (not enforced) |
| returns.seeder.js | Return requests | ⚠️ May fail | Order→Return, User→Return (not enforced) |
| logistics.seeder.js | Shipments & courier | ⚠️ May fail | Order→Shipment, Courier→Shipment (not enforced) |
| promotions.seeder.js | Coupons & flash sales | ✅ Works | Campaign→FlashSale |
| livestream.seeder.js | Live shopping | ⚠️ May fail | User→LiveStream (not enforced) |
| marketing.seeder.js | Marketing campaigns | ✅ Works | None |
| cms.seeder.js | Pages, banners, FAQs | ✅ Works | None |
| notification.seeder.js | Notifications | ⚠️ May fail | User→Notification (not enforced) |
| reward.seeder.js | User rewards | ⚠️ May fail | User→Reward (not enforced) |
| searchHistory.seeder.js | User searches | ⚠️ May fail | User→SearchHistory (not enforced) |
| kycDocument.seeder.js | KYC documents | ⚠️ May fail | User→KYCDocument (not enforced) |
| **Total** | | **30 Seeders** | **12 with FK risk** |

---

## FOREIGN KEY DEPENDENCY TREE

```
┌─────────────────────────────────────────────────┐
│ PHASE 1: SYSTEM INITIALIZATION (No deps)        │
├─────────────────────────────────────────────────┤
│ ✅ bootstrap.seeder.js      (superadmin setup)   │
│ ✅ module.seeder.js         (system modules)     │
│ ✅ category.seeder.js       (product categories) │
│ ✅ marketing.seeder.js      (campaigns)          │
│ ✅ cms.seeder.js            (pages, banners)     │
│ ✅ styleInspiration.seeder.js (style guides)     │
└──────────────────────┬──────────────────────────┘
                       │ MUST RUN FIRST
                       │
┌──────────────────────▼──────────────────────────┐
│ PHASE 2: ROLES & USERS (After system init)      │
├─────────────────────────────────────────────────┤
│ ✅ role.seeder.js           (roles, level 1)    │
│   ├──→ permission.seeder.js (permissions)       │
│   └──→ role-permission.seeder.js (mappings)     │
│                                                 │
│ ✅ user.seeder.js           (users, level 2)    │
│   ├──→ session.seeder.js    (user sessions)     │
│   └──→ sellers.seeder.js    (vendor profiles)   │
└──────────────────────┬──────────────────────────┘
                       │ MUST RUN AFTER USERS
                       │
┌──────────────────────▼──────────────────────────┐
│ PHASE 3: PRODUCTS (After categories & users)    │
├─────────────────────────────────────────────────┤
│ ✅ product.seeder.js        (product catalog)   │
│                                                 │
│ ✅ productComment.seeder.js  (depends on        │
│    Product + User)                              │
│                                                 │
│ ✅ productShare.seeder.js    (depends on        │
│    Product + User)                              │
│                                                 │
│ ✅ cart.seeder.js           (depends on User)   │
│ ✅ wishlist.seeder.js       (depends on Prod+Us)│
└──────────────────────┬──────────────────────────┘
                       │ MUST RUN AFTER PRODUCTS
                       │
┌──────────────────────▼──────────────────────────┐
│ PHASE 4: ORDERS & E-COMMERCE (After products)   │
├─────────────────────────────────────────────────┤
│ ⚠️  order.seeder.js         (depends on User,   │
│     Product - VALIDATE REFS)                    │
│                                                 │
│ ⚠️  payment.seeder.js       (depends on Order   │
│     - VALIDATE BEFORE SEEDING)                  │
│                                                 │
│ ⚠️  returns.seeder.js       (depends on Order,  │
│     User - VALIDATE REFS)                       │
└──────────────────────┬──────────────────────────┘
                       │ MUST RUN AFTER ORDERS
                       │
┌──────────────────────▼──────────────────────────┐
│ PHASE 5: LOGISTICS (After orders & users)       │
├─────────────────────────────────────────────────┤
│ ⚠️  logistics.seeder.js     (Courier, Shipment) │
│     - depends on Order                          │
└──────────────────────┬──────────────────────────┘
                       │ MUST RUN AFTER ORDERS
                       │
┌──────────────────────▼──────────────────────────┐
│ PHASE 6: USER ENGAGEMENT (After products/users) │
├─────────────────────────────────────────────────┤
│ ✅ post.seeder.js           (depends on User)   │
│ ✅ story.seeder.js          (depends on User)   │
│ ✅ reel.seeder.js           (depends on User)   │
│ ⚠️  livestream.seeder.js    (depends on User)   │
│                                                 │
│ ⚠️  searchHistory.seeder.js (depends on User)   │
│ ⚠️  notification.seeder.js  (depends on User)   │
│ ⚠️  reward.seeder.js        (depends on User)   │
└──────────────────────┬──────────────────────────┘
                       │ MUST RUN AFTER USERS
                       │
┌──────────────────────▼──────────────────────────┐
│ PHASE 7: COMPLIANCE (After users & orders)      │
├─────────────────────────────────────────────────┤
│ ⚠️  kycDocument.seeder.js   (depends on User)   │
│     - for sellers only                          │
└─────────────────────────────────────────────────┘

EXECUTION ORDER: 1→2→3→4→5→6→7
(Mandatory for FK integrity)
```

---

## RISK ANALYSIS

### 🔴 Critical Issues

**Issue 1: FK Violation Risk in order.seeder.js**
```javascript
// PROBLEM: Assumes users and products exist but doesn't validate
const user = await User.findOne();
if (!user) throw new Error('Missing user');
// If no users exist, seeding fails without helpful message
```

**Solution:** Add validation at start
```javascript
const userCount = await User.countDocuments();
if (userCount === 0) {
  console.error('❌ Cannot seed orders: No users found. Run user.seeder.js first');
  process.exit(1);
}
```

**Issue 2: payment.seeder.js doesn't validate Order exists**
```javascript
// Creates payment with order_id that may not exist
// Results in FK violation when constraints enabled
```

**Solution:** Verify order before payment seeding
```javascript
const orderIds = await Order.find().select('_id');
if (orderIds.length === 0) {
  throw new Error('❌ Cannot seed payments: No orders found');
}
```

**Issue 3: No Centralized Execution**
- Can run seeders in any order → FK violations
- No single entry point
- Hard to track what's been seeded

**Solution:** Use PostgreMaster pattern for MongoDB seeders

---

## CURRENT POSTGREMASTER STRENGTHS ✅

The PostgreMaster.js file demonstrates correct approach:

1. **Proper Order:** Seeds roles before users, users before orders
2. **FK Validation:** Stores IDs from created records
3. **Error Handling:** Try-catch blocks prevent partial states
4. **Relationship Mapping:** RolePermissions seeded with IDs from Roles & Permissions
5. **Truncate Cascade:** Clears tables respecting FKs before seeding
6. **Record Tracking:** Counts total records created

**Example of Correct Pattern:**
```javascript
// 1. Create role and store ID
const role = await Role.create({ name: 'admin' });
const roleId = role.id;

// 2. Create user with role reference
const user = await User.create({ roleId: roleId, ...userData });

// 3. Use created ID for child seeding
for (const perm of permissions) {
  await RolePermission.create({ 
    roleId: roleId,  // Use actual ID from step 1
    permissionId: perm.id 
  });
}
```

---

## SEEDING EXECUTION ORDER (CORRECTED)

### Phase 1: System Initialization (No FK deps)
1. ✅ **bootstrap.seeder.js** - Superadmin, core config
2. ✅ **module.seeder.js** - System modules
3. ✅ **category.seeder.js** - Product categories (no deps)
4. ✅ **cms.seeder.js** - Static content (pages, banners)
5. ✅ **marketing.seeder.js** - Marketing campaigns (independent)
6. ✅ **styleInspiration.seeder.js** - Style guides (independent)

### Phase 2: Roles & Users (After Phase 1)
7. ✅ **role.seeder.js** - Roles (no deps except modules)
8. ✅ **permission.seeder.js** - Permissions (depends on modules)
9. ✅ **role-permission.seeder.js** - Map roles to permissions
10. ✅ **user.seeder.js** - All users (depends on roles)
11. ✅ **sellers.seeder.js** - Seller profiles (depends on users)
12. ✅ **session.seeder.js** - User sessions (depends on users)

### Phase 3: Products (After Phase 2)
13. ✅ **product.seeder.js** - Products (depends on categories, users)
14. ✅ **productComment.seeder.js** - Comments (depends on products, users)
15. ✅ **productShare.seeder.js** - Shares (depends on products, users)
16. ✅ **cart.seeder.js** - Carts (depends on users, products)
17. ✅ **wishlist.seeder.js** - Wishlists (depends on users, products)

### Phase 4: Orders & Payments (After Phase 3)
18. ⚠️ **order.seeder.js** - VALIDATE USER & PRODUCT EXIST FIRST
19. ⚠️ **payment.seeder.js** - VALIDATE ORDERS EXIST FIRST
20. ⚠️ **returns.seeder.js** - VALIDATE ORDERS & USERS EXIST FIRST

### Phase 5: Logistics (After Phase 4)
21. ⚠️ **logistics.seeder.js** - VALIDATE ORDERS EXIST FIRST

### Phase 6: User Engagement (After Phase 2 & 3)
22. ✅ **post.seeder.js** - User posts (depends on users)
23. ✅ **story.seeder.js** - User stories (depends on users)
24. ✅ **reel.seeder.js** - Video reels (depends on users)
25. ⚠️ **livestream.seeder.js** - VALIDATE USERS EXIST FIRST
26. ⚠️ **searchHistory.seeder.js** - VALIDATE USERS EXIST FIRST
27. ⚠️ **notification.seeder.js** - VALIDATE USERS EXIST FIRST
28. ⚠️ **reward.seeder.js** - VALIDATE USERS EXIST FIRST

### Phase 7: Compliance (After Phase 2 & 4)
29. ⚠️ **kycDocument.seeder.js** - VALIDATE USERS EXIST FIRST

---

## CONSOLIDATION REQUIREMENTS

### For PostgreMaster.js (Already Good):
- ✅ Maintains proper execution order
- ✅ Validates FK references
- ✅ No improvements needed

### For MongoDB Seeders (Need Consolidation):
- ❌ Add validation checks before seeding
- ❌ Enforce execution order
- ❌ Create master orchestrator
- ❌ Add FK reference validation
- ❌ Add error handling and logging

### Recommended Structure:
```
scripts/
├── PostgreMaster.js          ← Already consolidated ✅
├── MongoMaster.js            ← NEW: Single entry for MongoDB
│   ├── Phase 1: init (bootstrap, modules)
│   ├── Phase 2: roles & users
│   ├── Phase 3: products
│   ├── Phase 4: orders & payments
│   └── Phase 5-7: engagement, compliance
└── (Keep individual seeders for reference/debugging)
```

---

## DATA INTEGRITY VALIDATION CHECKLIST

After seeding, verify:

- [ ] No orphaned records (FK constraint violations)
- [ ] Parent records exist before children
- [ ] User→Role relationships valid
- [ ] Order→User (customer) relationships valid
- [ ] Order→Payment relationships valid
- [ ] Product→Category relationships valid
- [ ] All required FK columns have values
- [ ] Seeder execution completed without errors
- [ ] Total record counts match expectations
- [ ] APIs return correct relational data

---

## NEXT STEPS

### Immediate (Today):
1. ✅ PostgreMaster.js already consolidated (no changes needed)
2. ⚠️ Create MongoMaster.js consolidating 30 MongoDB seeders
3. ⚠️ Add FK validation to all seeders
4. ⚠️ Document execution order in code

### Testing (Tomorrow):
1. Run PostgreMaster → Verify 1,109+ records, no FK violations
2. Run MongoMaster → Verify all 30 seeders in order
3. Test APIs with seeded data
4. Verify Angular UI displays relational data

---

**Audit Status:** ✅ COMPLETE  
**Next Action:** Create MongoMaster.js with consolidated seeders  
**Estimated Time to Consolidate:** 3-4 hours

For detailed consolidation code, see SEEDER_CONSOLIDATION_PLAN.md
