/**
 * ============================================================================
 * DATABASE LAYER REFACTORING GUIDE
 * ============================================================================
 * 
 * This document provides instructions for refactoring duplicate services
 * into unified, database-agnostic services using the adapter pattern.
 * 
 * STATUS: In Progress
 * - ✅ Adapter layer created (postgresAdapter, mongoAdapter)
 * - ✅ ServiceLoader updated to use adapter pattern
 * - ✅ BaseService enhanced with adapter support
 * - ✅ CartService unified (services/cartService.js)
 * - ✅ WishlistService unified (services/wishlistService.js)
 * - ⏳ Remaining 41 services to be unified
 * 
 * ============================================================================
 * MIGRATION STEPS FOR EACH SERVICE
 * ============================================================================
 * 
 * 1. ANALYZE DUPLICATES
 *    Open both:
 *      - /services/postgres/{serviceName}.js
 *      - /services/mongodb/{serviceName}.js
 *    Note differences and merge patterns
 * 
 * 2. CREATE UNIFIED SERVICE
 *    File: /services/{serviceName}.js
 *    
 *    Template:
 *    ```javascript
 *    const db = require('./adapters');
 *    const BaseService = require('./postgres/BaseService');
 *    
 *    class MyService extends BaseService {
 *      constructor() {
 *        super(db.MyModel, 'MyModel');
 *      }
 *      
 *      // Business logic methods here
 *      async myMethod() {
 *        try {
 *          await this.db.ensureModelsReady();
 *          // Use this.model for database operations
 *          const result = await this.model.findAll();
 *          return { success: true, data: result };
 *        } catch (error) {
 *          console.error('[MyService] error:', error.message);
 *          return { success: false, error: error.message };
 *        }
 *      }
 *    }
 *    
 *    module.exports = new MyService();
 *    ```
 * 
 * 3. UPDATE IMPORTS
 *    In controllers/other files that use this service:
 *    
 *    OLD (Mixed pattern):
 *    ```javascript
 *    const ServiceLoader = require('./services/ServiceLoader');
 *    const myService = ServiceLoader.loadService('myService');
 *    ```
 *    
 *    NEW (Direct import - after unified):
 *    ```javascript
 *    const myService = require('./services/myService');
 *    ```
 *    
 *    OR via ServiceLoader (still works):
 *    ```javascript
 *    const serviceLoader = require('./services/ServiceLoader');
 *    const myService = serviceLoader.loadService('myService');
 *    ```
 * 
 * 4. TEST
 *    Run: npm test
 *    Verify all endpoints work with PostgreSQL
 * 
 * 5. REMOVE DUPLICATES (After testing)
 *    After confirming unified service works:
 *    - Delete /services/postgres/{serviceName}.js
 *    - Delete /services/mongodb/{serviceName}.js
 *    - These can be recovered from git if needed
 * 
 * ============================================================================
 * PRIORITY ORDER (Services to Refactor)
 * ============================================================================
 * 
 * CRITICAL (High Impact - Refactor First):
 * 1. ProductService - Used everywhere
 * 2. OrderService - Critical for transactions
 * 3. UserService - Authentication
 * 4. PaymentService - Financial transactions
 * 5. NotificationService - User communications
 * 
 * HIGH (Commonly Used):
 * 6. PostService - Social features
 * 7. StoryService - Social features
 * 8. ReelService - Social features
 * 9. InventoryService - Stock management
 * 10. AnalyticsService - Reporting
 * 
 * MEDIUM (Important but less frequently used):
 * 11. CategoryService
 * 12. BrandService
 * 13. CouponService
 * 14. RewardService
 * 15. SearchService
 * 
 * LOW (Can be done later):
 * 16-43: Other services
 * 
 * ============================================================================
 * KEY PATTERNS FOR UNIFIED SERVICES
 * ============================================================================
 * 
 * 1. USE ADAPTER FOR ALL DB OPERATIONS
 *    ```javascript
 *    const db = require('./adapters');
 *    
 *    // Access models
 *    const user = await db.User.findByPk(userId);
 *    
 *    // Access Sequelize utilities
 *    const Op = db.Op;
 *    const result = await db.Product.findAll({
 *      where: { price: { [Op.gt]: 100 } }
 *    });
 *    ```
 * 
 * 2. IDEMPOTENT OPERATIONS
 *    Adding duplicates should increment, not fail:
 *    ```javascript
 *    async addToCart(userId, productId, quantity) {
 *      let cartItem = await this.CartItem.findOne({
 *        where: { cart_id, product_id }
 *      });
 *      
 *      if (cartItem) {
 *        // Idempotent: increment instead of blocking
 *        cartItem.quantity += quantity;
 *        await cartItem.save();
 *      } else {
 *        cartItem = await this.CartItem.create({...});
 *      }
 *    }
 *    ```
 * 
 * 3. CONSISTENT ERROR HANDLING
 *    ```javascript
 *    return {
 *      success: boolean,
 *      data: resultData,
 *      message: 'Human readable message',
 *      error: errorMessage,
 *      statusCode: httpStatusCode  // 200, 404, 500, etc
 *    };
 *    ```
 * 
 * 4. ALWAYS ENSURE MODELS ARE READY
 *    ```javascript
 *    async myMethod() {
 *      try {
 *        await this.db.ensureModelsReady();
 *        // Now safe to use models
 *      } catch (error) {...}
 *    }
 *    ```
 * 
 * ============================================================================
 * SERVICES ALREADY UNIFIED
 * ============================================================================
 * ✅ CartService - /services/cartService.js
 * ✅ WishlistService - /services/wishlistService.js
 * 
 * ============================================================================
 * ARCHITECTURE OVERVIEW
 * ============================================================================
 * 
 *                    ┌─────────────────────┐
 *                    │   Controllers       │
 *                    │  (No DB logic)      │
 *                    └──────────┬──────────┘
 *                               │
 *                    ┌──────────▼──────────┐
 *                    │    Services         │
 *                    │  (Business Logic)   │
 *                    │  - cartService.js   │
 *                    │  - productService.js│
 *                    │  - etc              │
 *                    └──────────┬──────────┘
 *                               │
 *                    ┌──────────▼──────────┐
 *                    │   Adapter Layer     │
 *                    │ (/adapters/index.js)│
 *                    └──────────┬──────────┘
 *                               │
 *                    ┌──────────▼──────────┐
 *                    │ PostgresAdapter     │
 *                    │  (DB operations)    │
 *                    └──────────┬──────────┘
 *                               │
 *                    ┌──────────▼──────────┐
 *                    │  Sequelize Models   │
 *                    │  (/models_sql/)     │
 *                    └──────────┬──────────┘
 *                               │
 *                    ┌──────────▼──────────┐
 *                    │   PostgreSQL DB     │
 *                    │  (Production Data)  │
 *                    └─────────────────────┘
 * 
 * ============================================================================
 * ENVIRONMENT VARIABLES
 * ============================================================================
 * 
 * Set in .env:
 * 
 * # Current (Always PostgreSQL)
 * DB_TYPE=postgres
 * 
 * # Optional - for future MongoDB re-enablement:
 * DB_TYPE=mongodb
 * 
 * MongoDB is currently disabled. If you want to re-enable it:
 * 1. Set DB_TYPE=mongodb in .env
 * 2. Implement services/adapters/mongoAdapter.js
 * 3. All services will automatically use MongoDB
 * 
 * ============================================================================
 * REMOVING SERVICES (CLEANUP)
 * ============================================================================
 * 
 * After testing unified service:
 * 
 * 1. Confirm unified service works:
 *    npm test -- --grep "MyService"
 * 
 * 2. Remove duplicate files:
 *    rm -f /services/postgres/{serviceName}.js
 *    rm -f /services/mongodb/{serviceName}.js
 * 
 * 3. Verify no broken imports:
 *    npm run lint
 *    npm start
 * 
 * 4. Git will keep history if needed:
 *    git log -- /services/postgres/{serviceName}.js
 * 
 * ============================================================================
 * TROUBLESHOOTING
 * ============================================================================
 * 
 * Error: "Service not found in postgres folder"
 * - Check ServiceLoader.js for correct file path
 * - Ensure service file is in /services/ or /services/postgres/
 * 
 * Error: "Model is not initialized"
 * - Call await db.ensureModelsReady() at start of method
 * - Check that models_sql folder exists and has models
 * 
 * Error: "Cannot read property of undefined"
 * - Check that required fields are passed to service methods
 * - Verify adapter is correctly imported
 * 
 * ============================================================================
 */

module.exports = {
  message: 'Database refactoring guide - see this file for detailed instructions'
};
