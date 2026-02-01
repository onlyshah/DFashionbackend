-- ============================================================================
-- DFashion Platform - Complete PostgreSQL Schema
-- ============================================================================
-- Database: dfashion
-- Created: 2026-01-28
-- Purpose: Unified schema for social + e-commerce platform
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- CORE SYSTEM TABLES
-- ============================================================================

-- Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  level INTEGER NOT NULL DEFAULT 0,  -- Hierarchy level (lower = more privileged)
  is_system_role BOOLEAN DEFAULT FALSE,  -- System roles cannot be deleted
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  INDEX idx_roles_name (name),
  INDEX idx_roles_level (level)
);

-- Permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(150) NOT NULL,
  description TEXT,
  module VARCHAR(50) NOT NULL,  -- e.g., 'users', 'products', 'orders'
  action VARCHAR(50) NOT NULL,  -- e.g., 'create', 'read', 'update', 'delete'
  resource_level VARCHAR(50),  -- 'global', 'departmental', 'personal'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(module, action),
  INDEX idx_permissions_module (module),
  INDEX idx_permissions_action (action)
);

-- Role permissions mapping
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_id, permission_id),
  INDEX idx_role_permissions_role_id (role_id),
  INDEX idx_role_permissions_permission_id (permission_id)
);

-- ============================================================================
-- USER & AUTHENTICATION
-- ============================================================================

-- Users table (unified across all roles)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  
  -- Role assignment
  role_id UUID NOT NULL REFERENCES roles(id),
  department VARCHAR(50),  -- For admin staff
  
  -- Account status
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  email_verified_at TIMESTAMP,
  
  -- Account security
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(255),
  login_attempts INTEGER DEFAULT 0,
  account_locked_until TIMESTAMP,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  
  -- Tracking
  last_login_at TIMESTAMP,
  last_activity_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,  -- Soft delete
  
  INDEX idx_users_email (email),
  INDEX idx_users_username (username),
  INDEX idx_users_role_id (role_id),
  INDEX idx_users_created_at (created_at),
  INDEX idx_users_is_active (is_active)
);

-- User sessions for tracking active sessions
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_jti VARCHAR(255) NOT NULL UNIQUE,  -- JWT JTI (issued at)
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_info JSONB,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_sessions_user_id (user_id),
  INDEX idx_user_sessions_expires_at (expires_at)
);

-- Login audit trail
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN DEFAULT FALSE,
  failure_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_login_attempts_user_id (user_id),
  INDEX idx_login_attempts_email (email),
  INDEX idx_login_attempts_created_at (created_at)
);

-- ============================================================================
-- CREATOR PROFILE & MONETIZATION
-- ============================================================================

CREATE TABLE creator_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(100),
  category VARCHAR(50),  -- fashion, beauty, tech, etc.
  follower_count INTEGER DEFAULT 0,
  bio TEXT,
  website_url TEXT,
  verified_at TIMESTAMP,
  is_verified_creator BOOLEAN DEFAULT FALSE,
  verification_badge BOOLEAN DEFAULT FALSE,
  
  -- Monetization
  bank_account_linked BOOLEAN DEFAULT FALSE,
  payout_method VARCHAR(50),  -- 'bank_transfer', 'upi', 'wallet'
  total_earnings DECIMAL(15, 2) DEFAULT 0,
  pending_earnings DECIMAL(15, 2) DEFAULT 0,
  last_payout_date TIMESTAMP,
  
  -- Stats
  total_posts INTEGER DEFAULT 0,
  total_reels INTEGER DEFAULT 0,
  total_stories INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5, 2),  -- percentage
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_creator_profiles_user_id (user_id),
  INDEX idx_creator_profiles_verified (is_verified_creator)
);

-- Creator analytics
CREATE TABLE creator_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Engagement metrics
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  likes_received INTEGER DEFAULT 0,
  comments_received INTEGER DEFAULT 0,
  shares_received INTEGER DEFAULT 0,
  
  -- Monetization metrics
  earnings DECIMAL(15, 2) DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(creator_id, date),
  INDEX idx_creator_analytics_creator_id (creator_id),
  INDEX idx_creator_analytics_date (date)
);

-- ============================================================================
-- SELLER/VENDOR PROFILE
-- ============================================================================

CREATE TABLE seller_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  shop_name VARCHAR(100) NOT NULL UNIQUE,
  shop_description TEXT,
  shop_logo_url TEXT,
  shop_banner_url TEXT,
  
  -- Verification status
  verification_status VARCHAR(50) DEFAULT 'pending',  -- pending, verified, rejected, suspended
  verification_document_url TEXT,
  verified_at TIMESTAMP,
  verification_rejected_reason TEXT,
  
  -- KYC Information
  business_type VARCHAR(50),  -- 'individual', 'partnership', 'company'
  gst_number VARCHAR(50) UNIQUE,
  pan_number VARCHAR(50) UNIQUE,
  business_address TEXT,
  business_email VARCHAR(100),
  business_phone VARCHAR(20),
  
  -- Financial
  bank_account_number VARCHAR(50),
  bank_ifsc_code VARCHAR(20),
  bank_account_holder_name VARCHAR(100),
  commission_percentage DECIMAL(5, 2) DEFAULT 15.0,
  total_sales DECIMAL(15, 2) DEFAULT 0,
  total_payouts DECIMAL(15, 2) DEFAULT 0,
  pending_payouts DECIMAL(15, 2) DEFAULT 0,
  
  -- Stats
  total_products INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  
  -- Contact
  phone_number VARCHAR(20),
  support_email VARCHAR(100),
  support_phone VARCHAR(20),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_seller_profiles_user_id (user_id),
  INDEX idx_seller_profiles_verification_status (verification_status)
);

-- Seller performance tracking
CREATE TABLE seller_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Performance metrics
  orders_count INTEGER DEFAULT 0,
  revenue DECIMAL(15, 2) DEFAULT 0,
  cancellation_rate DECIMAL(5, 2) DEFAULT 0,
  return_rate DECIMAL(5, 2) DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  customer_complaints INTEGER DEFAULT 0,
  
  -- Delivery performance
  on_time_delivery_rate DECIMAL(5, 2) DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(seller_id, date),
  INDEX idx_seller_performance_seller_id (seller_id),
  INDEX idx_seller_performance_date (date)
);

-- ============================================================================
-- CATEGORIES & PRODUCTS
-- ============================================================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) UNIQUE,
  description TEXT,
  icon_url TEXT,
  banner_url TEXT,
  parent_category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_categories_parent_id (parent_category_id),
  INDEX idx_categories_is_active (is_active)
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  
  -- Product info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  sku VARCHAR(100) UNIQUE,
  barcode VARCHAR(50),
  
  -- Pricing
  base_price DECIMAL(12, 2) NOT NULL,
  selling_price DECIMAL(12, 2) NOT NULL,
  cost_price DECIMAL(12, 2),
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  
  -- Media
  thumbnail_url TEXT,
  images JSONB,  -- Array of image URLs
  video_url TEXT,
  
  -- Inventory
  quantity_available INTEGER DEFAULT 0,
  quantity_sold INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending',  -- pending, approved, active, inactive, rejected
  is_featured BOOLEAN DEFAULT FALSE,
  is_on_sale BOOLEAN DEFAULT FALSE,
  
  -- Attributes
  attributes JSONB,  -- Flexible product attributes
  metadata JSONB,    -- Additional metadata
  
  -- Rating & Reviews
  average_rating DECIMAL(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  
  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  INDEX idx_products_seller_id (seller_id),
  INDEX idx_products_category_id (category_id),
  INDEX idx_products_status (status),
  INDEX idx_products_name (name),
  INDEX idx_products_sku (sku),
  INDEX idx_products_created_at (created_at)
);

-- Product variants
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku VARCHAR(100) UNIQUE,
  name VARCHAR(255),
  
  -- Pricing
  price DECIMAL(12, 2),
  cost_price DECIMAL(12, 2),
  
  -- Inventory
  quantity INTEGER DEFAULT 0,
  
  -- Attributes (size, color, etc.)
  attributes JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_product_variants_product_id (product_id)
);

-- ============================================================================
-- INVENTORY & STOCK
-- ============================================================================

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_location VARCHAR(100),
  quantity_on_hand INTEGER DEFAULT 0,
  quantity_reserved INTEGER DEFAULT 0,
  quantity_available INTEGER DEFAULT 0,
  
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id),
  INDEX idx_inventory_product_id (product_id)
);

-- Inventory history for audit trail
CREATE TABLE inventory_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50),  -- 'purchase', 'sale', 'return', 'adjustment', 'damaged'
  quantity_change INTEGER,
  reference_id UUID,  -- Links to order, return, etc.
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_inventory_history_product_id (product_id),
  INDEX idx_inventory_history_created_at (created_at)
);

-- ============================================================================
-- SHOPPING - CART, WISHLIST, CHECKOUT
-- ============================================================================

CREATE TABLE shopping_carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  added_price DECIMAL(12, 2),  -- Price at time of adding to cart
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id, variant_id),
  INDEX idx_shopping_carts_user_id (user_id)
);

CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  priority VARCHAR(50) DEFAULT 'medium',  -- low, medium, high
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id),
  INDEX idx_wishlists_user_id (user_id)
);

-- ============================================================================
-- ORDERS & PAYMENTS
-- ============================================================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES seller_profiles(id),
  
  -- Amounts
  subtotal DECIMAL(15, 2) NOT NULL,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  shipping_cost DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending',  -- pending, confirmed, processing, shipped, delivered, cancelled, returned
  payment_status VARCHAR(50) DEFAULT 'pending',  -- pending, completed, failed, refunded
  
  -- Shipping info
  shipping_address JSONB NOT NULL,
  billing_address JSONB,
  shipping_method VARCHAR(50),
  tracking_number VARCHAR(100),
  estimated_delivery_date DATE,
  actual_delivery_date TIMESTAMP,
  
  -- Customer notes
  customer_notes TEXT,
  admin_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_orders_user_id (user_id),
  INDEX idx_orders_seller_id (seller_id),
  INDEX idx_orders_status (status),
  INDEX idx_orders_payment_status (payment_status),
  INDEX idx_orders_order_number (order_number),
  INDEX idx_orders_created_at (created_at)
);

-- Order items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  discount_per_unit DECIMAL(12, 2) DEFAULT 0,
  tax_per_unit DECIMAL(12, 2) DEFAULT 0,
  subtotal DECIMAL(15, 2) NOT NULL,
  
  -- Fulfillment
  fulfillment_status VARCHAR(50) DEFAULT 'pending',  -- pending, fulfilled, cancelled, returned
  
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_order_items_order_id (order_id),
  INDEX idx_order_items_product_id (product_id)
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  payment_method VARCHAR(50),  -- 'card', 'upi', 'wallet', 'bank_transfer', 'cod'
  
  -- Payment gateway info
  payment_gateway VARCHAR(50),  -- 'razorpay', 'stripe', 'manual'
  gateway_transaction_id VARCHAR(255),
  gateway_response JSONB,
  
  status VARCHAR(50) DEFAULT 'pending',  -- pending, completed, failed, refunded, cancelled
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_payments_order_id (order_id),
  INDEX idx_payments_user_id (user_id),
  INDEX idx_payments_status (status)
);

-- Refunds
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id),
  
  reason VARCHAR(50),  -- 'quality_issue', 'wrong_item', 'customer_request', 'damaged'
  reason_notes TEXT,
  
  refund_amount DECIMAL(15, 2) NOT NULL,
  refund_status VARCHAR(50) DEFAULT 'pending',  -- pending, approved, completed, rejected
  
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_refunds_order_id (order_id),
  INDEX idx_refunds_refund_status (refund_status)
);

-- Returns
CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id),
  
  reason VARCHAR(50),  -- 'quality_issue', 'size_mismatch', 'not_as_described', 'changed_mind'
  reason_details TEXT,
  
  images JSONB,  -- Photos of the item being returned
  
  status VARCHAR(50) DEFAULT 'initiated',  -- initiated, approved, rejected, shipped, received, completed
  refund_amount DECIMAL(15, 2),
  
  pickup_address JSONB,
  shipping_carrier VARCHAR(50),
  return_tracking_number VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_returns_order_id (order_id),
  INDEX idx_returns_status (status)
);

-- ============================================================================
-- SOCIAL FEATURES
-- ============================================================================

-- Posts
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caption TEXT,
  
  -- Media
  image_urls JSONB,  -- Array of image URLs
  video_url TEXT,
  video_duration_seconds INTEGER,
  
  -- Privacy & visibility
  visibility VARCHAR(50) DEFAULT 'public',  -- public, followers_only, private
  is_archived BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  
  -- Engagement metrics (denormalized for performance)
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  
  -- SEO
  hashtags JSONB,  -- Array of hashtags used
  mentions JSONB,  -- Array of mentioned user IDs
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  INDEX idx_posts_creator_id (creator_id),
  INDEX idx_posts_created_at (created_at),
  INDEX idx_posts_visibility (visibility)
);

-- Stories
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Media
  media_url TEXT NOT NULL,
  media_type VARCHAR(20),  -- 'image', 'video'
  
  -- Story settings
  text_overlay TEXT,
  stickers JSONB,
  filters_applied JSONB,
  
  -- Visibility
  can_reply BOOLEAN DEFAULT TRUE,
  can_share BOOLEAN DEFAULT TRUE,
  hidden_viewers JSONB,  -- Users who cannot view
  
  -- Engagement
  views_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  
  -- Expiration
  expires_at TIMESTAMP NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_stories_creator_id (creator_id),
  INDEX idx_stories_expires_at (expires_at)
);

-- Reels
CREATE TABLE reels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Video info
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  
  caption TEXT,
  
  -- Engagement
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  
  -- Hashtags and trending
  hashtags JSONB,
  is_trending BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_reels_creator_id (creator_id),
  INDEX idx_reels_created_at (created_at),
  INDEX idx_reels_is_trending (is_trending)
);

-- Post likes
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id),
  INDEX idx_post_likes_post_id (post_id),
  INDEX idx_post_likes_user_id (user_id)
);

-- Post comments
CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,  -- For replies
  
  content TEXT NOT NULL,
  image_url TEXT,
  
  -- Engagement
  likes_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  INDEX idx_post_comments_post_id (post_id),
  INDEX idx_post_comments_author_id (author_id),
  INDEX idx_post_comments_parent_id (parent_comment_id)
);

-- Comment likes
CREATE TABLE comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Post shares
CREATE TABLE post_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- DM recipient
  share_message TEXT,
  shared_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_post_shares_post_id (post_id),
  INDEX idx_post_shares_shared_by (shared_by_user_id)
);

-- Followers/Following
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_by_follower BOOLEAN DEFAULT FALSE,  -- Follower blocked following
  blocked_by_following BOOLEAN DEFAULT FALSE,  -- Following blocked follower
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  INDEX idx_follows_follower_id (follower_id),
  INDEX idx_follows_following_id (following_id)
);

-- Saved posts
CREATE TABLE saved_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  collection_name VARCHAR(100) DEFAULT 'Saved',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, post_id),
  INDEX idx_saved_posts_user_id (user_id)
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  type VARCHAR(50),  -- 'like', 'comment', 'follow', 'order', 'message', 'announcement'
  title VARCHAR(255),
  message TEXT,
  
  -- Target resource
  reference_id UUID,  -- Links to post, order, etc.
  reference_type VARCHAR(50),  -- 'post', 'order', 'product', etc.
  
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_notifications_recipient_id (recipient_user_id),
  INDEX idx_notifications_is_read (is_read),
  INDEX idx_notifications_created_at (created_at)
);

-- Notification preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification types
  likes_enabled BOOLEAN DEFAULT TRUE,
  comments_enabled BOOLEAN DEFAULT TRUE,
  follows_enabled BOOLEAN DEFAULT TRUE,
  messages_enabled BOOLEAN DEFAULT TRUE,
  orders_enabled BOOLEAN DEFAULT TRUE,
  promotions_enabled BOOLEAN DEFAULT TRUE,
  
  -- Delivery channels
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  
  -- Frequency
  email_frequency VARCHAR(50) DEFAULT 'daily',  -- 'instant', 'daily', 'weekly', 'never'
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- MESSAGING & SUPPORT
-- ============================================================================

-- Direct messages
CREATE TABLE direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  message_text TEXT,
  media_url TEXT,
  
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_direct_messages_sender_id (sender_id),
  INDEX idx_direct_messages_recipient_id (recipient_id),
  INDEX idx_direct_messages_created_at (created_at)
);

-- Support tickets
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number VARCHAR(50) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  category VARCHAR(50),  -- 'product', 'order', 'payment', 'account', 'other'
  subject VARCHAR(255),
  description TEXT,
  
  status VARCHAR(50) DEFAULT 'open',  -- open, in_progress, waiting_customer, resolved, closed
  priority VARCHAR(50) DEFAULT 'normal',  -- low, normal, high, urgent
  
  attachments JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  
  INDEX idx_support_tickets_user_id (user_id),
  INDEX idx_support_tickets_status (status),
  INDEX idx_support_tickets_assigned_to (assigned_to_user_id)
);

-- Support ticket messages
CREATE TABLE support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  message TEXT NOT NULL,
  attachments JSONB,
  
  is_internal BOOLEAN DEFAULT FALSE,  -- Internal staff notes
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_support_ticket_messages_ticket_id (ticket_id),
  INDEX idx_support_ticket_messages_author_id (author_id)
);

-- ============================================================================
-- CONTENT MODERATION & COMPLIANCE
-- ============================================================================

-- Moderation queue
CREATE TABLE moderation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type VARCHAR(50),  -- 'post', 'comment', 'user', 'product'
  content_id UUID NOT NULL,
  
  reason_for_review VARCHAR(50),  -- 'reported', 'auto_flag', 'manual_review'
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  report_reason TEXT,
  
  status VARCHAR(50) DEFAULT 'pending',  -- pending, approved, rejected, escalated
  assigned_to_moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  moderator_notes TEXT,
  action_taken VARCHAR(50),  -- 'approved', 'rejected', 'hidden', 'deleted', 'suspended_user'
  
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  
  INDEX idx_moderation_queue_status (status),
  INDEX idx_moderation_queue_content_type (content_type),
  INDEX idx_moderation_queue_created_at (created_at)
);

-- User reports
CREATE TABLE user_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  reason VARCHAR(100),  -- 'harassment', 'spam', 'inappropriate_content', 'fraud'
  description TEXT,
  
  status VARCHAR(50) DEFAULT 'pending',  -- pending, investigating, resolved, dismissed
  
  action_taken VARCHAR(50),  -- 'none', 'warning', 'suspended', 'banned'
  
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  
  INDEX idx_user_reports_reported_user_id (reported_user_id),
  INDEX idx_user_reports_status (status)
);

-- ============================================================================
-- ANALYTICS & AUDIT
-- ============================================================================

-- Audit log for all critical actions
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,  -- 'create', 'update', 'delete', 'approve', etc.
  resource_type VARCHAR(50),  -- 'user', 'product', 'order', 'payment', etc.
  resource_id UUID,
  
  old_values JSONB,  -- Previous state
  new_values JSONB,  -- New state
  
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_audit_logs_actor_id (actor_user_id),
  INDEX idx_audit_logs_resource_type (resource_type),
  INDEX idx_audit_logs_created_at (created_at)
);

-- User behavior tracking
CREATE TABLE user_behavior (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  event_type VARCHAR(50),  -- 'view', 'search', 'add_to_cart', 'purchase', etc.
  event_data JSONB,
  
  referrer VARCHAR(255),
  device_type VARCHAR(50),  -- 'mobile', 'desktop', 'tablet'
  ip_address VARCHAR(45),
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_user_behavior_user_id (user_id),
  INDEX idx_user_behavior_event_type (event_type),
  INDEX idx_user_behavior_created_at (created_at)
);

-- Product view analytics
CREATE TABLE product_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  views_count INTEGER DEFAULT 0,
  cart_additions INTEGER DEFAULT 0,
  wishlist_additions INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  revenue DECIMAL(15, 2) DEFAULT 0,
  average_rating DECIMAL(3, 2),
  
  UNIQUE(product_id, date),
  INDEX idx_product_analytics_product_id (product_id),
  INDEX idx_product_analytics_date (date)
);

-- ============================================================================
-- MISCELLANEOUS
-- ============================================================================

-- Promotional campaigns
CREATE TABLE promotional_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  discount_type VARCHAR(50),  -- 'percentage', 'fixed', 'buy_one_get_one'
  discount_value DECIMAL(12, 2),
  
  applicable_categories JSONB,  -- Array of category IDs
  applicable_products JSONB,    -- Array of product IDs
  min_purchase_amount DECIMAL(12, 2),
  
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_promotional_campaigns_is_active (is_active),
  INDEX idx_promotional_campaigns_start_date (start_date)
);

-- Coupons
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) NOT NULL UNIQUE,
  campaign_id UUID REFERENCES promotional_campaigns(id) ON DELETE SET NULL,
  
  discount_type VARCHAR(50),
  discount_value DECIMAL(12, 2),
  
  min_purchase_amount DECIMAL(12, 2),
  max_discount_amount DECIMAL(12, 2),
  
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_coupons_code (code),
  INDEX idx_coupons_is_active (is_active)
);

-- Coupon usage
CREATE TABLE coupon_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  discount_applied DECIMAL(15, 2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_coupon_usage_coupon_id (coupon_id),
  INDEX idx_coupon_usage_user_id (user_id)
);

-- Reward points
CREATE TABLE reward_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  total_points INTEGER DEFAULT 0,
  available_points INTEGER DEFAULT 0,
  redeemed_points INTEGER DEFAULT 0,
  
  last_updated TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_reward_points_user_id (user_id)
);

-- Reward point transactions
CREATE TABLE reward_point_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  points_amount INTEGER,
  transaction_type VARCHAR(50),  -- 'earned', 'redeemed', 'expired', 'admin_adjusted'
  reference_id UUID,  -- Links to order, etc.
  reference_type VARCHAR(50),
  
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_reward_point_transactions_user_id (user_id),
  INDEX idx_reward_point_transactions_created_at (created_at)
);

-- System configurations
CREATE TABLE system_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT,
  value_type VARCHAR(50),  -- 'string', 'number', 'boolean', 'json'
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_system_configurations_config_key (config_key)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create additional indexes for better query performance
CREATE INDEX idx_posts_created_at_desc ON posts(created_at DESC);
CREATE INDEX idx_orders_created_at_desc ON orders(created_at DESC);
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);  -- For LIKE queries
CREATE INDEX idx_users_email_trgm ON users USING GIN (email gin_trgm_ops);

-- ============================================================================
-- TRIGGERS FOR MAINTENANCE
-- ============================================================================

-- Auto-update updated_at on table modifications
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-increment engagement metrics when likes/comments are added
CREATE OR REPLACE FUNCTION increment_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_likes_increment AFTER INSERT ON post_likes
FOR EACH ROW EXECUTE FUNCTION increment_post_likes_count();

-- Decrement on delete
CREATE OR REPLACE FUNCTION decrement_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_likes_decrement AFTER DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION decrement_post_likes_count();

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
