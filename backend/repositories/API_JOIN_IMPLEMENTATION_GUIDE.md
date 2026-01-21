# API DATA LOADING & JOIN IMPLEMENTATION GUIDE

**Purpose:** Ensure all backend APIs return complete relational data by using proper SQL JOINs (PostgreSQL/MySQL) and population (MongoDB)

**Status:** OrderRepository upgraded with full JOINs  
**Next Steps:** Apply same pattern to other repositories and controllers

---

## IMPLEMENTATION PATTERN

### For PostgreSQL/MySQL (Using Sequelize)

All include statements should follow this pattern:

```javascript
const order = await Order.findAll({
  include: [
    {
      model: User,           // Related model
      as: 'customer',        // Alias from association
      attributes: ['id', 'fullName', 'email'],  // Only needed fields
      required: false        // LEFT JOIN (false) vs INNER JOIN (true)
    },
    {
      model: Payment,
      as: 'payments',
      attributes: ['id', 'amount', 'status'],
      required: false
    }
  ],
  order: [['createdAt', 'DESC']],
  limit: 20,
  offset: 0,
  raw: false  // Important: keeps nested objects intact
});
```

### For MongoDB (Using Mongoose)

```javascript
const order = await Order.findById(id)
  .populate('customer', 'fullName email')  // Select specific fields
  .populate({
    path: 'payments',
    select: 'amount status'
  })
  .lean();  // Convert to plain JavaScript objects
```

---

## PRIORITY REPOSITORIES TO UPDATE

### 1. ProductRepository (Current Status: ❌ Missing)
**Key Methods:**
- `getAllProducts()` → Include Category, Brand, Inventory
- `getProductById()` → Include Category, Brand, Comments, Inventory with Warehouse
- `getProductsByCategory()` → Include Category, Brand, Stock levels

**Sample Implementation:**
```javascript
async getAllProducts(filters = {}, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const Product = this.productModel._sequelize;
  const Category = require('../models_sql').Category._sequelize;
  const Brand = require('../models_sql').Brand._sequelize;
  const Inventory = require('../models_sql').Inventory._sequelize;
  const Warehouse = require('../models_sql').Warehouse._sequelize;

  const products = await Product.findAll({
    where: filters.where || {},
    include: [
      { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
      { model: Brand, as: 'brand', attributes: ['id', 'name', 'logo'] },
      {
        model: Inventory,
        as: 'inventory',
        attributes: ['sku', 'quantity', 'warehouse_id'],
        include: [{ model: Warehouse, as: 'warehouse', attributes: ['id', 'name'] }],
        required: false
      }
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    raw: false
  });

  return { success: true, data: products };
}
```

### 2. UserRepository (Current Status: ❌ Missing)
**Key Methods:**
- `getAllUsers()` → Include Role, Department, Sessions
- `getUserById()` → Include Role, Department, Orders, Tickets, KYC Documents
- `getUserOrders()` → Include Order details with payments/shipments

**Sample:**
```javascript
async getUserById(userId) {
  const User = this.userModel._sequelize;
  const Role = require('../models_sql').Role._sequelize;
  const Order = require('../models_sql').Order._sequelize;
  const Payment = require('../models_sql').Payment._sequelize;

  const user = await User.findByPk(userId, {
    include: [
      { model: Role, as: 'userRole', attributes: ['id', 'name'] },
      {
        model: Order,
        as: 'orders',
        attributes: ['id', 'orderNumber', 'totalAmount', 'status'],
        include: [{ model: Payment, as: 'payments', attributes: ['id', 'amount'] }],
        required: false
      }
    ]
  });

  return { success: true, data: user };
}
```

### 3. ShipmentRepository (Current Status: ❌ Missing)
**Key Methods:**
- `getAllShipments()` → Include Order (with customer), Courier
- `getShipmentById()` → Include Order, Courier, ShippingCharges

### 4. CartRepository (Current Status: ❌ Missing)
**Key Methods:**
- `getCartByUser()` → Expand items to include full Product data
- `addToCart()` → Return cart with complete product details

---

## ANGULAR COMPONENT UPDATE PATTERN

All UI components must fetch data **exclusively via API** using the new JOIN-enhanced endpoints.

### Example 1: Order List Component

**BEFORE (Hardcoded Data):**
```typescript
export class OrderListComponent {
  orders = [
    { id: 1, number: 'ORD-001', customer: 'John', amount: 500 },
    { id: 2, number: 'ORD-002', customer: 'Jane', amount: 600 }
  ];
}
```

**AFTER (API Data with Relations):**
```typescript
export class OrderListComponent implements OnInit {
  orders: any[] = [];
  loading = false;
  currentPage = 1;
  pageSize = 10;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders(filters = {}) {
    this.loading = true;
    this.api.getOrders({ page: this.currentPage, limit: this.pageSize, ...filters })
      .subscribe(
        (response) => {
          this.orders = response.data.orders;  // Now includes customer, payments, shipment
          this.loading = false;
        },
        (error) => {
          console.error('Error loading orders:', error);
          this.loading = false;
        }
      );
  }

  // Display customer name from relational data
  getCustomerName(order: any): string {
    return order.customer?.fullName || 'Unknown';
  }

  // Display total paid amount
  getTotalPaid(order: any): number {
    return order.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  }

  // Display shipment status
  getShipmentStatus(order: any): string {
    return order.shipment?.status || 'Not shipped';
  }

  // Display courier name
  getCourierName(order: any): string {
    return order.shipment?.courier?.name || 'Not assigned';
  }
}
```

**Template Updates:**
```html
<table class="orders-table">
  <thead>
    <tr>
      <th>Order #</th>
      <th>Customer</th>
      <th>Amount</th>
      <th>Paid</th>
      <th>Status</th>
      <th>Courier</th>
    </tr>
  </thead>
  <tbody>
    <tr *ngFor="let order of orders">
      <td>{{ order.orderNumber }}</td>
      <td>
        <strong>{{ order.customer.fullName }}</strong><br/>
        {{ order.customer.email }}
      </td>
      <td>${{ order.totalAmount }}</td>
      <td>${{ getTotalPaid(order) }}</td>
      <td>
        <span class="status-badge" [class]="'status-' + order.status">
          {{ order.status }}
        </span>
      </td>
      <td>
        {{ getCourierName(order) }}
        <br/>
        <small>{{ order.shipment?.trackingNumber }}</small>
      </td>
    </tr>
  </tbody>
</table>
```

### Example 2: Product Detail Component

**BEFORE (Incomplete Product Data):**
```typescript
product = { id: 1, title: 'Shirt', price: 50 };
```

**AFTER (Complete Product Data with Relations):**
```typescript
export class ProductDetailComponent implements OnInit {
  product: any = null;
  relatedProducts: any[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    const productId = this.route.snapshot.params['id'];
    this.api.getProductById(productId).subscribe(
      (response) => {
        this.product = response.data.product;
        // Now includes: category, brand, comments with authors, inventory per warehouse
        this.loadRelatedProducts();
      }
    );
  }

  loadRelatedProducts() {
    // Get other products in same category
    this.api.getProductsByCategory(this.product.category.id, { limit: 5 })
      .subscribe(data => {
        this.relatedProducts = data.data.products;
      });
  }

  // Display category info from relations
  getCategoryName(): string {
    return this.product.category?.name || 'Uncategorized';
  }

  // Display brand info from relations
  getBrandName(): string {
    return this.product.brand?.name || 'Unknown Brand';
  }

  // Display stock from inventory relations
  getTotalStock(): number {
    return this.product.inventory?.reduce((sum, inv) => sum + inv.quantity, 0) || 0;
  }

  // Display warehouse breakdown
  getInventoryByWarehouse() {
    return this.product.inventory?.map(inv => ({
      warehouse: inv.warehouse?.name,
      quantity: inv.quantity,
      sku: inv.sku
    })) || [];
  }
}
```

**Template:**
```html
<div class="product-detail" *ngIf="product">
  <h1>{{ product.title }}</h1>
  
  <!-- Display category and brand from relations -->
  <div class="product-meta">
    <span class="category">{{ getCategoryName() }}</span> |
    <span class="brand">{{ getBrandName() }}</span>
  </div>

  <div class="pricing">
    <span class="price">${{ product.price }}</span>
  </div>

  <!-- Inventory breakdown from warehouse relations -->
  <div class="inventory-section">
    <h3>Stock Levels</h3>
    <p>Total Available: <strong>{{ getTotalStock() }}</strong></p>
    <table class="inventory-table">
      <tr *ngFor="let inv of getInventoryByWarehouse()">
        <td>{{ inv.warehouse }}</td>
        <td>{{ inv.quantity }}</td>
        <td>{{ inv.sku }}</td>
      </tr>
    </table>
  </div>

  <!-- Customer comments with author info from relations -->
  <div class="comments-section" *ngIf="product.comments?.length">
    <h3>Reviews ({{ product.comments.length }})</h3>
    <div class="comment" *ngFor="let comment of product.comments">
      <strong>{{ comment.author?.fullName }}</strong>
      <p>{{ comment.text }}</p>
      <small>{{ comment.createdAt | date }}</small>
    </div>
  </div>
</div>
```

---

## API SERVICE METHODS TO CREATE/UPDATE

Add these methods to your Angular API service:

```typescript
// api.service.ts
export class ApiService {
  constructor(private http: HttpClient) {}

  // ORDERS API
  getOrders(params: any = {}) {
    return this.http.get('/api/admin/orders', { params });
  }

  getOrderWithDetails(orderId: number) {
    return this.http.get(`/api/admin/orders/${orderId}`);
  }

  // PRODUCTS API
  getProductById(productId: number) {
    return this.http.get(`/api/products/${productId}`);
  }

  getProductsByCategory(categoryId: number, params: any = {}) {
    return this.http.get(`/api/products/category/${categoryId}`, { params });
  }

  // USERS API
  getUserById(userId: number) {
    return this.http.get(`/api/users/${userId}`);
  }

  getUserOrders(userId: number) {
    return this.http.get(`/api/users/${userId}/orders`);
  }

  // CARTS API
  getUserCart(userId: number) {
    return this.http.get(`/api/carts/user/${userId}`);
  }

  addToCart(userId: number, productId: number, quantity: number) {
    return this.http.post(`/api/carts/user/${userId}/items`, { productId, quantity });
  }

  // SHIPMENTS API
  getShipments(filters: any = {}) {
    return this.http.get('/api/shipments', { params: filters });
  }

  getShipmentById(shipmentId: number) {
    return this.http.get(`/api/shipments/${shipmentId}`);
  }
}
```

---

## VALIDATION CHECKLIST

Before and after implementing JOINs:

### Before (Current Issues)
- [ ] Orders list shows customer ID instead of customer name
- [ ] Order detail page doesn't show payment details
- [ ] Product page doesn't show category/brand names (only IDs)
- [ ] Cart doesn't show full product details (missing price, images)
- [ ] Shipment list doesn't show courier names
- [ ] Components have hardcoded mock data

### After (Expected Improvements)
- [ ] Orders list displays: Order #, Customer Name, Email, Status, Courier
- [ ] Order detail: Full customer info, all payments, shipment with tracking
- [ ] Product: Category name, brand name, warehouse inventory breakdown
- [ ] Cart: Complete product details (name, price, images) per item
- [ ] Shipment: Order info, customer name, courier name and contact
- [ ] All data fetched from API (no hardcoded values)

---

## PERFORMANCE OPTIMIZATION NOTES

**Eager Loading Issues:**
- Don't include TOO many nested relations (max 2-3 levels deep)
- Use `raw: true` in Sequelize when you don't need Sequelize methods
- Limit fields with `attributes` property to reduce payload size

**Example of Good vs Bad:**

❌ **BAD (Too Many Nested Relations):**
```javascript
include: [
  {
    model: User,
    include: [{
      model: Order,
      include: [{
        model: Payment,
        include: [{ model: Invoice, include: [{ model: Tax }] }]
      }]
    }]
  }
]
// Results in massive query and slow response
```

✅ **GOOD (Limited Depth, Selective Fields):**
```javascript
include: [
  {
    model: User,
    attributes: ['id', 'fullName', 'email'],
    required: false
  },
  {
    model: Order,
    attributes: ['id', 'orderNumber', 'totalAmount'],
    required: false
  }
]
// Fast query, focused data payload
```

---

## NEXT IMPLEMENTATION STEPS

1. **Create ProductRepository** with category/brand joins
2. **Create UserRepository** with role/department joins
3. **Update all controllers** to use these repositories
4. **Audit Angular components** - replace hardcoded data with API calls
5. **Test end-to-end** - verify UI displays relational data correctly
6. **Monitor queries** - ensure N+1 problem is solved with eager loading

---

**Document Version:** 1.0  
**Last Updated:** January 21, 2026  
**Status:** Ready for implementation
