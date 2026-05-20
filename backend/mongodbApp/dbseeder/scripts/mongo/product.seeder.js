// Product Seeder
const Category = require('../../../models/Category');
const User = require('../../../models/User');
const Product = require('../../../models/Product');

async function seedProducts() {
  console.log('🛍️ Seeding products...');
  
  const deletedCount = await Product.deleteMany({});
  console.log(`   Cleared ${deletedCount.deletedCount} existing products`);
  
  // Get categories and vendors
  const categories = await Category.find().limit(5);
  const vendors = await User.find({ role: 'vendor' }).limit(2);
  
  if (categories.length === 0 || vendors.length === 0) {
    throw new Error('Categories or vendors not found. Run seeders in order.');
  }
  
  const products = [];
  const productNames = [
    'Classic White T-Shirt', 'Blue Denim Jeans', 'Black Leather Jacket', 'Summer Dress',
    'Sports Running Shoes', 'Casual Sneakers', 'Formal Shoes', 'Handbag - Leather',
    'Backpack - Travel', 'Silk Scarf', 'Golden Necklace', 'Watch - Luxury',
    'Womens Blazer', 'Mens Polo Shirt', 'Kids Hoodie', 'Yoga Leggings',
    'Denim Shorts', 'Sweater - Wool', 'Cargo Pants', 'Evening Gown'
  ];
  
  productNames.forEach((name, idx) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    products.push({
      name,
      slug: `${slug}-${idx}`,
      description: `High-quality ${name.toLowerCase()} perfect for everyday wear or special occasions`,
      price: 500 + (idx * 150),
      originalPrice: 1000 + (idx * 200),
      discount: 15 + (idx % 30),
      category: categories[idx % categories.length]._id,
      brand: ['Nike', 'Adidas', 'Puma', 'Zara', 'H&M'][idx % 5],
      images: [{
        url: `/uploads/products/product-${idx + 1}.jpg`,
        alt: name,
        isPrimary: true
      }],
      thumbnail: `/uploads/products/thumb-${idx + 1}.jpg`,
      inventory: {
        stock: 50 + (idx * 5),
        sku: `SKU-${Date.now()}-${idx}`,
        reorderLevel: 10
      },
      ratings: {
        average: 3.5 + (idx % 2),
        count: 50 + (idx * 10)
      },
      vendor: vendors[idx % vendors.length]._id,
      tags: ['trending', 'new', 'bestseller'].slice(idx % 3),
      isActive: true,
      isFeatured: idx < 5,
      status: 'published'
    });
  });
  
  const result = await Product.insertMany(products);
  console.log(`   ✅ Created ${result.length} products`);
  
  return result;
}

module.exports = seedProducts;

