#!/bin/bash

# =====================================================
# DFashion PostgreSQL Database Setup Script
# =====================================================
# This script sets up the complete DFashion database with all data
# 
# Prerequisites:
# - PostgreSQL installed and running
# - psql command available
# - Database user with CREATE privileges
#
# Usage:
# chmod +x setup_database.sh
# ./setup_database.sh

echo "🚀 Setting up DFashion PostgreSQL Database..."
echo "=============================================="

# Configuration
DB_NAME="dfashion"
DB_USER="postgres"  # Change this to your PostgreSQL username
DB_HOST="localhost"
DB_PORT="5432"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if PostgreSQL is running
print_status "Checking PostgreSQL connection..."
if ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER > /dev/null 2>&1; then
    print_error "Cannot connect to PostgreSQL. Please ensure PostgreSQL is running."
    print_error "Host: $DB_HOST, Port: $DB_PORT, User: $DB_USER"
    exit 1
fi
print_success "PostgreSQL is running and accessible"

# Check if database exists
print_status "Checking if database '$DB_NAME' exists..."
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    print_warning "Database '$DB_NAME' already exists"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Dropping existing database..."
        dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
        print_success "Database dropped"
    else
        print_warning "Using existing database. Data may be duplicated."
    fi
fi

# Create database if it doesn't exist
if ! psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    print_status "Creating database '$DB_NAME'..."
    createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
    print_success "Database '$DB_NAME' created"
fi

# Run the setup script
print_status "Running database setup script..."
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f postgres_setup_with_data.sql; then
    print_success "Database setup completed successfully!"
else
    print_error "Database setup failed. Please check the error messages above."
    exit 1
fi

echo ""
echo "=============================================="
print_success "🎉 DFashion Database Setup Complete! 🎉"
echo "=============================================="
echo ""
print_status "Database Details:"
echo "  📍 Host: $DB_HOST"
echo "  🔌 Port: $DB_PORT"
echo "  🗄️  Database: $DB_NAME"
echo "  👤 User: $DB_USER"
echo ""
print_status "🔑 Login Credentials for Testing:"
echo "  👤 User Account:"
echo "     📧 Email: rajesh@example.com"
echo "     🔒 Password: password123"
echo ""
echo "  🏪 Vendor Account:"
echo "     📧 Email: maya@example.com"
echo "     🔒 Password: password123"
echo ""
print_status "📊 Database contains:"
echo "  • 5 Users (including vendors and customers)"
echo "  • 8 Product Categories"
echo "  • 10 Products with images"
echo "  • 5 Stories with product tags"
echo "  • 5 Posts with product tags"
echo "  • Wishlists, Carts, and Orders"
echo "  • Complete relational data structure"
echo ""
print_success "Your DFashion database is ready to use!"
echo "You can now update your application's database connection string."
echo ""
