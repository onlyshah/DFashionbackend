-- =====================================================
-- DFashion PostgreSQL Migration - Add SubCategories Table
-- =====================================================
-- This migration adds sub_categories table with proper relationships

-- Create sub_categories table
CREATE TABLE IF NOT EXISTS sub_categories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200),
    description TEXT,
    image VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, slug)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sub_categories_category_id ON sub_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_sub_categories_slug ON sub_categories(slug);
CREATE INDEX IF NOT EXISTS idx_sub_categories_is_active ON sub_categories(is_active);

-- Add comment to table
COMMENT ON TABLE sub_categories IS 'Subcategories for products, linked to main categories';
COMMENT ON COLUMN sub_categories.category_id IS 'Foreign key reference to categories table';
COMMENT ON COLUMN sub_categories.slug IS 'URL-friendly identifier, unique per category';
