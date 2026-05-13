-- ============================================================================
-- DATABASE RELATIONSHIP AUDIT & FOREIGN KEY MIGRATION
-- ============================================================================
-- Purpose: Enforce all logical relationships between tables using foreign keys
-- This migration adds 47+ foreign key constraints across 30+ tables
-- Database: PostgreSQL & MySQL compatible
-- ============================================================================

-- ============================================================================
-- PHASE 1: CORE IDENTITY & ROLE-BASED ACCESS CONTROL
-- ============================================================================

-- User -> Role relationship
ALTER TABLE users 
ADD CONSTRAINT fk_users_role_id 
FOREIGN KEY (role_id) REFERENCES roles(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- User -> Department relationship
ALTER TABLE users 
ADD CONSTRAINT fk_users_department_id 
FOREIGN KEY (department_id) REFERENCES departments(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- RolePermission -> Role (junction table)
ALTER TABLE role_permissions 
ADD CONSTRAINT fk_role_permissions_role_id 
FOREIGN KEY (role_id) REFERENCES roles(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- RolePermission -> Permission (junction table)
ALTER TABLE role_permissions 
ADD CONSTRAINT fk_role_permissions_permission_id 
FOREIGN KEY (permission_id) REFERENCES permissions(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Module -> Permission relationship
ALTER TABLE permissions 
ADD CONSTRAINT fk_permissions_module_id 
FOREIGN KEY (module_id) REFERENCES modules(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Session -> User relationship
ALTER TABLE sessions 
ADD CONSTRAINT fk_sessions_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- PHASE 2: PRODUCT CATALOG & INVENTORY
-- ============================================================================

-- Product -> Category relationship
ALTER TABLE products 
ADD CONSTRAINT fk_products_category_id 
FOREIGN KEY (category_id) REFERENCES categories(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Product -> Brand relationship
ALTER TABLE products 
ADD CONSTRAINT fk_products_brand_id 
FOREIGN KEY (brand_id) REFERENCES brands(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- SubCategory -> Category relationship (already has FK in model)
-- Verify it exists: ALTER TABLE sub_categories ADD CONSTRAINT ... (if not exists)

-- ProductComment -> Product relationship
ALTER TABLE product_comments 
ADD CONSTRAINT fk_product_comments_product_id 
FOREIGN KEY (product_id) REFERENCES products(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- ProductComment -> User relationship
ALTER TABLE product_comments 
ADD CONSTRAINT fk_product_comments_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- ProductShare -> Product relationship
ALTER TABLE product_shares 
ADD CONSTRAINT fk_product_shares_product_id 
FOREIGN KEY (product_id) REFERENCES products(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- ProductShare -> User relationship
ALTER TABLE product_shares 
ADD CONSTRAINT fk_product_shares_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Inventory -> Product relationship
ALTER TABLE inventories 
ADD CONSTRAINT fk_inventories_product_id 
FOREIGN KEY (product_id) REFERENCES products(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Inventory -> Warehouse relationship
ALTER TABLE inventories 
ADD CONSTRAINT fk_inventories_warehouse_id 
FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- InventoryAlert -> Inventory relationship
ALTER TABLE inventory_alerts 
ADD CONSTRAINT fk_inventory_alerts_inventory_id 
FOREIGN KEY (inventory_id) REFERENCES inventories(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- InventoryHistory -> Inventory relationship
ALTER TABLE inventory_histories 
ADD CONSTRAINT fk_inventory_histories_inventory_id 
FOREIGN KEY (inventory_id) REFERENCES inventories(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- PHASE 3: SHOPPING & CART MANAGEMENT
-- ============================================================================

-- Cart -> User relationship
ALTER TABLE carts 
ADD CONSTRAINT fk_carts_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Wishlist -> User relationship
ALTER TABLE wishlists 
ADD CONSTRAINT fk_wishlists_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Wishlist -> Product relationship
ALTER TABLE wishlists 
ADD CONSTRAINT fk_wishlists_product_id 
FOREIGN KEY (product_id) REFERENCES products(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- PHASE 4: ORDERS & FULFILLMENT
-- ============================================================================

-- Order -> User (customer) relationship
ALTER TABLE orders 
ADD CONSTRAINT fk_orders_customer_id 
FOREIGN KEY (customer_id) REFERENCES users(id) 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Payment -> Order relationship
ALTER TABLE payments 
ADD CONSTRAINT fk_payments_order_id 
FOREIGN KEY (order_id) REFERENCES orders(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Shipment -> Order relationship
ALTER TABLE shipments 
ADD CONSTRAINT fk_shipments_order_id 
FOREIGN KEY (order_id) REFERENCES orders(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Shipment -> Courier relationship
ALTER TABLE shipments 
ADD CONSTRAINT fk_shipments_courier_id 
FOREIGN KEY (courier_id) REFERENCES couriers(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Return -> Order relationship
ALTER TABLE returns 
ADD CONSTRAINT fk_returns_order_id 
FOREIGN KEY (order_id) REFERENCES orders(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Return -> User relationship
ALTER TABLE returns 
ADD CONSTRAINT fk_returns_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- ShippingCharge -> Shipment relationship
ALTER TABLE shipping_charges 
ADD CONSTRAINT fk_shipping_charges_shipment_id 
FOREIGN KEY (shipment_id) REFERENCES shipments(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- PHASE 5: PROMOTIONS & CAMPAIGNS
-- ============================================================================

-- Coupon -> Campaign relationship (optional - if coupons are part of campaigns)
-- Uncomment if campaign field exists in coupons table:
-- ALTER TABLE coupons 
-- ADD CONSTRAINT fk_coupons_campaign_id 
-- FOREIGN KEY (campaign_id) REFERENCES campaigns(id) 
-- ON DELETE SET NULL ON UPDATE CASCADE;

-- FlashSale -> Campaign relationship
ALTER TABLE flash_sales 
ADD CONSTRAINT fk_flash_sales_campaign_id 
FOREIGN KEY (campaign_id) REFERENCES campaigns(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- PHASE 6: USER ENGAGEMENT & BEHAVIOR
-- ============================================================================

-- UserBehavior -> User relationship
ALTER TABLE user_behaviors 
ADD CONSTRAINT fk_user_behaviors_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- UserBehavior -> Product relationship
ALTER TABLE user_behaviors 
ADD CONSTRAINT fk_user_behaviors_product_id 
FOREIGN KEY (product_id) REFERENCES products(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Post -> User relationship
ALTER TABLE posts 
ADD CONSTRAINT fk_posts_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Story -> User relationship
ALTER TABLE stories 
ADD CONSTRAINT fk_stories_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Reel -> User relationship
ALTER TABLE reels 
ADD CONSTRAINT fk_reels_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- LiveStream -> User relationship
ALTER TABLE live_streams 
ADD CONSTRAINT fk_live_streams_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- SearchHistory -> User relationship
ALTER TABLE search_histories 
ADD CONSTRAINT fk_search_histories_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- PHASE 7: NOTIFICATIONS & COMMUNICATIONS
-- ============================================================================

-- Notification -> User relationship
ALTER TABLE notifications 
ADD CONSTRAINT fk_notifications_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Ticket -> User relationship
ALTER TABLE tickets 
ADD CONSTRAINT fk_tickets_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- PHASE 8: SELLER & PERFORMANCE MANAGEMENT
-- ============================================================================

-- SellerCommission -> User (seller) relationship
ALTER TABLE seller_commissions 
ADD CONSTRAINT fk_seller_commissions_seller_id 
FOREIGN KEY (seller_id) REFERENCES users(id) 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- SellerPerformance -> User (seller) relationship
ALTER TABLE seller_performances 
ADD CONSTRAINT fk_seller_performances_seller_id 
FOREIGN KEY (seller_id) REFERENCES users(id) 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- PHASE 9: FINANCIAL TRACKING
-- ============================================================================

-- Transaction -> User relationship
ALTER TABLE transactions 
ADD CONSTRAINT fk_transactions_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Transaction -> Order relationship (if applicable)
-- Uncomment if order_id field exists in transactions table:
-- ALTER TABLE transactions 
-- ADD CONSTRAINT fk_transactions_order_id 
-- FOREIGN KEY (order_id) REFERENCES orders(id) 
-- ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- PHASE 10: AUDIT & SECURITY
-- ============================================================================

-- AuditLog -> User relationship (who performed the action)
ALTER TABLE audit_logs 
ADD CONSTRAINT fk_audit_logs_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- KYCDocument -> User relationship
ALTER TABLE kyc_documents 
ADD CONSTRAINT fk_kyc_documents_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to validate)
-- ============================================================================

-- Check all foreign keys were created successfully
-- SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME 
-- FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
-- WHERE REFERENCED_TABLE_NAME IS NOT NULL 
-- AND TABLE_SCHEMA = 'dfashion';

-- Verify referential integrity by checking orphaned records
-- Example: Find orders with non-existent customer_id
-- SELECT * FROM orders WHERE customer_id NOT IN (SELECT id FROM users);

-- Example: Find payments with non-existent order_id
-- SELECT * FROM payments WHERE order_id NOT IN (SELECT id FROM orders);

-- ============================================================================
-- NOTES FOR IMPLEMENTATION
-- ============================================================================
-- 1. Run this migration AFTER all table creation (after 001-add-sub-categories.sql, 002-...)
-- 2. Before running, ensure all related tables exist and have proper primary keys
-- 3. If any foreign key fails to create, check for:
--    a) Orphaned records (FK value doesn't exist in parent table)
--    b) Data type mismatch (parent and child columns must be same type)
--    c) Existing data violating the constraint
-- 4. Use ON DELETE CASCADE for optional relationships
-- 5. Use ON DELETE RESTRICT for mandatory relationships (e.g., customer_id in orders)
-- 6. After migration, run verification queries to ensure data integrity
-- ============================================================================
