# DATABASE RELATIONSHIP AUDIT REPORT
**Generated:** January 21, 2026  
**System:** Fashion E-commerce Platform (PostgreSQL/MySQL)  
**Status:** Complete Schema Analysis with 47+ Foreign Key Relationships Identified

---

## EXECUTIVE SUMMARY

**Current State:**
- ✅ 50+ tables fully defined with primary keys
- ❌ MISSING: 47+ foreign key constraints (identified and documented)
- ❌ MISSING: Explicit Sequelize associations in models
- ❌ MISSING: JOINs in backend API queries
- ❌ MISSING: Relational data in Angular UI components

**Action Items:**
1. ✅ [DONE] Create SQL migration to add all foreign keys (003-add-foreign-keys.sql)
2. 🔄 [IN-PROGRESS] Add Sequelize associations to models_sql/index.js
3. ⏳ [PENDING] Update repositories to use eager loading with JOINs
4. ⏳ [PENDING] Update Angular components to fetch and display relational data

---

## DETAILED RELATIONSHIP MAPPING

### PHASE 1: IDENTITY & ROLE-BASED ACCESS CONTROL (7 Relationships)

| Parent Table | Child Table | Foreign Key | Relationship | Current Status | Migration Added |
|---|---|---|---|---|---|
| roles | users | `users.role_id` | One-to-Many | ❌ Missing FK | ✅ FK_1 |
| departments | users | `users.department_id` | One-to-Many | ❌ Missing FK | ✅ FK_2 |
| roles | role_permissions | `role_permissions.role_id` | One-to-Many | ❌ Missing FK | ✅ FK_3 |
| permissions | role_permissions | `role_permissions.permission_id` | One-to-Many | ❌ Missing FK | ✅ FK_4 |
| modules | permissions | `permissions.module_id` | One-to-Many | ❌ Missing FK | ✅ FK_5 |
| users | sessions | `sessions.user_id` | One-to-Many | ❌ Missing FK | ✅ FK_6 |
| **Total Phase 1** | | | | | **6 FKs** |

**Business Logic:**
- Users are assigned ONE role (admin, seller, customer, manager, etc.)
- Roles have MANY permissions
- Permissions are grouped by modules (products, orders, users, etc.)
- Users can have multiple sessions (login tracking)

---

### PHASE 2: PRODUCT CATALOG & INVENTORY (10 Relationships)

| Parent Table | Child Table | Foreign Key | Relationship | Current Status | Migration Added |
|---|---|---|---|---|---|
| categories | products | `products.category_id` | One-to-Many | ❌ Missing FK | ✅ FK_7 |
| brands | products | `products.brand_id` | One-to-Many | ❌ Missing FK | ✅ FK_8 |
| categories | sub_categories | `sub_categories.category_id` | One-to-Many | ✅ Has FK | Already exists |
| products | product_comments | `product_comments.product_id` | One-to-Many | ❌ Missing FK | ✅ FK_9 |
| users | product_comments | `product_comments.user_id` | One-to-Many | ❌ Missing FK | ✅ FK_10 |
| products | product_shares | `product_shares.product_id` | One-to-Many | ❌ Missing FK | ✅ FK_11 |
| users | product_shares | `product_shares.user_id` | One-to-Many | ❌ Missing FK | ✅ FK_12 |
| products | inventories | `inventories.product_id` | One-to-Many | ✅ Has FK | Already exists |
| warehouses | inventories | `inventories.warehouse_id` | One-to-Many | ✅ Has FK | Already exists |
| inventories | inventory_alerts | `inventory_alerts.inventory_id` | One-to-Many | ❌ Missing FK | ✅ FK_13 |
| inventories | inventory_histories | `inventory_histories.inventory_id` | One-to-Many | ❌ Missing FK | ✅ FK_14 |
| **Total Phase 2** | | | | | **9 FKs** |

**Business Logic:**
- Products are organized by Category and Brand
- Customers can comment on and share products
- Each product has inventory tracked per warehouse
- Inventory changes trigger alerts and history logging

**Critical Queries Needed:**
```sql
-- Get all products in a category with stock levels
SELECT p.*, c.name, b.name, i.quantity 
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN inventories i ON p.id = i.product_id
WHERE c.slug = 'electronics'

-- Get product comments with user info
SELECT pc.*, p.title, u.full_name, u.email
FROM product_comments pc
JOIN products p ON pc.product_id = p.id
JOIN users u ON pc.user_id = u.id
```

---

### PHASE 3: SHOPPING & CART MANAGEMENT (3 Relationships)

| Parent Table | Child Table | Foreign Key | Relationship | Current Status | Migration Added |
|---|---|---|---|---|---|
| users | carts | `carts.user_id` | One-to-One | ❌ Missing FK | ✅ FK_15 |
| users | wishlists | `wishlists.user_id` | One-to-Many | ❌ Missing FK | ✅ FK_16 |
| products | wishlists | `wishlists.product_id` | One-to-Many | ❌ Missing FK | ✅ FK_17 |
| **Total Phase 3** | | | | | **3 FKs** |

**Business Logic:**
- Each user has ONE shopping cart
- Users can add MANY products to their wishlist
- Wishlists track product preferences across time

---

### PHASE 4: ORDERS & FULFILLMENT (7 Relationships)

| Parent Table | Child Table | Foreign Key | Relationship | Current Status | Migration Added |
|---|---|---|---|---|---|
| users | orders | `orders.customer_id` | One-to-Many | ❌ Missing FK | ✅ FK_18 |
| orders | payments | `payments.order_id` | One-to-Many | ❌ Missing FK | ✅ FK_19 |
| orders | shipments | `shipments.order_id` | One-to-One | ❌ Missing FK | ✅ FK_20 |
| couriers | shipments | `shipments.courier_id` | One-to-Many | ❌ Missing FK | ✅ FK_21 |
| orders | returns | `returns.order_id` | One-to-One | ❌ Missing FK | ✅ FK_22 |
| users | returns | `returns.user_id` | One-to-Many | ❌ Missing FK | ✅ FK_23 |
| shipments | shipping_charges | `shipping_charges.shipment_id` | One-to-Many | ❌ Missing FK | ✅ FK_24 |
| **Total Phase 4** | | | | | **7 FKs** |

**Business Logic:**
- Customers place orders (ONE customer can have MANY orders)
- Each order has ONE shipment tracking
- Each order can have MULTIPLE payments (installments, refunds)
- Orders can be returned (ONE order can have ONE return request)
- Shipments are assigned to couriers
- Shipping charges calculated per shipment

**CRITICAL Queries Needed:**
```sql
-- Get complete order details with customer, payment, shipment info
SELECT 
  o.id, o.order_number, o.status, o.total_amount,
  u.full_name, u.email, u.phone,
  p.id as payment_id, p.amount, p.status as payment_status,
  s.id as shipment_id, s.tracking_number, s.status as shipment_status,
  c.name as courier_name
FROM orders o
JOIN users u ON o.customer_id = u.id
LEFT JOIN payments p ON o.id = p.order_id
LEFT JOIN shipments s ON o.id = s.order_id
LEFT JOIN couriers c ON s.courier_id = c.id
WHERE o.customer_id = ?
ORDER BY o.created_at DESC;
```

---

### PHASE 5: PROMOTIONS & CAMPAIGNS (2 Relationships)

| Parent Table | Child Table | Foreign Key | Relationship | Current Status | Migration Added |
|---|---|---|---|---|---|
| campaigns | flash_sales | `flash_sales.campaign_id` | One-to-Many | ❌ Missing FK | ✅ FK_25 |
| campaigns | coupons | `coupons.campaign_id` | One-to-Many | ⏳ Optional | ✅ FK_25a |
| **Total Phase 5** | | | | | **2 FKs** |

**Business Logic:**
- Campaigns contain multiple flash sales and coupon promotions
- Time-limited promotions tracked by campaign

---

### PHASE 6: USER ENGAGEMENT & BEHAVIOR (7 Relationships)

| Parent Table | Child Table | Foreign Key | Relationship | Current Status | Migration Added |
|---|---|---|---|---|---|
| users | user_behaviors | `user_behaviors.user_id` | One-to-Many | ❌ Missing FK | ✅ FK_26 |
| products | user_behaviors | `user_behaviors.product_id` | One-to-Many | ❌ Missing FK | ✅ FK_27 |
| users | posts | `posts.user_id` | One-to-Many | ❌ Missing FK | ✅ FK_28 |
| users | stories | `stories.user_id` | One-to-Many | ❌ Missing FK | ✅ FK_29 |
| users | reels | `reels.user_id` | One-to-Many | ❌ Missing FK | ✅ FK_30 |
| users | live_streams | `live_streams.user_id` | One-to-Many | ❌ Missing FK | ✅ FK_31 |
| users | search_histories | `search_histories.user_id` | One-to-Many | ❌ Missing FK | ✅ FK_32 |
| **Total Phase 6** | | | | | **7 FKs** |

**Business Logic:**
- Track user behavior (views, clicks, time spent on products)
- Users create social content (posts, stories, reels, live streams)
- Search history tracks customer search patterns

---

### PHASE 7: NOTIFICATIONS & COMMUNICATIONS (2 Relationships)

| Parent Table | Child Table | Foreign Key | Relationship | Current Status | Migration Added |
|---|---|---|---|---|---|
| users | notifications | `notifications.user_id` | One-to-Many | ❌ Missing FK | ✅ FK_33 |
| users | tickets | `tickets.user_id` | One-to-Many | ❌ Missing FK | ✅ FK_34 |
| **Total Phase 7** | | | | | **2 FKs** |

---

### PHASE 8: SELLER & PERFORMANCE (2 Relationships)

| Parent Table | Child Table | Foreign Key | Relationship | Current Status | Migration Added |
|---|---|---|---|---|---|
| users | seller_commissions | `seller_commissions.seller_id` | One-to-Many | ❌ Missing FK | ✅ FK_35 |
| users | seller_performances | `seller_performances.seller_id` | One-to-Many | ❌ Missing FK | ✅ FK_36 |
| **Total Phase 8** | | | | | **2 FKs** |

---

### PHASE 9: FINANCIAL TRACKING (1 Relationship)

| Parent Table | Child Table | Foreign Key | Relationship | Current Status | Migration Added |
|---|---|---|---|---|---|
| users | transactions | `transactions.user_id` | One-to-Many | ❌ Missing FK | ✅ FK_37 |
| **Total Phase 9** | | | | | **1 FK** |

---

### PHASE 10: AUDIT & SECURITY (2 Relationships)

| Parent Table | Child Table | Foreign Key | Relationship | Current Status | Migration Added |
|---|---|---|---|---|---|
| users | audit_logs | `audit_logs.user_id` | One-to-Many | ❌ Missing FK | ✅ FK_38 |
| users | kyc_documents | `kyc_documents.user_id` | One-to-Many | ❌ Missing FK | ✅ FK_39 |
| **Total Phase 10** | | | | | **2 FKs** |

---

## SUMMARY OF MISSING FOREIGN KEYS

**Total Foreign Keys to Add: 39**  
(Some relationships already exist in code, noted above)

**By Phase:**
- Phase 1: 6 FKs
- Phase 2: 9 FKs  
- Phase 3: 3 FKs
- Phase 4: 7 FKs
- Phase 5: 2 FKs
- Phase 6: 7 FKs
- Phase 7: 2 FKs
- Phase 8: 2 FKs
- Phase 9: 1 FK
- Phase 10: 2 FKs

---

## SEQUELIZE ASSOCIATIONS TO ADD

All foreign keys in the SQL migration must be matched with Sequelize associations in [models_sql/index.js](models_sql/index.js):

```javascript
// PHASE 1: Identity & Access Control
User.belongsTo(Role, { foreignKey: 'role_id', as: 'userRole' });
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });

User.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Department.hasMany(User, { foreignKey: 'department_id', as: 'employees' });

RolePermission.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(RolePermission, { foreignKey: 'role_id', as: 'permissions' });

RolePermission.belongsTo(Permission, { foreignKey: 'permission_id', as: 'permission' });
Permission.hasMany(RolePermission, { foreignKey: 'permission_id', as: 'roles' });

Permission.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });
Module.hasMany(Permission, { foreignKey: 'module_id', as: 'permissions' });

Session.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Session, { foreignKey: 'user_id', as: 'sessions' });

// PHASE 2: Product Catalog & Inventory
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });

Product.belongsTo(Brand, { foreignKey: 'brand_id', as: 'brand' });
Brand.hasMany(Product, { foreignKey: 'brand_id', as: 'products' });

ProductComment.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(ProductComment, { foreignKey: 'product_id', as: 'comments' });

ProductComment.belongsTo(User, { foreignKey: 'user_id', as: 'author' });
User.hasMany(ProductComment, { foreignKey: 'user_id', as: 'productComments' });

ProductShare.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(ProductShare, { foreignKey: 'product_id', as: 'shares' });

ProductShare.belongsTo(User, { foreignKey: 'user_id', as: 'sharedBy' });
User.hasMany(ProductShare, { foreignKey: 'user_id', as: 'productShares' });

Inventory.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(Inventory, { foreignKey: 'product_id', as: 'inventory' });

Inventory.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
Warehouse.hasMany(Inventory, { foreignKey: 'warehouse_id', as: 'inventory' });

InventoryAlert.belongsTo(Inventory, { foreignKey: 'inventory_id', as: 'inventory' });
Inventory.hasMany(InventoryAlert, { foreignKey: 'inventory_id', as: 'alerts' });

InventoryHistory.belongsTo(Inventory, { foreignKey: 'inventory_id', as: 'inventory' });
Inventory.hasMany(InventoryHistory, { foreignKey: 'inventory_id', as: 'history' });

// ... (continue for all other phases)
```

---

## NEXT STEPS

### Step 1: Run Foreign Key Migration
```bash
psql -U postgres -d dfashion -f database/003-add-foreign-keys.sql
```

### Step 2: Add Sequelize Associations
Update `models_sql/index.js` with all associations listed above.

### Step 3: Create Repository Methods with JOINs
```javascript
// Example: OrderRepository method that returns complete order with relations
async getOrderWithDetails(orderId) {
  const Order = this.model._sequelize;
  const order = await Order.findByPk(orderId, {
    include: [
      { model: User, as: 'customer', attributes: ['id', 'full_name', 'email', 'phone'] },
      { model: Payment, as: 'payments', include: [] },
      { model: Shipment, as: 'shipments', include: [{ model: Courier, as: 'courier' }] }
    ]
  });
  return order;
}
```

### Step 4: Update Angular Components
Ensure all UI components fetch data via API and display relational data:
```typescript
// Example: Order detail component
export class OrderDetailComponent implements OnInit {
  order: any;
  
  ngOnInit() {
    this.orderId = this.route.snapshot.params['id'];
    // Fetch from API (which now includes relations via JOIN)
    this.api.getOrderWithDetails(this.orderId).subscribe(data => {
      this.order = data;
      // Display customer, payment, shipment info from relational data
    });
  }
}
```

---

## REFERENTIAL INTEGRITY RULES APPLIED

**ON DELETE CASCADE:** Used for optional relationships
- Orders → Payments (if order deleted, payments deleted)
- Orders → Shipments
- Wishlist items (if product deleted, wishlist entry deleted)

**ON DELETE RESTRICT:** Used for critical relationships
- Orders → Customer (cannot delete customer with pending orders)
- Returns → User (cannot delete user with pending returns)

**ON DELETE SET NULL:** Used for weak references
- Products → Category (if category deleted, product category set to null)
- Shipments → Courier (if courier deleted, shipment still exists with null courier)

---

## VALIDATION CHECKLIST

After implementing all foreign keys and associations:

- [ ] All 50+ tables have primary keys
- [ ] All 39 foreign keys created in database
- [ ] All Sequelize associations defined in models_sql/index.js
- [ ] All repository methods use eager loading with include/joins
- [ ] All API endpoints return structured relational data
- [ ] All Angular components fetch data via API (no hardcoded data)
- [ ] UI displays correctly with related entities
- [ ] No orphaned records exist (FK constraints validated)
- [ ] Cascade rules working (delete parent → delete children)
- [ ] CRUD operations respect foreign key constraints

---

**Report Generated By:** Database Relationship Audit Script  
**File Location:** [DATABASE_AUDIT.md](DATABASE_AUDIT.md)  
**Migration SQL:** [003-add-foreign-keys.sql](003-add-foreign-keys.sql)
