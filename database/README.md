# DFashion PostgreSQL Database Setup

This directory contains everything you need to set up a complete PostgreSQL database for the DFashion e-commerce application with all seeded data.

## 📁 Files Included

- `postgres_setup_with_data.sql` - Complete SQL script with tables and data
- `setup_database.sh` - Linux/macOS setup script
- `setup_database.bat` - Windows setup script
- `README.md` - This documentation

## 🚀 Quick Setup

### Option 1: Automated Setup (Recommended)

#### For Linux/macOS:
```bash
cd database
chmod +x setup_database.sh
./setup_database.sh
```

#### For Windows:
```cmd
cd database
setup_database.bat
```

### Option 2: Manual Setup

1. **Create Database:**
   ```sql
   CREATE DATABASE dfashion;
   ```

2. **Run SQL Script:**
   ```bash
   psql -U your_username -d dfashion -f postgres_setup_with_data.sql
   ```

## 📋 Prerequisites

- PostgreSQL 12+ installed and running
- `psql` command available in PATH
- Database user with CREATE privileges
- Sufficient disk space (approximately 50MB for data)

## 🗄️ Database Schema

The script creates the following tables:

### Core Tables
- **users** - User accounts (customers, vendors, admins)
- **categories** - Product categories
- **products** - Product catalog
- **product_images** - Product image URLs

### Social Features
- **stories** - Instagram-like stories
- **posts** - Social media posts
- **post_comments** - Comments on posts
- **post_likes** - Post likes
- **story_products** - Products tagged in stories
- **post_products** - Products tagged in posts

### E-commerce Features
- **wishlists** - User wishlists
- **wishlist_items** - Items in wishlists
- **carts** - Shopping carts
- **cart_items** - Items in carts
- **orders** - Order history
- **order_items** - Items in orders

## 📊 Seeded Data

The database comes pre-populated with:

- **5 Users** (including vendors and customers)
- **8 Product Categories** (Women's Clothing, Men's Clothing, Footwear, etc.)
- **10 Products** with complete details and images
- **5 Stories** with product tags
- **5 Posts** with likes, comments, and product tags
- **Sample Wishlists, Carts, and Orders**

## 🔑 Test Credentials

### User Account
- **Email:** `rajesh@example.com`
- **Password:** `password123`
- **Role:** User

### Vendor Account
- **Email:** `maya@example.com`
- **Password:** `password123`
- **Role:** Vendor

### Additional Test Users
- **sarah@example.com** / password123 (User)
- **mike@example.com** / password123 (User)
- **emma@example.com** / password123 (User)

## 🔧 Configuration

### Database Connection String Examples

#### Node.js (pg)
```javascript
const config = {
  host: 'localhost',
  port: 5432,
  database: 'dfashion',
  user: 'your_username',
  password: 'your_password'
};
```

#### Environment Variables
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dfashion
DB_USER=your_username
DB_PASSWORD=your_password
```

## 🔍 Verification

After setup, you can verify the installation:

```sql
-- Check all tables
\dt

-- Count records in each table
SELECT 'users' as table_name, COUNT(*) as records FROM users
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'stories', COUNT(*) FROM stories
UNION ALL
SELECT 'posts', COUNT(*) FROM posts;

-- Test login
SELECT * FROM users WHERE email = 'rajesh@example.com';
```

## 🛠️ Customization

### Adding More Data
You can extend the SQL script to add more:
- Products and categories
- User accounts
- Stories and posts
- Sample orders

### Modifying Schema
The script includes proper indexes and constraints. When modifying:
1. Update the table definitions
2. Adjust the seeded data accordingly
3. Update any dependent queries

## 🔒 Security Notes

- **Change default passwords** in production
- **Use environment variables** for database credentials
- **Enable SSL** for database connections in production
- **Restrict database access** to application servers only

## 📈 Performance

The script includes optimized indexes for:
- User lookups (email, username)
- Product searches (category, vendor, active status)
- Social features (user posts, story expiration)
- E-commerce queries (cart items, order history)

## 🐛 Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   chmod +x setup_database.sh
   ```

2. **PostgreSQL Not Running**
   ```bash
   # Linux/macOS
   sudo service postgresql start
   
   # Windows
   net start postgresql-x64-12
   ```

3. **Database Already Exists**
   - The script will prompt to drop and recreate
   - Or manually: `DROP DATABASE dfashion;`

4. **Connection Refused**
   - Check PostgreSQL is running
   - Verify host, port, and credentials
   - Check firewall settings

## 📞 Support

If you encounter issues:
1. Check the error messages in the console
2. Verify PostgreSQL installation and configuration
3. Ensure all prerequisites are met
4. Check database logs for detailed error information

---

**🎉 Your DFashion database is ready to power your e-commerce application!**
