/**
 * DFashion E-Commerce Platform - Product Seeder
 * Creates sample products with proper image handling
 */

const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');
const Category = require('../models/Category');

// Load environment variables
require('dotenv').config();

// Database connection
async function connectDatabase() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dfashion';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Create sample products
async function createSampleProducts() {
  console.log('👕 Creating sample products...');
  
  // Get vendor user
  const vendor = await User.findOne({ role: 'vendor' });
  if (!vendor) {
    console.error('❌ No vendor found. Please run master seed first.');
    return;
  }

  // Get categories
  const menCategory = await Category.findOne({ slug: 'men' });
  const womenCategory = await Category.findOne({ slug: 'women' });
  const childrenCategory = await Category.findOne({ slug: 'children' });

  if (!menCategory || !womenCategory || !childrenCategory) {
    console.error('❌ Categories not found. Please run master seed first.');
    return;
  }

  let products = [
    // Men's Products
    {
      name: 'Classic Cotton T-Shirt',
      description: 'Comfortable cotton t-shirt perfect for everyday wear',
      price: 599,
      originalPrice: 799,
      discount: 25,
      category: menCategory._id,
      subcategory: 'shirts',
      brand: 'DFashion',
      vendor: vendor._id,
      images: [
        { url: '/assets/images/placeholder-product.svg', alt: 'Cotton T-Shirt', isPrimary: true }
      ],
      sizes: [
        { size: 'S', stock: 10 },
        { size: 'M', stock: 15 },
        { size: 'L', stock: 12 },
        { size: 'XL', stock: 8 }
      ],
      colors: [
        { name: 'White', code: '#FFFFFF' },
        { name: 'Black', code: '#000000' },
        { name: 'Navy', code: '#001f3f' }
      ],
      tags: ['casual', 'cotton', 'comfortable'],
      isActive: true,
      isFeatured: true,
      rating: { average: 4.5, count: 23 },
      analytics: { views: 150, likes: 45, shares: 12, purchases: 8 }
    },
    {
      name: 'Casual Chino Pants',
      description: 'Stylish chino pants for casual and semi-formal occasions',
      price: 1299,
      originalPrice: 1599,
      discount: 19,
      category: menCategory._id,
      subcategory: 'pants',
      brand: 'DFashion',
      vendor: vendor._id,
      images: [
        { url: '/assets/images/placeholder-product.svg', alt: 'Chino Pants', isPrimary: true }
      ],
      sizes: [
        { size: '30', stock: 8 },
        { size: '32', stock: 12 },
        { size: '34', stock: 10 },
        { size: '36', stock: 6 }
      ],
      colors: [
        { name: 'Khaki', code: '#C3B091' },
        { name: 'Navy', code: '#001f3f' },
        { name: 'Black', code: '#000000' }
      ],
      tags: ['casual', 'chino', 'versatile'],
      isActive: true,
      isFeatured: false,
      rating: { average: 4.2, count: 18 },
      analytics: { views: 120, likes: 32, shares: 8, purchases: 5 }
    },
    // Women's Products
    {
      name: 'Floral Summer Dress',
      description: 'Beautiful floral dress perfect for summer occasions',
      price: 1899,
      originalPrice: 2299,
      discount: 17,
      category: womenCategory._id,
      subcategory: 'dresses',
      brand: 'DFashion',
      vendor: vendor._id,
      images: [
        { url: '/assets/images/placeholder-product.svg', alt: 'Floral Dress', isPrimary: true }
      ],
      sizes: [
        { size: 'XS', stock: 5 },
        { size: 'S', stock: 12 },
        { size: 'M', stock: 15 },
        { size: 'L', stock: 10 },
        { size: 'XL', stock: 6 }
      ],
      colors: [
        { name: 'Pink Floral', code: '#FFB6C1' },
        { name: 'Blue Floral', code: '#87CEEB' }
      ],
      tags: ['summer', 'floral', 'dress', 'feminine'],
      isActive: true,
      isFeatured: true,
      rating: { average: 4.7, count: 35 },
      analytics: { views: 200, likes: 68, shares: 25, purchases: 12 }
    },
    {
      name: 'Casual Denim Jacket',
      description: 'Trendy denim jacket for layering and style',
      price: 2199,
      originalPrice: 2599,
      discount: 15,
      category: womenCategory._id,
      subcategory: 'tops',
      brand: 'DFashion',
      vendor: vendor._id,
      images: [
        { url: '/assets/images/placeholder-product.svg', alt: 'Denim Jacket', isPrimary: true }
      ],
      sizes: [
        { size: 'S', stock: 8 },
        { size: 'M', stock: 12 },
        { size: 'L', stock: 9 },
        { size: 'XL', stock: 5 }
      ],
      colors: [
        { name: 'Light Blue', code: '#ADD8E6' },
        { name: 'Dark Blue', code: '#00008B' }
      ],
      tags: ['denim', 'jacket', 'casual', 'trendy'],
      isActive: true,
      isFeatured: false,
      rating: { average: 4.3, count: 27 },
      analytics: { views: 180, likes: 54, shares: 18, purchases: 9 }
    },
    // Children's Products
    {
      name: 'Kids Cotton Kurta Set',
      description: 'Traditional cotton kurta set for children',
      price: 899,
      originalPrice: 1199,
      discount: 25,
      category: childrenCategory._id,
      subcategory: 'boys',
      brand: 'DFashion',
      vendor: vendor._id,
      images: [
        { url: '/assets/images/placeholder-product.svg', alt: 'Kids Kurta', isPrimary: true }
      ],
      sizes: [
        { size: '2-3Y', stock: 10 },
        { size: '4-5Y', stock: 12 },
        { size: '6-7Y', stock: 8 },
        { size: '8-9Y', stock: 6 }
      ],
      colors: [
        { name: 'White', code: '#FFFFFF' },
        { name: 'Cream', code: '#F5F5DC' }
      ],
      tags: ['traditional', 'cotton', 'kids', 'ethnic'],
      isActive: true,
      isFeatured: true,
      rating: { average: 4.6, count: 19 },
      analytics: { views: 95, likes: 28, shares: 10, purchases: 6 }
    },
    {
      name: 'Sports Running Shoes',
      description: 'Comfortable running shoes for active lifestyle',
      price: 1599,
      originalPrice: 1999,
      discount: 20,
      category: menCategory._id,
      subcategory: 'shoes',
      brand: 'DFashion',
      vendor: vendor._id,
      images: [
        { url: '/assets/images/placeholder-product.svg', alt: 'Running Shoes', isPrimary: true }
      ],
      sizes: [
        { size: '7', stock: 6 },
        { size: '8', stock: 10 },
        { size: '9', stock: 12 },
        { size: '10', stock: 8 },
        { size: '11', stock: 4 }
      ],
      colors: [
        { name: 'Black/White', code: '#000000' },
        { name: 'Blue/White', code: '#0000FF' }
      ],
      tags: ['sports', 'running', 'comfortable', 'athletic'],
      isActive: true,
      isFeatured: false,
      rating: { average: 4.4, count: 31 },
      analytics: { views: 165, likes: 42, shares: 15, purchases: 7 }
    }
  ];

  // Randomly flag products as trending/suggested
  products = products.map((p, idx) => ({
    ...p,
    isTrending: idx % 2 === 0, // Every other product trending
    isSuggested: idx % 3 === 0 // Every third product suggested
  }));

  // Clear existing products
  await Product.deleteMany({});

  // Create products
  for (const productData of products) {
    const product = new Product(productData);
    await product.save();
    console.log(`✅ Created product: ${productData.name}`);
  }

  console.log(`✅ Created ${products.length} sample products\n`);
}

// Main seeding function
async function seedProducts() {
  try {
    console.log('🌱 Starting Product Seeding...');
    console.log('=' .repeat(50));
    
    await connectDatabase();
    await createSampleProducts();
    
    console.log('=' .repeat(50));
    console.log('🎉 Product Seeding Completed!');
    console.log('');
    console.log('📊 Summary:');
    console.log('   👕 Products: 6 sample products created');
    console.log('   📂 Categories: Men, Women, Children');
    console.log('   🏷️ All products use placeholder images');
    console.log('   ⭐ Products have ratings and analytics data');
    console.log('');
    console.log('✅ All products are ready for testing');
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('❌ Product seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeder
if (require.main === module) {
  seedProducts();
}

module.exports = {
  seedProducts,
  createSampleProducts
};
