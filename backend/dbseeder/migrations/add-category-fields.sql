-- Migration: Add image, icon, description, and sort_order fields to categories table
-- This migration ensures categories have proper fields for displaying them in the UI

BEGIN;

-- Add new columns to categories table
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS image VARCHAR(500),
ADD COLUMN IF NOT EXISTS icon VARCHAR(100),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- Add comments for documentation
COMMENT ON COLUMN categories.image IS 'Category image URL/path (e.g., /uploads/categories/fashion.jpg)';
COMMENT ON COLUMN categories.icon IS 'Category icon class or emoji';
COMMENT ON COLUMN categories.sort_order IS 'Display order for categories';

COMMIT;
