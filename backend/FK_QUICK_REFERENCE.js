/**
 * ============================================================================
 * FOREIGN KEY RELATIONSHIP QUICK REFERENCE
 * ============================================================================
 * Use this to quickly look up what relationships each model has
 * 
 * When updating any endpoint that returns MODEL_X, use:
 * include: buildIncludeClause('MODEL_X')
 * 
 * This automatically includes all the relationships listed below
 */

const FK_RELATIONSHIPS_MAP = {
  
  // =========== CORE BUSINESS MODELS ===========
  
  Order: {
    foreignKeys: ['user_id', 'billing_address_id', 'shipping_address_id'],
    relationships: {
      customer: 'User (via user_id)',
      items: 'OrderItem[]',
      payment: 'Payment',
      shipment: 'Shipment',
      return: 'Return',
      sellerCommission: 'SellerCommission[]'
    },
    fields_to_check: ['user_id', 'order_id in payments', 'order_id in shipments']
  },

  Product: {
    foreignKeys: ['brand_id', 'category_id', 'seller_id'],
    relationships: {
      brand: 'Brand',
      category: 'Category',
      seller: 'User (Vendor)',
      inventory: 'Inventory',
      reviews: 'Review[]',
      comments: 'ProductComment[]',
      wishlists: 'Wishlist[]'
    },
    fields_to_check: ['brand_id', 'category_id', 'seller_id']
  },

  Cart: {
    foreignKeys: ['user_id'],
    relationships: {
      user: 'User',
      items: 'CartItem[]',
      product: 'Product (via CartItem)'
    },
    fields_to_check: ['user_id']
  },

  Payment: {
    foreignKeys: ['order_id'],
    relationships: {
      order: 'Order'
    },
    fields_to_check: ['order_id']
  },

  Shipment: {
    foreignKeys: ['order_id', 'courier_id'],
    relationships: {
      order: 'Order',
      courier: 'Courier'
    },
    fields_to_check: ['order_id', 'courier_id']
  },

  Return: {
    foreignKeys: ['order_id', 'user_id'],
    relationships: {
      order: 'Order',
      requester: 'User (via user_id)'
    },
    fields_to_check: ['order_id', 'user_id']
  },

  // =========== USER & ACCOUNT ===========

  User: {
    foreignKeys: ['role_id', 'department_id'],
    relationships: {
      role: 'Role',
      department: 'Department',
      addresses: 'Address[]',
      orders: 'Order[]',
      carts: 'Cart[]',
      wishlists: 'Wishlist[]',
      comments: 'ProductComment[]',
      posts: 'Post[]',
      stories: 'Story[]',
      reels: 'Reel[]',
      transactions: 'Transaction[]',
      auditLogs: 'AuditLog[]'
    },
    fields_to_check: ['role_id', 'department_id', 'user_id in many tables']
  },

  Address: {
    foreignKeys: ['user_id'],
    relationships: {
      user: 'User'
    },
    fields_to_check: ['user_id']
  },

  // =========== CONTENT & SOCIAL ===========

  Post: {
    foreignKeys: ['user_id'],
    relationships: {
      author: 'User (via user_id)',
      comments: 'PostComment[]'
    },
    fields_to_check: ['user_id']
  },

  Story: {
    foreignKeys: ['user_id'],
    relationships: {
      author: 'User (via user_id)'
    },
    fields_to_check: ['user_id']
  },

  Reel: {
    foreignKeys: ['user_id'],
    relationships: {
      author: 'User (via user_id)',
      comments: 'ReelComment[]'
    },
    fields_to_check: ['user_id']
  },

  ProductComment: {
    foreignKeys: ['product_id', 'user_id'],
    relationships: {
      product: 'Product',
      author: 'User (via user_id)',
      replies: 'ProductComment[]'
    },
    fields_to_check: ['product_id', 'user_id']
  },

  Review: {
    foreignKeys: ['product_id', 'user_id'],
    relationships: {
      product: 'Product',
      reviewer: 'User (via user_id)'
    },
    fields_to_check: ['product_id', 'user_id']
  },

  // =========== CATALOG ===========

  Category: {
    foreignKeys: ['parent_category_id'],
    relationships: {
      parent: 'Category (via parent_category_id)',
      children: 'Category[]',
      products: 'Product[]',
      subCategories: 'SubCategory[]'
    },
    fields_to_check: ['category_id in products']
  },

  Brand: {
    foreignKeys: [],
    relationships: {
      products: 'Product[]'
    },
    fields_to_check: ['brand_id in products']
  },

  Wishlist: {
    foreignKeys: ['user_id', 'product_id'],
    relationships: {
      user: 'User',
      product: 'Product'
    },
    fields_to_check: ['user_id', 'product_id']
  },

  Inventory: {
    foreignKeys: ['product_id', 'warehouse_id'],
    relationships: {
      product: 'Product',
      warehouse: 'Warehouse'
    },
    fields_to_check: ['product_id', 'warehouse_id']
  },

  // =========== ADMIN & SYSTEM ===========

  Transaction: {
    foreignKeys: ['user_id'],
    relationships: {
      user: 'User'
    },
    fields_to_check: ['user_id']
  },

  AuditLog: {
    foreignKeys: ['actor_id', 'user_id'],
    relationships: {
      actor: 'User (via actor_id)',
      user: 'User (affected user)'
    },
    fields_to_check: ['actor_id', 'user_id']
  },

  Ticket: {
    foreignKeys: ['user_id'],
    relationships: {
      user: 'User'
    },
    fields_to_check: ['user_id']
  },

  Notification: {
    foreignKeys: ['user_id'],
    relationships: {
      user: 'User'
    },
    fields_to_check: ['user_id']
  },

  SellerCommission: {
    foreignKeys: ['user_id', 'order_id'],
    relationships: {
      seller: 'User (via user_id)',
      order: 'Order'
    },
    fields_to_check: ['user_id', 'order_id']
  },

  SellerPerformance: {
    foreignKeys: ['user_id'],
    relationships: {
      seller: 'User (via user_id)'
    },
    fields_to_check: ['user_id']
  },

  KYCDocument: {
    foreignKeys: ['user_id'],
    relationships: {
      user: 'User'
    },
    fields_to_check: ['user_id']
  }
};

// ============================================================================
// RESPONSE STRUCTURE EXAMPLES
// ============================================================================

const EXAMPLE_RESPONSES = {
  
  // Before updating (raw FK IDs):
  order_before: {
    id: 1,
    order_number: 'ORD-123456',
    user_id: 5,           // ❌ RAW FK ID - exposed to client
    total_amount: 5000,
    status: 'pending',
    payment_id: 10,       // ❌ RAW FK ID
    shipping_address: '{"street":"123 Main","city":"NYC"}'  // ❌ JSON STRING
  },

  // After updating (nested objects):
  order_after: {
    id: 1,
    order_number: 'ORD-123456',
    customer: {           // ✅ NESTED OBJECT instead of user_id
      id: 5,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com'
    },
    total_amount: 5000,
    status: 'pending',
    payment: {            // ✅ NESTED OBJECT instead of payment_id
      id: 10,
      method: 'credit_card',
      status: 'completed'
    },
    shipping_address: {   // ✅ PARSED OBJECT instead of string
      street: '123 Main',
      city: 'NYC',
      state: 'NY',
      zip: '10001'
    }
  },

  // Product before:
  product_before: {
    id: 1,
    name: 'Nike Shoes',
    brand_id: 5,          // ❌ RAW FK ID
    category_id: 10,      // ❌ RAW FK ID
    seller_id: 3          // ❌ RAW FK ID
  },

  // Product after:
  product_after: {
    id: 1,
    name: 'Nike Shoes',
    brand: {              // ✅ FULL BRAND OBJECT
      id: 5,
      name: 'Nike',
      logo: 'https://...'
    },
    category: {           // ✅ FULL CATEGORY OBJECT
      id: 10,
      name: 'Shoes',
      description: 'Footwear'
    },
    seller: {             // ✅ FULL SELLER (VENDOR) OBJECT
      id: 3,
      firstName: 'Store Owner',
      email: 'store@example.com'
    }
  }
};

// ============================================================================
// UPDATING CHECKLIST FOR EACH CONTROLLER
// ============================================================================

const UPDATE_CHECKLIST = `
For EACH controller file that handles a model with FK:

1. ✅ ADD IMPORTS:
   const { formatPaginatedResponse, formatSingleResponse, buildIncludeClause, validateMultipleFK } = require('../utils/fkResponseFormatter');

2. ✅ FOR ALL GET ENDPOINTS:
   - Replace include: [{ model: X }, { model: Y }] 
   - With: include: buildIncludeClause('ModelName')
   - Wrap response with formatSingleResponse() or formatPaginatedResponse()
   - Test: No raw FK IDs in response

3. ✅ FOR ALL CREATE ENDPOINTS:
   - Add: validateMultipleFK() for all FKs in request body
   - Check: if (!validation.isValid) return error
   - Fetch: const record = await Model.findByPk(id, { include: buildIncludeClause() })
   - Return: formatSingleResponse(record)

4. ✅ FOR ALL UPDATE ENDPOINTS:
   - If updating FK: call validateFK('Model', newValue)
   - Always re-fetch with: include: buildIncludeClause()
   - Return: formatSingleResponse(updated)

5. ✅ VERIFY RESPONSE:
   - No 'user_id', 'product_id', 'brand_id' visible
   - Has 'user', 'product', 'brand' objects instead
   - JSON strings parsed as objects
   - Pagination included for list endpoints

Example:
   // BEFORE:
   const products = await Product.findAll({ limit: 10 });
   return res.json(products);
   
   // AFTER:
   const { rows, count } = await Product.findAndCountAll({
     include: buildIncludeClause('Product'),
     limit: 10
   });
   const formatted = formatPaginatedResponse(rows, { page: 1, limit: 10, total: count });
   return res.json(formatted);
`;

// ============================================================================
// API ENDPOINT MAPPING
// ============================================================================

const ENDPOINTS_TO_UPDATE = {
  
  priority_1_critical: {
    orderController: [
      'POST /orders - createOrder()',
      'GET /orders - getUserOrders()', 
      'GET /orders/:id - getOrderById()',
      'PUT /orders/:id/status - updateOrderStatus()',
      'GET /orders/:id/invoice - generateInvoice()'
    ],
    productController: [
      'GET /products - getAllProducts()',
      'GET /products/:id - getProductById()',
      'GET /products/search - searchProducts()',
      'POST /products/filter - filterProducts()'
    ],
    cartController: [
      'GET /cart - getCart()',
      'POST /cart - addToCart()',
      'PUT /cart/:id - updateCartItem()'
    ],
    adminController: [
      'GET /admin/products - getAllProducts()',
      'GET /admin/orders - getAllOrders()',
      'GET /admin/vendors - getAllVendors()'
    ]
  },

  priority_2_medium: {
    paymentController: 4,      // endpoints
    shipmentController: 4,     // endpoints
    returnController: 3,       // endpoints
    postController: 3,         // endpoints
    storyController: 3,        // endpoints
    reelController: 3          // endpoints
  },

  priority_3_low: {
    productCommentController: 3,
    userController: 4,
    addressController: 2,
    wishlistController: 2,
    analyticsController: 2,
    auditLogController: 2,
    transactionController: 2
  }
};

module.exports = {
  FK_RELATIONSHIPS_MAP,
  EXAMPLE_RESPONSES,
  UPDATE_CHECKLIST,
  ENDPOINTS_TO_UPDATE,
  total_endpoints_remaining: 27,
  completion_status: '33% - 13 endpoints done, 27 remaining'
};
