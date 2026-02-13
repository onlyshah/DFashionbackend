-- Database Migration for Authentication & Password Reset
-- Run this migration to update your existing database schema

-- PostgreSQL Migration
-- For MySQL, adjust data types accordingly

-- Add columns to users table if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expiry TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_reset_password_token ON users(reset_password_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_password_expiry ON users(reset_password_expiry);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create table for tracking password reset attempts (optional, for security logging)
CREATE TABLE IF NOT EXISTS password_reset_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20), -- 'requested', 'completed', 'expired', 'failed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for password reset logs
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_user_id ON password_reset_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_token_hash ON password_reset_logs(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_created_at ON password_reset_logs(created_at);

-- Create table for audit logging (optional, for security auditing)
CREATE TABLE IF NOT EXISTS auth_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255),
    action VARCHAR(50), -- 'login', 'logout', 'register', 'password_reset_requested', 'password_reset_completed', 'login_failed'
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20), -- 'success', 'failed', 'blocked'
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for auth audit logs
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_id ON auth_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_action ON auth_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_created_at ON auth_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_ip_address ON auth_audit_logs(ip_address);

-- Create roles table if not exists (for role management)
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    level INT DEFAULT 4,
    is_system_role BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create permissions table if not exists
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    module VARCHAR(100) NOT NULL,
    actions TEXT[], -- Array of actions: 'create', 'read', 'update', 'delete', etc.
    is_system_permission BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    is_granted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- Create user_roles junction table if not exists
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(user_id, role_id)
);

-- Create indexes for role tables
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- Insert default system roles (optional)
INSERT INTO roles (name, display_name, description, level, is_system_role, is_active) 
VALUES 
    ('super_admin', 'Super Administrator', 'Full system access and control', 1, TRUE, TRUE),
    ('admin', 'Administrator', 'Administrative access to core features', 2, TRUE, TRUE),
    ('manager', 'Manager', 'Management access to assigned areas', 2, TRUE, TRUE),
    ('vendor', 'Vendor', 'Vendor-specific features and product management', 3, TRUE, TRUE),
    ('customer', 'Customer', 'Customer shopping and social features', 4, TRUE, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insert default system permissions (optional)
INSERT INTO permissions (name, display_name, description, module, actions, is_system_permission, is_active)
VALUES 
    ('users_view', 'View Users', 'View user profiles and information', 'users', ARRAY['read'], TRUE, TRUE),
    ('users_manage', 'Manage Users', 'Create, edit, and delete users', 'users', ARRAY['create', 'read', 'update', 'delete'], TRUE, TRUE),
    ('roles_manage', 'Manage Roles', 'Create and modify roles and permissions', 'roles', ARRAY['create', 'read', 'update', 'delete', 'manage'], TRUE, TRUE),
    ('products_view', 'View Products', 'View product catalog', 'products', ARRAY['read'], TRUE, TRUE),
    ('products_manage', 'Manage Products', 'Create, edit, delete products', 'products', ARRAY['create', 'read', 'update', 'delete'], TRUE, TRUE),
    ('orders_view', 'View Orders', 'View orders', 'orders', ARRAY['read'], TRUE, TRUE),
    ('orders_manage', 'Manage Orders', 'Manage orders', 'orders', ARRAY['read', 'update'], TRUE, TRUE),
    ('analytics_view', 'View Analytics', 'View analytics and reports', 'analytics', ARRAY['read'], TRUE, TRUE),
    ('content_manage', 'Manage Content', 'Create and manage content', 'content', ARRAY['create', 'read', 'update', 'delete'], TRUE, TRUE),
    ('settings_manage', 'Manage Settings', 'Configure system settings', 'settings', ARRAY['read', 'update', 'manage'], TRUE, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Clean up old reset tokens (run periodically or in migration)
-- DELETE FROM password_reset_logs WHERE expires_at < NOW();

-- Verify migration
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND column_name IN ('reset_password_token', 'reset_password_expiry', 'last_login')
ORDER BY ordinal_position;

-- MySQL Migration (Alternative)
/*
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expiry DATETIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login DATETIME;

CREATE INDEX idx_users_reset_password_token ON users(reset_password_token);
CREATE INDEX idx_users_reset_password_expiry ON users(reset_password_expiry);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Rest of the tables can be created similarly with MySQL syntax
-- Adjust data types like TIMESTAMP -> DATETIME, SERIAL -> INT AUTO_INCREMENT, etc.
*/
