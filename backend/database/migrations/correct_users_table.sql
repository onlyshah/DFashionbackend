-- Correct Users Table Schema to Match Sequelize Model
-- Run this in psql: psql -U postgres -d dfashion -f correct_users_table.sql

DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(150),
    avatar_url VARCHAR(255),
    bio VARCHAR(255),
    role_id UUID NOT NULL,
    role VARCHAR(50),
    department_id UUID,
    department VARCHAR(50),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    email_verified_at TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    reset_password_token VARCHAR(255),
    reset_password_expiry TIMESTAMP,
    last_login_at TIMESTAMP,
    last_activity_at TIMESTAMP,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);