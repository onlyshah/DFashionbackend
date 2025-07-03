-- =====================================================
-- DFashion PostgreSQL Database Setup with Complete Data
-- =====================================================
-- Run this script to create the complete database with all tables and seeded data
-- Usage: psql -U username -d database_name -f postgres_setup_with_data.sql

-- Create database (run this separately if needed)
-- CREATE DATABASE dfashion;
-- \c dfashion;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- DROP EXISTING TABLES (if they exist)
-- =====================================================
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS wishlist_items CASCADE;
DROP TABLE IF EXISTS wishlists CASCADE;
DROP TABLE IF EXISTS story_products CASCADE;
DROP TABLE IF EXISTS stories CASCADE;
DROP TABLE IF EXISTS post_products CASCADE;
DROP TABLE IF EXISTS post_likes CASCADE;
DROP TABLE IF EXISTS post_comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- CREATE TABLES
-- =====================================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'vendor', 'admin')),
    avatar TEXT,
    bio TEXT,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    image TEXT,
    parent_id UUID REFERENCES categories(id),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description TEXT,
    sku VARCHAR(100) UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    discount_percentage INTEGER DEFAULT 0,
    category_id UUID REFERENCES categories(id),
    vendor_id UUID REFERENCES users(id),
    brand VARCHAR(255),
    stock_quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 5,
    weight DECIMAL(8,2),
    dimensions JSONB,
    colors JSONB,
    sizes JSONB,
    materials JSONB,
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    rating_average DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    sale_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product images table
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text VARCHAR(255),
    is_primary BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posts table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    caption TEXT,
    media_type VARCHAR(20) CHECK (media_type IN ('image', 'video', 'carousel')),
    media_url TEXT,
    thumbnail_url TEXT,
    hashtags TEXT[],
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Post comments table
CREATE TABLE post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES post_comments(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Post likes table
CREATE TABLE post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

-- Post products table (for tagging products in posts)
CREATE TABLE post_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    position_x DECIMAL(5,2),
    position_y DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stories table
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    caption TEXT,
    media_type VARCHAR(20) CHECK (media_type IN ('image', 'video')),
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    background_color VARCHAR(7),
    text_color VARCHAR(7),
    is_active BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Story products table (for tagging products in stories)
CREATE TABLE story_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    position_x DECIMAL(5,2),
    position_y DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wishlists table
CREATE TABLE wishlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) DEFAULT 'My Wishlist',
    is_default BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wishlist items table
CREATE TABLE wishlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wishlist_id UUID REFERENCES wishlists(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wishlist_id, product_id)
);

-- Carts table
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'abandoned', 'converted')),
    total_amount DECIMAL(10,2) DEFAULT 0,
    item_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cart items table
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    selected_color VARCHAR(50),
    selected_size VARCHAR(20),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    shipping_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    shipping_address JSONB,
    billing_address JSONB,
    notes TEXT,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    selected_color VARCHAR(50),
    selected_size VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CREATE INDEXES
-- =====================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_vendor ON products(vendor_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_featured ON products(is_featured);
CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_active ON posts(is_active);
CREATE INDEX idx_stories_user ON stories(user_id);
CREATE INDEX idx_stories_active ON stories(is_active);
CREATE INDEX idx_stories_expires ON stories(expires_at);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_wishlist_items_wishlist ON wishlist_items(wishlist_id);

-- =====================================================
-- INSERT SEEDER DATA
-- =====================================================

-- Insert Users
INSERT INTO users (id, full_name, email, username, password, role, avatar, bio, phone, is_verified, follower_count, following_count) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Rajesh Kumar', 'rajesh@example.com', 'rajesh_kumar', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'Fashion enthusiast and style blogger', '+91-9876543210', true, 1250, 890),
('550e8400-e29b-41d4-a716-446655440002', 'Maya Fashion', 'maya@example.com', 'fashionista_maya', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'vendor', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', 'Premium fashion brand owner', '+91-9876543211', true, 25680, 1200),
('550e8400-e29b-41d4-a716-446655440003', 'Sarah Johnson', 'sarah@example.com', 'trendy_sarah', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'Trendsetter and fashion influencer', '+91-9876543212', true, 15420, 2100),
('550e8400-e29b-41d4-a716-446655440004', 'Mike Thompson', 'mike@example.com', 'fashion_forward_mike', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'Streetwear enthusiast', '+91-9876543213', true, 8900, 1500),
('550e8400-e29b-41d4-a716-446655440005', 'Emma Wilson', 'emma@example.com', 'chic_emma', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'Minimalist fashion lover', '+91-9876543214', true, 12300, 980);

-- Insert Categories
INSERT INTO categories (id, name, slug, description, image, is_active, sort_order) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'Women''s Clothing', 'womens-clothing', 'Latest fashion for women', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400', true, 1),
('650e8400-e29b-41d4-a716-446655440002', 'Men''s Clothing', 'mens-clothing', 'Stylish clothing for men', 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=400', true, 2),
('650e8400-e29b-41d4-a716-446655440003', 'Footwear', 'footwear', 'Shoes and sandals for all', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400', true, 3),
('650e8400-e29b-41d4-a716-446655440004', 'Accessories', 'accessories', 'Fashion accessories and jewelry', 'https://images.unsplash.com/photo-1506629905607-c52b1b8e8d19?w=400', true, 4),
('650e8400-e29b-41d4-a716-446655440005', 'Bags', 'bags', 'Handbags, backpacks and more', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', true, 5),
('650e8400-e29b-41d4-a716-446655440006', 'Dresses', 'dresses', 'Beautiful dresses for every occasion', 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400', true, 6),
('650e8400-e29b-41d4-a716-446655440007', 'Tops', 'tops', 'Trendy tops and blouses', 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400', true, 7),
('650e8400-e29b-41d4-a716-446655440008', 'Jeans', 'jeans', 'Comfortable and stylish jeans', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400', true, 8);

-- Insert Products
INSERT INTO products (id, name, slug, description, short_description, sku, price, original_price, discount_percentage, category_id, vendor_id, brand, stock_quantity, colors, sizes, tags, is_active, is_featured, rating_average, rating_count, view_count, sale_count) VALUES
('750e8400-e29b-41d4-a716-446655440001', 'Elegant Summer Dress', 'elegant-summer-dress', 'Beautiful flowy summer dress perfect for any occasion. Made with premium cotton blend fabric.', 'Beautiful flowy summer dress', 'ESD001', 2499.00, 3499.00, 29, '650e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', 'Maya Fashion', 25, '["Red", "Blue", "White", "Black"]', '["XS", "S", "M", "L", "XL"]', '{"summer", "dress", "elegant", "cotton"}', true, true, 4.5, 128, 1250, 89),
('750e8400-e29b-41d4-a716-446655440002', 'Designer Leather Jacket', 'designer-leather-jacket', 'Premium leather jacket with modern design. Perfect for casual and semi-formal occasions.', 'Premium leather jacket', 'DLJ002', 8999.00, 12999.00, 31, '650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Maya Fashion', 15, '["Black", "Brown", "Navy"]', '["S", "M", "L", "XL", "XXL"]', '{"leather", "jacket", "designer", "premium"}', true, true, 4.7, 95, 890, 67),
('750e8400-e29b-41d4-a716-446655440003', 'Floral Summer Dress', 'floral-summer-dress', 'Light and airy floral dress perfect for summer outings. Features beautiful botanical prints.', 'Light floral summer dress', 'FSD003', 3499.00, 4999.00, 30, '650e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', 'Maya Fashion', 30, '["Pink", "Yellow", "Green", "Purple"]', '["XS", "S", "M", "L"]', '{"floral", "summer", "dress", "botanical"}', true, false, 4.3, 76, 650, 45),
('750e8400-e29b-41d4-a716-446655440004', 'Premium Sneakers', 'premium-sneakers', 'High-quality sneakers with superior comfort and style. Perfect for daily wear and sports.', 'High-quality comfortable sneakers', 'PS004', 12999.00, 15999.00, 19, '650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'Maya Fashion', 40, '["White", "Black", "Gray", "Blue"]', '["6", "7", "8", "9", "10", "11", "12"]', '{"sneakers", "premium", "comfort", "sports"}', true, true, 4.6, 203, 1890, 156),
('750e8400-e29b-41d4-a716-446655440005', 'Minimalist Blazer', 'minimalist-blazer', 'Clean and sophisticated blazer for the modern professional. Versatile and timeless design.', 'Clean sophisticated blazer', 'MB005', 5999.00, 7999.00, 25, '650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Maya Fashion', 20, '["Black", "Navy", "Gray", "Beige"]', '["XS", "S", "M", "L", "XL"]', '{"blazer", "minimalist", "professional", "versatile"}', true, false, 4.4, 89, 720, 52),
('750e8400-e29b-41d4-a716-446655440006', 'Casual Cotton T-Shirt', 'casual-cotton-tshirt', 'Comfortable cotton t-shirt for everyday wear. Soft fabric with perfect fit.', 'Comfortable cotton t-shirt', 'CCT006', 899.00, 1299.00, 31, '650e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440002', 'Maya Fashion', 50, '["White", "Black", "Gray", "Navy", "Red"]', '["S", "M", "L", "XL", "XXL"]', '{"tshirt", "cotton", "casual", "comfortable"}', true, false, 4.2, 156, 980, 123),
('750e8400-e29b-41d4-a716-446655440007', 'Slim Fit Jeans', 'slim-fit-jeans', 'Modern slim fit jeans with stretch fabric. Perfect for casual and smart-casual looks.', 'Modern slim fit jeans', 'SFJ007', 2999.00, 3999.00, 25, '650e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440002', 'Maya Fashion', 35, '["Blue", "Black", "Gray", "Light Blue"]', '["28", "30", "32", "34", "36", "38", "40"]', '{"jeans", "slim", "stretch", "modern"}', true, true, 4.5, 189, 1340, 145),
('750e8400-e29b-41d4-a716-446655440008', 'Elegant Handbag', 'elegant-handbag', 'Stylish handbag made from premium materials. Perfect for work and special occasions.', 'Stylish premium handbag', 'EHB008', 4999.00, 6999.00, 29, '650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 'Maya Fashion', 18, '["Black", "Brown", "Tan", "Navy"]', '["One Size"]', '{"handbag", "elegant", "premium", "work"}', true, true, 4.6, 112, 890, 78),
('750e8400-e29b-41d4-a716-446655440009', 'Sports Running Shoes', 'sports-running-shoes', 'High-performance running shoes with advanced cushioning technology.', 'High-performance running shoes', 'SRS009', 7999.00, 9999.00, 20, '650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'Maya Fashion', 25, '["Black", "White", "Blue", "Red"]', '["6", "7", "8", "9", "10", "11", "12"]', '{"shoes", "running", "sports", "performance"}', true, false, 4.7, 234, 1560, 189),
('750e8400-e29b-41d4-a716-446655440010', 'Fashion Watch', 'fashion-watch', 'Elegant fashion watch with stainless steel band. Perfect accessory for any outfit.', 'Elegant fashion watch', 'FW010', 3499.00, 4999.00, 30, '650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'Maya Fashion', 22, '["Silver", "Gold", "Rose Gold", "Black"]', '["One Size"]', '{"watch", "fashion", "elegant", "accessory"}', true, false, 4.3, 98, 670, 67);

-- Insert Product Images
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order) VALUES
('750e8400-e29b-41d4-a716-446655440001', 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600', 'Elegant Summer Dress - Front View', true, 1),
('750e8400-e29b-41d4-a716-446655440001', 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w0NzEyNjZ8MHwxfHNlYXJjaHwyfHxzdW1tZXIlMjBkcmVzc3xlbnwwfDB8fHwxNjk0NTI2NDEx&ixlib=rb-4.0.3&q=80', 'Elegant Summer Dress - Side View', false, 2),
('750e8400-e29b-41d4-a716-446655440002', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600', 'Designer Leather Jacket - Front View', true, 1),
('750e8400-e29b-41d4-a716-446655440002', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w0NzEyNjZ8MHwxfHNlYXJjaHwyfHxsZWF0aGVyJTIwamFja2V0fGVufDB8MHx8fDE2OTQ1MjY0MTE&ixlib=rb-4.0.3&q=80', 'Designer Leather Jacket - Back View', false, 2),
('750e8400-e29b-41d4-a716-446655440003', 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600', 'Floral Summer Dress - Front View', true, 1),
('750e8400-e29b-41d4-a716-446655440004', 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=600', 'Premium Sneakers - Side View', true, 1),
('750e8400-e29b-41d4-a716-446655440005', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600', 'Minimalist Blazer - Front View', true, 1),
('750e8400-e29b-41d4-a716-446655440006', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600', 'Casual Cotton T-Shirt - Front View', true, 1),
('750e8400-e29b-41d4-a716-446655440007', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600', 'Slim Fit Jeans - Front View', true, 1),
('750e8400-e29b-41d4-a716-446655440008', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600', 'Elegant Handbag - Front View', true, 1),
('750e8400-e29b-41d4-a716-446655440009', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600', 'Sports Running Shoes - Side View', true, 1),
('750e8400-e29b-41d4-a716-446655440010', 'https://images.unsplash.com/photo-1506629905607-c52b1b8e8d19?w=600', 'Fashion Watch - Front View', true, 1);

-- Insert Stories
INSERT INTO stories (id, user_id, caption, media_type, media_url, thumbnail_url, is_active, view_count, expires_at) VALUES
('850e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'New summer collection is here! 🌞✨ #SummerFashion #NewCollection', 'image', 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400', 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=200', true, 1247, CURRENT_TIMESTAMP + INTERVAL '20 hours'),
('850e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'Street style inspiration 🔥 #StreetStyle #Fashion', 'image', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200', true, 892, CURRENT_TIMESTAMP + INTERVAL '18 hours'),
('850e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', 'Casual Friday vibes ✨ #CasualFriday #OOTD', 'image', 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400', 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=200', true, 1534, CURRENT_TIMESTAMP + INTERVAL '16 hours'),
('850e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', 'Minimalist fashion goals 💫 #Minimalist #Fashion', 'image', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200', true, 756, CURRENT_TIMESTAMP + INTERVAL '14 hours'),
('850e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'Weekend outfit ready! 🎉 #WeekendVibes #Fashion', 'image', 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=400', 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=200', true, 2103, CURRENT_TIMESTAMP + INTERVAL '12 hours');

-- Insert Story Products (tagging products in stories)
INSERT INTO story_products (story_id, product_id, position_x, position_y) VALUES
('850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 20.5, 70.2),
('850e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440002', 15.8, 65.4),
('850e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440003', 25.3, 75.1),
('850e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440005', 18.7, 68.9),
('850e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440004', 22.1, 72.6);

-- Insert Posts
INSERT INTO posts (id, user_id, caption, media_type, media_url, thumbnail_url, hashtags, location, like_count, comment_count, share_count, view_count) VALUES
('950e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Excited to share our latest summer collection! Each piece is carefully crafted with love and attention to detail. What''s your favorite? 💕', 'image', 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600', 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=300', '{"SummerFashion", "NewCollection", "Fashion", "Style"}', 'Mumbai, India', 234, 45, 12, 2890),
('950e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'Street style meets elegance. Sometimes the best outfits are the ones that make you feel confident and comfortable. 🌟', 'image', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300', '{"StreetStyle", "Fashion", "OOTD", "Confidence"}', 'Delhi, India', 189, 32, 8, 1567),
('950e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', 'Casual Friday done right! This outfit is perfect for work and weekend hangouts. Versatility is key! ✨', 'image', 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600', 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=300', '{"CasualFriday", "WorkWear", "Versatile", "Fashion"}', 'Bangalore, India', 156, 28, 6, 1234),
('950e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', 'Less is more. Embracing minimalist fashion and loving every moment of it. Clean lines, neutral colors, timeless pieces. 🤍', 'image', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=300', '{"Minimalist", "Fashion", "Timeless", "Style"}', 'Chennai, India', 203, 41, 15, 1890),
('950e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'Weekend adventures call for comfortable yet stylish outfits. Ready to explore the city! 🏙️', 'image', 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=600', 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=300', '{"WeekendVibes", "Adventure", "Comfortable", "Style"}', 'Pune, India', 178, 35, 9, 1456);

-- Insert Post Products (tagging products in posts)
INSERT INTO post_products (post_id, product_id, position_x, position_y) VALUES
('950e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 25.5, 65.2),
('950e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440002', 20.8, 70.4),
('950e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440003', 30.3, 60.1),
('950e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440005', 22.7, 75.9),
('950e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440004', 28.1, 68.6);

-- Insert Post Likes
INSERT INTO post_likes (post_id, user_id) VALUES
('950e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001'),
('950e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003'),
('950e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004'),
('950e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001'),
('950e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002'),
('950e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002'),
('950e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005'),
('950e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001'),
('950e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002');

-- Insert Post Comments
INSERT INTO post_comments (post_id, user_id, content) VALUES
('950e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Love this collection! The summer dress is absolutely gorgeous 😍'),
('950e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'Amazing quality as always! Can''t wait to get mine 💕'),
('950e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Your style is always on point! 🔥'),
('950e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005', 'Perfect for work meetings! Where did you get this?'),
('950e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'Minimalist fashion done right! Love the clean aesthetic ✨'),
('950e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 'Those sneakers look so comfortable! Perfect for city walks 👟');

-- Insert Wishlists
INSERT INTO wishlists (id, user_id, name, is_default, is_public) VALUES
('a50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'My Wishlist', true, false),
('a50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'Summer Favorites', true, true),
('a50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', 'Work Wardrobe', true, false),
('a50e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', 'Minimalist Collection', true, true);

-- Insert Wishlist Items
INSERT INTO wishlist_items (wishlist_id, product_id) VALUES
('a50e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001'),
('a50e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440002'),
('a50e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440008'),
('a50e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001'),
('a50e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440003'),
('a50e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440005'),
('a50e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440006'),
('a50e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440005'),
('a50e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440010');

-- Insert Carts
INSERT INTO carts (id, user_id, status, total_amount, item_count) VALUES
('b50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'active', 11498.00, 3),
('b50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'active', 5998.00, 2),
('b50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', 'active', 2999.00, 1);

-- Insert Cart Items
INSERT INTO cart_items (cart_id, product_id, quantity, price, selected_color, selected_size) VALUES
('b50e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 1, 2499.00, 'Blue', 'M'),
('b50e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440002', 1, 8999.00, 'Black', 'L'),
('b50e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440003', 1, 3499.00, 'Pink', 'S'),
('b50e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', 1, 2499.00, 'Red', 'L'),
('b50e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440007', 1, 2999.00, 'Blue', '32');

-- Insert Orders
INSERT INTO orders (id, user_id, order_number, status, payment_status, payment_method, subtotal, tax_amount, shipping_amount, total_amount, shipping_address, billing_address) VALUES
('c50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'ORD-2024-001', 'delivered', 'paid', 'credit_card', 11498.00, 1149.80, 99.00, 12746.80, '{"name": "Rajesh Kumar", "address": "123 Fashion Street", "city": "Mumbai", "state": "Maharashtra", "pincode": "400001", "phone": "+91-9876543210"}', '{"name": "Rajesh Kumar", "address": "123 Fashion Street", "city": "Mumbai", "state": "Maharashtra", "pincode": "400001", "phone": "+91-9876543210"}'),
('c50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'ORD-2024-002', 'shipped', 'paid', 'upi', 5998.00, 599.80, 99.00, 6696.80, '{"name": "Sarah Johnson", "address": "456 Style Avenue", "city": "Delhi", "state": "Delhi", "pincode": "110001", "phone": "+91-9876543212"}', '{"name": "Sarah Johnson", "address": "456 Style Avenue", "city": "Delhi", "state": "Delhi", "pincode": "110001", "phone": "+91-9876543212"}'),
('c50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', 'ORD-2024-003', 'processing', 'paid', 'debit_card', 2999.00, 299.90, 99.00, 3397.90, '{"name": "Mike Thompson", "address": "789 Trend Road", "city": "Bangalore", "state": "Karnataka", "pincode": "560001", "phone": "+91-9876543213"}', '{"name": "Mike Thompson", "address": "789 Trend Road", "city": "Bangalore", "state": "Karnataka", "pincode": "560001", "phone": "+91-9876543213"}');

-- Insert Order Items
INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, total_price, selected_color, selected_size) VALUES
('c50e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 'Elegant Summer Dress', 'ESD001', 1, 2499.00, 2499.00, 'Blue', 'M'),
('c50e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440002', 'Designer Leather Jacket', 'DLJ002', 1, 8999.00, 8999.00, 'Black', 'L'),
('c50e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440003', 'Floral Summer Dress', 'FSD003', 1, 3499.00, 3499.00, 'Pink', 'S'),
('c50e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', 'Elegant Summer Dress', 'ESD001', 1, 2499.00, 2499.00, 'Red', 'L'),
('c50e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440007', 'Slim Fit Jeans', 'SFJ007', 1, 2999.00, 2999.00, 'Blue', '32');

-- =====================================================
-- UPDATE SEQUENCES AND FINAL SETUP
-- =====================================================

-- Update updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wishlists_updated_at BEFORE UPDATE ON wishlists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON carts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Show summary of inserted data
SELECT 'Users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'Categories', COUNT(*) FROM categories
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Product Images', COUNT(*) FROM product_images
UNION ALL
SELECT 'Stories', COUNT(*) FROM stories
UNION ALL
SELECT 'Posts', COUNT(*) FROM posts
UNION ALL
SELECT 'Wishlists', COUNT(*) FROM wishlists
UNION ALL
SELECT 'Wishlist Items', COUNT(*) FROM wishlist_items
UNION ALL
SELECT 'Carts', COUNT(*) FROM carts
UNION ALL
SELECT 'Cart Items', COUNT(*) FROM cart_items
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Order Items', COUNT(*) FROM order_items;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT '🎉 DFashion PostgreSQL Database Setup Complete! 🎉' as message,
       'Database is ready with all tables and seeded data' as status,
       'You can now connect your application to this database' as next_step;

-- =====================================================
-- LOGIN CREDENTIALS FOR TESTING
-- =====================================================

SELECT 'LOGIN CREDENTIALS' as info,
       'Email: rajesh@example.com, Password: password123 (User)' as user_account,
       'Email: maya@example.com, Password: password123 (Vendor)' as vendor_account;
