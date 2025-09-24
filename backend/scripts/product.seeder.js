// Product Seeder Script
// Usage: node scripts/product.seeder.js

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';
const UPLOADS_DIR = path.join(__dirname, '../uploads/products');
const DEFAULT_IMAGE = '/uploads/products/default.jpg';

// Helper to validate image path
function validateImagePath(imagePath) {
  const absPath = path.join(__dirname, '..', imagePath);
  if (fs.existsSync(absPath)) {
    return imagePath;
  }
  return DEFAULT_IMAGE;
}

async function seedProducts() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Get all categories and vendors
  const categories = await Category.find();
  const vendors = await User.find({ role: 'vendor' });
  if (categories.length === 0 || vendors.length === 0) {
    throw new Error('Missing categories or vendors for product seeding.');
  }

  // 20+ realistic products
  const productNames = [
    'Gold Necklace', 'Silver Bracelet', 'Diamond Ring', 'Pearl Earrings', 'Leather Handbag',
    'Silk Scarf', 'Wool Sweater', 'Denim Jacket', 'Cotton T-Shirt', 'Linen Pants',
    'Running Shoes', 'High Heels', 'Sunglasses', 'Wrist Watch', 'Backpack',
    'Sports Cap', 'Formal Shirt', 'Casual Shorts', 'Winter Coat', 'Summer Dress',
    'Classic Belt', 'Fashion Hoodie', 'Travel Duffel', 'Ankle Boots', 'Evening Gown'
  ];
  const brands = ['Prada', 'Gucci', 'Louis Vuitton', 'Chanel', 'Nike', 'Adidas', 'Zara', 'H&M', 'Rolex', 'Ray-Ban'];
  const subcategories = ['Jewelry', 'Accessories', 'Clothing', 'Footwear', 'Bags'];
  const colors = [
    { name: 'Gold', code: '#FFD700' },
    { name: 'Silver', code: '#C0C0C0' },
    { name: 'Black', code: '#000000' },
    { name: 'White', code: '#FFFFFF' },
    { name: 'Red', code: '#FF0000' },
    { name: 'Blue', code: '#0000FF' },
    { name: 'Green', code: '#008000' },
    { name: 'Brown', code: '#8B4513' },
    { name: 'Pink', code: '#FFC0CB' },
    { name: 'Yellow', code: '#FFFF00' }
  ];
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'One Size'];

  // Distribute flags: 10 true per flag, 40 products total, no overlap
  const flagCount = 10;
  const totalProducts = 40;
  // Use realistic demo images for the first 10 products, then cycle through them
  const demoImages = [
    'dress-1.jpg',
    'shoes-1.jpg',
    'jacket-1.jpg',
    'bag-1.jpg',
    'watch-1.jpg',
    'sunglasses-1.jpg',
    'tshirt-1.jpg',
    'jeans-1.jpg',
    'heels-1.jpg',
    'scarf-1.jpg'
  ];
  const products = Array.from({ length: totalProducts }, (_, i) => {
    const category = categories[i % categories.length];
    const vendor = vendors[i % vendors.length];
    const color = colors[i % colors.length];
    const size = sizes[i % sizes.length];
    const brand = brands[i % brands.length];
    const subcategory = subcategories[i % subcategories.length];
    const price = Math.floor(Math.random() * 4000) + 500;
    const originalPrice = price + Math.floor(Math.random() * 1000);
    const discount = Math.floor(((originalPrice - price) / originalPrice) * 100);
    const baseSlug = productNames[i % productNames.length].toLowerCase().replace(/ /g, '-') + '-' + (i+1);
    // Use demo image for first 10, then cycle
    let imageName = `/uploads/products/${demoImages[i % demoImages.length]}`;
    let absPath = path.join(__dirname, '..', imageName);
    let isValidImage = false;
    if (fs.existsSync(absPath)) {
      const ext = path.extname(absPath).toLowerCase();
      if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
        const stats = fs.statSync(absPath);
        isValidImage = stats.size > 1000;
      }
    }
    if (!isValidImage) imageName = DEFAULT_IMAGE;
    let isFeatured = false, isTrending = false, isSuggested = false, isNewArrival = false;
    if (i < flagCount) isFeatured = true;
    else if (i < flagCount * 2) isTrending = true;
    else if (i < flagCount * 3) isSuggested = true;
    else if (i < flagCount * 4) isNewArrival = true;
    return {
      name: productNames[i % productNames.length] + ' ' + (i+1),
      description: `High quality ${subcategory.toLowerCase()} by ${brand}.`,
      price,
      originalPrice,
      discount,
      category: category._id,
      subcategory,
      brand,
      images: [
        { url: imageName, alt: productNames[i % productNames.length], isPrimary: true }
      ],
      sizes: [{ size, stock: Math.floor(Math.random() * 20) + 1 }],
      colors: [color],
      vendor: vendor._id,
      tags: [subcategory.toLowerCase(), color.name.toLowerCase()],
      features: ['Durable', 'Trendy', 'Comfortable'],
      material: subcategory === 'Jewelry' ? 'Gold' : 'Fabric',
      careInstructions: 'Follow label instructions.',
      isActive: true,
      isFeatured,
      isTrending,
      isSuggested,
      isNewArrival,
      seo: { slug: baseSlug }
    };
  });

  // Clean slate to avoid duplicates
  await Product.deleteMany({});
  await Product.insertMany(products);
  console.log('Products seeded successfully!');
  await mongoose.disconnect();
}

seedProducts().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
