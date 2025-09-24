// Category Seeder Script
// Usage: node scripts/category.seeder.js

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Category = require('../models/Category');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';
const UPLOADS_DIR = path.join(__dirname, '../uploads/categories');
const DEFAULT_IMAGE = '/uploads/categories/default.jpg';

const categories = [
  {
    name: 'Jewelry',
    slug: 'jewelry',
    description: 'Fine jewelry and accessories',
    image: '/uploads/categories/jewelry.jpg',
    isActive: true,
    isFeatured: true
  },
  {
    name: 'Kids',
    slug: 'kids',
    description: 'Kids fashion and accessories',
    image: '/uploads/categories/kids.jpg',
    isActive: true,
    isFeatured: false
  },
  {
    name: 'Women',
    slug: 'women',
    description: 'Women’s clothing and fashion',
    image: '/uploads/categories/women.jpg',
    isActive: true,
    isFeatured: false
  },
  {
    name: 'Men',
    slug: 'men',
    description: 'Men’s clothing and fashion',
    image: '/uploads/categories/men.jpg',
    isActive: true,
    isFeatured: false
  },
  {
    name: 'Shoes',
    slug: 'shoes',
    description: 'Footwear for all occasions',
    image: '/uploads/categories/shoes.jpg',
    isActive: true,
    isFeatured: false
  },
  {
    name: 'Bags',
    slug: 'bags',
    description: 'Handbags, backpacks, and more',
    image: '/uploads/categories/bags.jpg',
    isActive: true,
    isFeatured: false
  },
  {
    name: 'Accessories',
      slug: 'accessories',
      description: 'Belts, hats, scarves, and more',
      image: '/uploads/categories/accessories.jpg',
      isActive: true,
      isFeatured: false
    },
    {
      name: 'Watches',
      slug: 'watches',
      description: 'Luxury and casual watches',
      image: '/uploads/categories/watches.jpg',
      isActive: true,
      isFeatured: false
    },
    {
      name: 'Eyewear',
      slug: 'eyewear',
      description: 'Sunglasses and optical frames',
      image: '/uploads/categories/eyewear.jpg',
      isActive: true,
      isFeatured: false
    },
    {
      name: 'Sportswear',
      slug: 'sportswear',
      description: 'Activewear and sports fashion',
      image: '/uploads/categories/sportswear.jpg',
      isActive: true,
      isFeatured: false
    },
  ];

// Check if image exists, else use default
function validateImagePath(imagePath) {
  const absPath = path.join(__dirname, '..', imagePath);
  if (fs.existsSync(absPath)) {
    return imagePath;
  }
  return DEFAULT_IMAGE;
}

async function seedCategories() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Validate image paths
  categories.forEach(cat => {
    cat.image = validateImagePath(cat.image);
  });

  // Clean slate to avoid duplicates
  await Category.deleteMany({});
  await Category.insertMany(categories);
  console.log('Categories seeded successfully!');
  await mongoose.disconnect();
}

seedCategories().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
