// Category Seeder Script with Comprehensive Subcategories
// Usage: node scripts/category.seeder.js

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Category = require('../models/Category');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping category.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';
const UPLOADS_DIR = path.join(__dirname, '../uploads/categories');
const DEFAULT_IMAGE = '/uploads/categories/default.jpg';

const categories = [
  {
    name: 'Men',
    slug: 'men',
    description: 'Men\'s clothing and fashion',
    image: '/uploads/categories/men.jpg',
    isActive: true,
    isFeatured: true,
    sortOrder: 1,
    subcategories: [
      { name: 'Shirts', slug: 'shirts', description: 'Casual and formal shirts', isActive: true, sortOrder: 1 },
      { name: 'Pants', slug: 'pants', description: 'Jeans, trousers, and casual pants', isActive: true, sortOrder: 2 },
      { name: 'Jackets', slug: 'jackets', description: 'Coats and jackets', isActive: true, sortOrder: 3 },
      { name: 'Shoes', slug: 'shoes', description: 'Men\'s footwear', isActive: true, sortOrder: 4 },
      { name: 'Accessories', slug: 'accessories', description: 'Ties, belts, scarves', isActive: true, sortOrder: 5 }
    ]
  },
  {
    name: 'Women',
    slug: 'women',
    description: 'Women\'s clothing and fashion',
    image: '/uploads/categories/women.jpg',
    isActive: true,
    isFeatured: true,
    sortOrder: 2,
    subcategories: [
      { name: 'Dresses', slug: 'dresses', description: 'Evening and casual dresses', isActive: true, sortOrder: 1 },
      { name: 'Tops', slug: 'tops', description: 'T-shirts, blouses, and tops', isActive: true, sortOrder: 2 },
      { name: 'Bottoms', slug: 'bottoms', description: 'Skirts, pants, and leggings', isActive: true, sortOrder: 3 },
      { name: 'Outerwear', slug: 'outerwear', description: 'Jackets and coats', isActive: true, sortOrder: 4 },
      { name: 'Shoes', slug: 'shoes', description: 'Women\'s footwear', isActive: true, sortOrder: 5 }
    ]
  },
  {
    name: 'Kids',
    slug: 'kids',
    description: 'Kids fashion and accessories',
    image: '/uploads/categories/kids.jpg',
    isActive: true,
    isFeatured: true,
    sortOrder: 3,
    subcategories: [
      { name: 'Boys', slug: 'boys', description: 'Boys clothing', isActive: true, sortOrder: 1 },
      { name: 'Girls', slug: 'girls', description: 'Girls clothing', isActive: true, sortOrder: 2 },
      { name: 'Shoes', slug: 'shoes', description: 'Kids shoes', isActive: true, sortOrder: 3 },
      { name: 'Accessories', slug: 'accessories', description: 'Bags, hats, and more', isActive: true, sortOrder: 4 }
    ]
  },
  {
    name: 'Shoes',
    slug: 'shoes',
    description: 'Footwear for all occasions',
    image: '/uploads/categories/shoes.jpg',
    isActive: true,
    isFeatured: true,
    sortOrder: 4,
    subcategories: [
      { name: 'Casual Shoes', slug: 'casual-shoes', description: 'Sneakers and casual footwear', isActive: true, sortOrder: 1 },
      { name: 'Formal Shoes', slug: 'formal-shoes', description: 'Dress shoes and formal wear', isActive: true, sortOrder: 2 },
      { name: 'Sandals', slug: 'sandals', description: 'Sandals and flip-flops', isActive: true, sortOrder: 3 },
      { name: 'Sports Shoes', slug: 'sports-shoes', description: 'Athletic and running shoes', isActive: true, sortOrder: 4 },
      { name: 'Boots', slug: 'boots', description: 'Boots and high-top footwear', isActive: true, sortOrder: 5 }
    ]
  },
  {
    name: 'Bags',
    slug: 'bags',
    description: 'Handbags, backpacks, and more',
    image: '/uploads/categories/bags.jpg',
    isActive: true,
    isFeatured: true,
    sortOrder: 5,
    subcategories: [
      { name: 'Handbags', slug: 'handbags', description: 'Shoulder bags and purses', isActive: true, sortOrder: 1 },
      { name: 'Backpacks', slug: 'backpacks', description: 'Travel and school backpacks', isActive: true, sortOrder: 2 },
      { name: 'Wallets', slug: 'wallets', description: 'Wallets and card holders', isActive: true, sortOrder: 3 },
      { name: 'Travel Bags', slug: 'travel-bags', description: 'Luggage and travel essentials', isActive: true, sortOrder: 4 }
    ]
  },
  {
    name: 'Jewelry',
    slug: 'jewelry',
    description: 'Fine jewelry and accessories',
    image: '/uploads/categories/jewelry.jpg',
    isActive: true,
    isFeatured: true,
    sortOrder: 6,
    subcategories: [
      { name: 'Necklaces', slug: 'necklaces', description: 'Pendants and chains', isActive: true, sortOrder: 1 },
      { name: 'Rings', slug: 'rings', description: 'Engagement and casual rings', isActive: true, sortOrder: 2 },
      { name: 'Bracelets', slug: 'bracelets', description: 'Bangles and bracelets', isActive: true, sortOrder: 3 },
      { name: 'Earrings', slug: 'earrings', description: 'Studs, hoops, and drops', isActive: true, sortOrder: 4 }
    ]
  },
  {
    name: 'Watches',
    slug: 'watches',
    description: 'Luxury and casual watches',
    image: '/uploads/categories/watches.jpg',
    isActive: true,
    isFeatured: false,
    sortOrder: 7,
    subcategories: [
      { name: 'Luxury Watches', slug: 'luxury-watches', description: 'Premium timepieces', isActive: true, sortOrder: 1 },
      { name: 'Sports Watches', slug: 'sports-watches', description: 'Athletic watches', isActive: true, sortOrder: 2 },
      { name: 'Casual Watches', slug: 'casual-watches', description: 'Everyday wear watches', isActive: true, sortOrder: 3 }
    ]
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    description: 'Belts, hats, scarves, and more',
    image: '/uploads/categories/accessories.jpg',
    isActive: true,
    isFeatured: false,
    sortOrder: 8,
    subcategories: [
      { name: 'Belts', slug: 'belts', description: 'Leather and fabric belts', isActive: true, sortOrder: 1 },
      { name: 'Scarves', slug: 'scarves', description: 'Silk and cotton scarves', isActive: true, sortOrder: 2 },
      { name: 'Hats', slug: 'hats', description: 'Caps and hats', isActive: true, sortOrder: 3 },
      { name: 'Sunglasses', slug: 'sunglasses', description: 'UV protective eyewear', isActive: true, sortOrder: 4 }
    ]
  },
  {
    name: 'Eyewear',
    slug: 'eyewear',
    description: 'Sunglasses and optical frames',
    image: '/uploads/categories/eyewear.jpg',
    isActive: true,
    isFeatured: false,
    sortOrder: 9,
    subcategories: [
      { name: 'Sunglasses', slug: 'sunglasses', description: 'Designer sunglasses', isActive: true, sortOrder: 1 },
      { name: 'Optical Frames', slug: 'optical-frames', description: 'Prescription frames', isActive: true, sortOrder: 2 },
      { name: 'Sports Eyewear', slug: 'sports-eyewear', description: 'Performance eyewear', isActive: true, sortOrder: 3 }
    ]
  },
  {
    name: 'Sportswear',
    slug: 'sportswear',
    description: 'Activewear and sports fashion',
    image: '/uploads/categories/sportswear.jpg',
    isActive: true,
    isFeatured: false,
    sortOrder: 10,
    subcategories: [
      { name: 'Athletic Tops', slug: 'athletic-tops', description: 'Sports shirts and tanks', isActive: true, sortOrder: 1 },
      { name: 'Athletic Bottoms', slug: 'athletic-bottoms', description: 'Leggings and shorts', isActive: true, sortOrder: 2 },
      { name: 'Activewear Sets', slug: 'activewear-sets', description: 'Complete athletic sets', isActive: true, sortOrder: 3 }
    ]
  }
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
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Validate image paths
    categories.forEach(cat => {
      cat.image = validateImagePath(cat.image);
    });

    // Clean slate to avoid duplicates
    await Category.deleteMany({});
    console.log('Cleared existing categories');

    // Insert categories with subcategories
    await Category.insertMany(categories);
    console.log(`Successfully seeded ${categories.length} categories with subcategories!`);
    
    // Verify seeding
    const count = await Category.countDocuments();
    console.log(`Total categories in database: ${count}`);
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seedCategories();
