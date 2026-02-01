// Database setup script
require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URI || 'postgres://postgres:1234@localhost:5432/dfashion'
});

async function setupDatabase() {
  try {
    await client.connect();
    console.log('Connected to dfashion database');

    // First, drop all tables in reverse dependency order
    await client.query('DROP TABLE IF EXISTS productshares CASCADE;');
    await client.query('DROP TABLE IF EXISTS product_images CASCADE;');
    await client.query('DROP TABLE IF EXISTS products CASCADE;');
    await client.query('DROP TABLE IF EXISTS categories CASCADE;');
    await client.query('DROP TABLE IF EXISTS users CASCADE;');

    // Create tables in correct order
    await client.query(`
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
);`);

    await client.query(`
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
);`);

    await client.query(`
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
);`);

    await client.query(`
CREATE TABLE productshares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);

    console.log('Tables created successfully');

    // Insert sample data
    await client.query(`
INSERT INTO users (id, full_name, email, username, password, role, avatar, bio, phone, is_verified, follower_count, following_count) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Rajesh Kumar', 'rajesh@example.com', 'rajesh_kumar', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'Fashion enthusiast and style blogger', '+91-9876543210', true, 1250, 890),
('550e8400-e29b-41d4-a716-446655440002', 'Maya Fashion', 'maya@example.com', 'fashionista_maya', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'vendor', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', 'Premium fashion brand owner', '+91-9876543211', true, 25680, 1200),
('550e8400-e29b-41d4-a716-446655440003', 'Sarah Johnson', 'sarah@example.com', 'trendy_sarah', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'Trendsetter and fashion influencer', '+91-9876543212', true, 15420, 2100),
('550e8400-e29b-41d4-a716-446655440004', 'Mike Thompson', 'mike@example.com', 'fashion_forward_mike', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'Streetwear enthusiast', '+91-9876543213', true, 8900, 1500),
('550e8400-e29b-41d4-a716-446655440005', 'Emma Wilson', 'emma@example.com', 'chic_emma', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'Minimalist fashion lover', '+91-9876543214', true, 12300, 980);
`);

    await client.query(`
INSERT INTO categories (id, name, slug, description, image, is_active, sort_order) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'Women''s Clothing', 'womens-clothing', 'Latest fashion for women', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400', true, 1),
('650e8400-e29b-41d4-a716-446655440002', 'Men''s Clothing', 'mens-clothing', 'Stylish clothing for men', 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=400', true, 2),
('650e8400-e29b-41d4-a716-446655440003', 'Footwear', 'footwear', 'Shoes and sandals for all', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400', true, 3),
('650e8400-e29b-41d4-a716-446655440004', 'Accessories', 'accessories', 'Fashion accessories and jewelry', 'https://images.unsplash.com/photo-1506629905607-c52b1b8e8d19?w=400', true, 4),
('650e8400-e29b-41d4-a716-446655440005', 'Bags', 'bags', 'Handbags, backpacks and more', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', true, 5);
`);

    await client.query(`
INSERT INTO products (id, name, slug, description, short_description, sku, price, original_price, discount_percentage, category_id, vendor_id, brand, stock_quantity, colors, sizes, tags, is_active, is_featured, rating_average, rating_count, view_count, sale_count) VALUES
('750e8400-e29b-41d4-a716-446655440001', 'Elegant Summer Dress', 'elegant-summer-dress', 'Beautiful flowy summer dress perfect for any occasion. Made with premium cotton blend fabric.', 'Beautiful flowy summer dress', 'ESD001', 2499.00, 3499.00, 29, '650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Maya Fashion', 25, '["Red", "Blue", "White", "Black"]', '["XS", "S", "M", "L", "XL"]', '{"summer", "dress", "elegant", "cotton"}', true, true, 4.5, 128, 1250, 89),
('750e8400-e29b-41d4-a716-446655440002', 'Designer Leather Jacket', 'designer-leather-jacket', 'Premium leather jacket with modern design. Perfect for casual and semi-formal occasions.', 'Premium leather jacket', 'DLJ002', 8999.00, 12999.00, 31, '650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Maya Fashion', 15, '["Black", "Brown", "Navy"]', '["S", "M", "L", "XL", "XXL"]', '{"leather", "jacket", "designer", "premium"}', true, true, 4.7, 95, 890, 67),
('750e8400-e29b-41d4-a716-446655440003', 'Floral Summer Dress', 'floral-summer-dress', 'Light and airy floral dress perfect for summer outings. Features beautiful botanical prints.', 'Light floral summer dress', 'FSD003', 3499.00, 4999.00, 30, '650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Maya Fashion', 30, '["Pink", "Yellow", "Green", "Purple"]', '["XS", "S", "M", "L"]', '{"floral", "summer", "dress", "botanical"}', true, false, 4.3, 76, 650, 45),
('750e8400-e29b-41d4-a716-446655440004', 'Premium Sneakers', 'premium-sneakers', 'High-quality sneakers with superior comfort and style. Perfect for daily wear and sports.', 'High-quality comfortable sneakers', 'PS004', 12999.00, 15999.00, 19, '650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'Maya Fashion', 40, '["White", "Black", "Gray", "Blue"]', '["6", "7", "8", "9", "10", "11", "12"]', '{"sneakers", "premium", "comfort", "sports"}', true, true, 4.6, 203, 1890, 156),
('750e8400-e29b-41d4-a716-446655440005', 'Minimalist Blazer', 'minimalist-blazer', 'Clean and sophisticated blazer for the modern professional. Versatile and timeless design.', 'Clean sophisticated blazer', 'MB005', 5999.00, 7999.00, 25, '650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Maya Fashion', 20, '["Black", "Navy", "Gray", "Beige"]', '["XS", "S", "M", "L", "XL"]', '{"blazer", "minimalist", "professional", "versatile"}', true, false, 4.4, 89, 720, 52);
`);

    console.log('Sample data inserted successfully');

    // Now create some orders
    await client.query(`
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    shipping_address JSONB,
    billing_address JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);

    await client.query(`
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    size VARCHAR(50),
    color VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);

    // Insert sample orders
    await client.query(`
INSERT INTO orders (id, user_id, order_number, total_amount, status, payment_status, payment_method, shipping_address) VALUES
('850e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'ORD1001', 2499.00, 'delivered', 'paid', 'card', '{"fullName": "Rajesh Kumar", "phone": "+91-9876543210", "addressLine1": "123 Main St", "city": "Mumbai", "state": "Maharashtra", "postalCode": "400001", "country": "India"}'),
('850e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'ORD1002', 8999.00, 'shipped', 'paid', 'upi', '{"fullName": "Sarah Johnson", "phone": "+91-9876543212", "addressLine1": "456 Fashion Ave", "city": "Delhi", "state": "Delhi", "postalCode": "110001", "country": "India"}'),
('850e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', 'ORD1003', 12999.00, 'processing', 'paid', 'netbanking', '{"fullName": "Mike Thompson", "phone": "+91-9876543213", "addressLine1": "789 Style Blvd", "city": "Bangalore", "state": "Karnataka", "postalCode": "560001", "country": "India"}'),
('850e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', 'ORD1004', 5999.00, 'confirmed', 'paid', 'wallet', '{"fullName": "Emma Wilson", "phone": "+91-9876543214", "addressLine1": "321 Chic Lane", "city": "Chennai", "state": "Tamil Nadu", "postalCode": "600001", "country": "India"}'),
('850e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'ORD1005', 3499.00, 'pending', 'pending', 'cod', '{"fullName": "Rajesh Kumar", "phone": "+91-9876543210", "addressLine1": "123 Main St", "city": "Mumbai", "state": "Maharashtra", "postalCode": "400001", "country": "India"}');
`);

    await client.query(`
INSERT INTO order_items (order_id, product_id, quantity, price, size, color) VALUES
('850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 1, 2499.00, 'M', 'Red'),
('850e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440002', 1, 8999.00, 'L', 'Black'),
('850e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440004', 1, 12999.00, '10', 'White'),
('850e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440005', 1, 5999.00, 'M', 'Black'),
('850e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440003', 1, 3499.00, 'S', 'Pink');
`);

    console.log('Orders and order items inserted successfully');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

setupDatabase();