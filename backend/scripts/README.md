# DFashion Comprehensive Database Seeder

This script creates real, production-ready data for all database tables with proper relationships and 10+ records each.

## 🚀 Quick Start

```bash
# Navigate to backend directory
cd backend

# Run the seeder
npm run seed

# Start the backend server
npm start
```

## 📊 What Gets Created

### 👥 Users (11 records)
- **10 customers** - Rajesh Kumar, Priya Sharma, Amit Singh, Kavya Reddy, Arjun Mehta, Sneha Patel, Rohit Gupta, Ananya Joshi, Vikram Shah, Meera Nair
- **1 vendor** - DFashion Store

**Password for all users:** `password123`

### 📂 Categories (10 records)
1. **Men** - Fashion and accessories for men
2. **Women** - Fashion and accessories for women
3. **Children** - Fashion for kids and children
4. **Accessories** - Fashion accessories and jewelry
5. **Footwear** - Shoes and footwear for all
6. **Ethnic Wear** - Traditional and ethnic clothing
7. **Sportswear** - Athletic and sports clothing
8. **Winter Wear** - Warm clothing for winter season
9. **Summer Collection** - Light and breezy summer clothing
10. **Formal Wear** - Professional and formal clothing

### 🛍️ Products (15 records)
1. **Premium Cotton T-Shirt** - ₹899 (Men's, 31% off)
2. **Elegant Summer Dress** - ₹2,499 (Women's, 29% off)
3. **Classic Denim Jeans** - ₹2,999 (Men's, 25% off)
4. **Leather Handbag** - ₹4,999 (Women's, 29% off)
5. **Sports Running Shoes** - ₹3,999 (Men's, 27% off)
6. **Designer Silk Saree** - ₹8,999 (Women's ethnic, 31% off)
7. **Casual Sneakers** - ₹2,499 (Men's footwear, 29% off)
8. **Floral Print Kurti** - ₹1,299 (Women's, 32% off)
9. **Formal Blazer** - ₹4,999 (Men's formal, 29% off)
10. **Kids Party Dress** - ₹1,899 (Children's, 24% off)
11. **Leather Wallet** - ₹1,499 (Men's accessories, 25% off)
12. **Yoga Leggings** - ₹1,799 (Women's sportswear, 22% off)
13. **Winter Jacket** - ₹5,999 (Men's winter wear, 25% off)
14. **Designer Watch** - ₹3,499 (Men's accessories, 30% off)

### 📦 Orders (12 records)
- Each order contains 1-3 products with realistic quantities
- Multiple order statuses (pending, confirmed, processing, shipped, delivered, cancelled)
- Various payment methods (card, UPI, net banking, wallet, COD)
- Complete shipping and billing addresses
- Tax calculations (18% GST) and shipping costs
- Proper customer-product relationships

### 📱 Posts (15 records)
- Social media posts by customers featuring products
- Real engagement metrics (likes, comments, shares, views)
- Product tagging and location data
- Realistic content and media attachments

### 📸 Stories (12 records)
- Instagram-style stories with 24-hour expiry
- Mix of image and video content
- Product features and style inspiration
- Engagement tracking (views, likes, replies)

### 🛒 Carts (10 records)
- Active shopping carts for each customer
- 1-4 products per cart with quantities and variants
- Real-time total calculations
- Size and color selections

### 💝 Wishlists (10 records)
- Personal wishlists for each customer
- 2-6 products per wishlist
- Public/private settings with sharing options
- Priority levels and personal notes
- Total value calculations

## 🎯 Database Tables Created

### Products Table
- Complete product catalog with descriptions
- Multiple sizes and color variants with stock
- Pricing with discounts and original prices
- Product ratings and reviews
- Categories (men, women, children)
- Subcategories (shirts, dresses, shoes, accessories, etc.)
- Brand information and vendor relationships
- SEO-friendly slugs and metadata

### Orders Table
- Complete order management system
- Customer-product relationships via ObjectId references
- Order items with quantities, sizes, colors, and prices
- Order statuses and payment tracking
- Shipping and billing addresses
- Tax and shipping calculations
- Order numbers and tracking information
- Vendor associations for multi-vendor support

## 🧪 Testing the Data

### 1. Check Database Collections
```bash
# Connect to MongoDB
mongo dfashion

# Check collections
db.products.count()  # Should show 5
db.orders.count()    # Should show 8

# View sample product
db.products.findOne()

# View sample order with populated data
db.orders.findOne()
```

### 2. Test API Endpoints
```bash
# Get all products
curl http://localhost:3001/api/products

# Get specific product
curl http://localhost:3001/api/products/PRODUCT_ID

# Get orders (if you have order API endpoints)
curl http://localhost:3001/api/orders
```

### 3. Verify Relationships
```bash
# Check product-order relationships
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      localField: "items.product",
      foreignField: "_id",
      as: "productDetails"
    }
  }
])
```

## 🎉 Success Output

```
🚀 Starting Products & Orders Data Seeding...

🗑️ Clearing products and orders data...
✅ Products and orders data cleared

👥 Creating minimal users for relationships...
✅ Created 3 customers

🛍️ Creating real products...
✅ Created 5 real products

📦 Creating real orders...
✅ Created 8 real orders

📊 Products & Orders Data Seeding Summary:
✅ Created 3 customers
✅ Created 1 vendor
✅ Created 5 real products
✅ Created 8 real orders

🎉 Products & Orders seeding completed successfully!

🔗 Database now contains:
   • Real products with variants, pricing, and ratings
   • Real orders with proper customer-product relationships
   • Realistic order statuses, payments, and shipping details
   • Complete e-commerce data ready for testing

✅ Disconnected from MongoDB
```

Your database now contains **real Products and Orders data** with proper relationships and no mock/test data! 🎯
