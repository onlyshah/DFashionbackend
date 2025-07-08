const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Category = require('../models/Category');
const Post = require('../models/Post');
const Story = require('../models/Story');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');
const Reel = require('../models/Reel');
const Role = require('../models/Role');
const { SearchHistory, TrendingSearch, SearchSuggestion } = require('../models/SearchHistory');
const UserBehavior = require('../models/UserBehavior');

// Create Brand model if it doesn't exist
const brandSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  logo: String,
  website: String,
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  productCount: { type: Number, default: 0 },
  avgRating: { type: Number, default: 0 },
  totalViews: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Brand = mongoose.models.Brand || mongoose.model('Brand', brandSchema);

// Load environment variables
require('dotenv').config();

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

async function seedRealData() {
  try {
    console.log('🚀 Starting Comprehensive Database Seeding...\n');

    // Clear all collections
    console.log('🗑️ Clearing all collections...');
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      Post.deleteMany({}),
      Story.deleteMany({}),
      Cart.deleteMany({}),
      Wishlist.deleteMany({}),
      Brand.deleteMany({}),
      Notification.deleteMany({}),
      Payment.deleteMany({}),
      Reel.deleteMany({}),
      Role.deleteMany({}),
      // SearchHistory.deleteMany({}),
      // TrendingSearch.deleteMany({}),
      // SearchSuggestion.deleteMany({}),
      UserBehavior.deleteMany({})
    ]);
    console.log('✅ All collections cleared\n');

    // Use plain text password - User model will hash it automatically in pre-save middleware
    const plainPassword = 'password123';

    // 1. Create Roles (12+ records)
    console.log('🔐 Creating roles...');
    const roles = await Role.create([
      {
        name: 'super_admin',
        displayName: 'Super Administrator',
        description: 'Full system access with all permissions',
        department: 'administration',
        level: 10,
        permissions: {
          users: { create: true, read: true, update: true, delete: true },
          products: { create: true, read: true, update: true, delete: true },
          orders: { create: true, read: true, update: true, delete: true },
          categories: { create: true, read: true, update: true, delete: true },
          vendors: { create: true, read: true, update: true, delete: true },
          analytics: { create: true, read: true, update: true, delete: true },
          settings: { create: true, read: true, update: true, delete: true },
          roles: { create: true, read: true, update: true, delete: true }
        },
        isActive: true
      },
      {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Administrative access with most permissions',
        department: 'administration',
        level: 9,
        permissions: {
          users: { create: true, read: true, update: true, delete: false },
          products: { create: true, read: true, update: true, delete: true },
          orders: { create: true, read: true, update: true, delete: false },
          categories: { create: true, read: true, update: true, delete: true },
          vendors: { create: true, read: true, update: true, delete: false },
          analytics: { create: false, read: true, update: false, delete: false },
          settings: { create: false, read: true, update: true, delete: false }
        },
        isActive: true
      },
      {
        name: 'sales_manager',
        displayName: 'Sales Manager',
        description: 'Manages sales operations and team',
        department: 'sales',
        level: 7,
        permissions: {
          users: { create: false, read: true, update: false, delete: false },
          products: { create: true, read: true, update: true, delete: false },
          orders: { create: true, read: true, update: true, delete: false },
          categories: { create: false, read: true, update: false, delete: false },
          vendors: { create: false, read: true, update: true, delete: false },
          analytics: { create: false, read: true, update: false, delete: false }
        },
        isActive: true
      },
      {
        name: 'sales_executive',
        displayName: 'Sales Executive',
        description: 'Handles sales operations and customer relations',
        department: 'sales',
        level: 5,
        permissions: {
          users: { create: false, read: true, update: false, delete: false },
          products: { create: false, read: true, update: true, delete: false },
          orders: { create: true, read: true, update: true, delete: false },
          categories: { create: false, read: true, update: false, delete: false },
          vendors: { create: false, read: true, update: false, delete: false }
        },
        isActive: true
      },
      {
        name: 'marketing_manager',
        displayName: 'Marketing Manager',
        description: 'Manages marketing campaigns and strategies',
        department: 'marketing',
        level: 7,
        permissions: {
          users: { create: false, read: true, update: false, delete: false },
          products: { create: true, read: true, update: true, delete: false },
          orders: { create: false, read: true, update: false, delete: false },
          categories: { create: true, read: true, update: true, delete: false },
          vendors: { create: false, read: true, update: false, delete: false },
          analytics: { create: false, read: true, update: false, delete: false }
        },
        isActive: true
      },
      {
        name: 'marketing_executive',
        displayName: 'Marketing Executive',
        description: 'Executes marketing campaigns and content creation',
        department: 'marketing',
        level: 5,
        permissions: {
          users: { create: false, read: true, update: false, delete: false },
          products: { create: false, read: true, update: true, delete: false },
          orders: { create: false, read: true, update: false, delete: false },
          categories: { create: false, read: true, update: false, delete: false },
          vendors: { create: false, read: true, update: false, delete: false }
        },
        isActive: true
      },
      {
        name: 'account_manager',
        displayName: 'Account Manager',
        description: 'Manages financial accounts and transactions',
        department: 'accounting',
        level: 6,
        permissions: {
          users: { create: false, read: true, update: false, delete: false },
          products: { create: false, read: true, update: false, delete: false },
          orders: { create: false, read: true, update: true, delete: false },
          categories: { create: false, read: true, update: false, delete: false },
          vendors: { create: false, read: true, update: true, delete: false },
          analytics: { create: false, read: true, update: false, delete: false }
        },
        isActive: true
      },
      {
        name: 'accountant',
        displayName: 'Accountant',
        description: 'Handles financial records and reporting',
        department: 'accounting',
        level: 4,
        permissions: {
          users: { create: false, read: true, update: false, delete: false },
          products: { create: false, read: true, update: false, delete: false },
          orders: { create: false, read: true, update: false, delete: false },
          categories: { create: false, read: true, update: false, delete: false },
          vendors: { create: false, read: true, update: false, delete: false }
        },
        isActive: true
      },
      {
        name: 'support_manager',
        displayName: 'Support Manager',
        description: 'Manages customer support operations',
        department: 'support',
        level: 6,
        permissions: {
          users: { create: false, read: true, update: true, delete: false },
          products: { create: false, read: true, update: false, delete: false },
          orders: { create: false, read: true, update: true, delete: false },
          categories: { create: false, read: true, update: false, delete: false },
          vendors: { create: false, read: true, update: false, delete: false }
        },
        isActive: true
      },
      {
        name: 'support_agent',
        displayName: 'Support Agent',
        description: 'Provides customer support and assistance',
        department: 'support',
        level: 3,
        permissions: {
          users: { create: false, read: true, update: false, delete: false },
          products: { create: false, read: true, update: false, delete: false },
          orders: { create: false, read: true, update: false, delete: false },
          categories: { create: false, read: true, update: false, delete: false },
          vendors: { create: false, read: true, update: false, delete: false }
        },
        isActive: true
      },
      {
        name: 'content_manager',
        displayName: 'Content Manager',
        description: 'Manages content creation and moderation',
        department: 'content',
        level: 6,
        permissions: {
          users: { create: false, read: true, update: false, delete: false },
          products: { create: true, read: true, update: true, delete: false },
          orders: { create: false, read: true, update: false, delete: false },
          categories: { create: true, read: true, update: true, delete: false },
          vendors: { create: false, read: true, update: false, delete: false }
        },
        isActive: true
      },
      {
        name: 'vendor_manager',
        displayName: 'Vendor Manager',
        description: 'Manages vendor relationships and onboarding',
        department: 'vendor_management',
        level: 6,
        permissions: {
          users: { create: false, read: true, update: false, delete: false },
          products: { create: false, read: true, update: true, delete: false },
          orders: { create: false, read: true, update: false, delete: false },
          categories: { create: false, read: true, update: false, delete: false },
          vendors: { create: true, read: true, update: true, delete: false }
        },
        isActive: true
      }
    ]);
    console.log(`✅ Created ${roles.length} roles\n`);

    // 2. Create Users (10+ records)
    console.log('👥 Creating users...');

    const users = await User.create([
      {
        username: 'rajesh_kumar',
        email: 'rajesh@example.com',
        password: plainPassword,
        fullName: 'Rajesh Kumar',
        role: 'customer',
        isActive: true,
        isVerified: true,
        phone: '+91 9876543210',
        bio: 'Fashion enthusiast from Mumbai',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        address: {
          street: '123 MG Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001',
          country: 'India'
        },
        socialStats: { postsCount: 0, followersCount: 0, followingCount: 0 }
      },
      {
        username: 'priya_sharma',
        email: 'priya@example.com',
        password: plainPassword,
        fullName: 'Priya Sharma',
        role: 'customer',
        isActive: true,
        isVerified: true,
        isInfluencer: true,
        phone: '+91 9876543211',
        bio: 'Style blogger and fashion influencer',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
        address: {
          street: '456 Brigade Road',
          city: 'Bangalore',
          state: 'Karnataka',
          zipCode: '560001',
          country: 'India'
        },
        socialStats: { postsCount: 25, followersCount: 15000, followingCount: 500 }
      },
      {
        username: 'amit_singh',
        email: 'amit@example.com',
        password: plainPassword,
        fullName: 'Amit Singh',
        role: 'customer',
        isActive: true,
        isVerified: true,
        phone: '+91 9876543212',
        bio: 'Tech professional with great style sense',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        address: {
          street: '789 CP Market',
          city: 'Delhi',
          state: 'Delhi',
          zipCode: '110001',
          country: 'India'
        },
        socialStats: { postsCount: 0, followersCount: 0, followingCount: 0 }
      },
      {
        username: 'kavya_reddy',
        email: 'kavya@example.com',
        password: plainPassword,
        fullName: 'Kavya Reddy',
        role: 'customer',
        isActive: true,
        isVerified: true,
        isInfluencer: true,
        phone: '+91 9876543213',
        bio: 'Fashion designer and entrepreneur',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        address: {
          street: '321 Banjara Hills',
          city: 'Hyderabad',
          state: 'Telangana',
          zipCode: '500034',
          country: 'India'
        },
        socialStats: { postsCount: 40, followersCount: 25000, followingCount: 800 }
      },
      {
        username: 'arjun_mehta',
        email: 'arjun@example.com',
        password: plainPassword,
        fullName: 'Arjun Mehta',
        role: 'customer',
        isActive: true,
        isVerified: true,
        phone: '+91 9876543214',
        bio: 'Fitness enthusiast and lifestyle blogger',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        address: {
          street: '654 Marine Drive',
          city: 'Chennai',
          state: 'Tamil Nadu',
          zipCode: '600001',
          country: 'India'
        },
        socialStats: { postsCount: 0, followersCount: 0, followingCount: 0 }
      },
      {
        username: 'sneha_patel',
        email: 'sneha@example.com',
        password: plainPassword,
        fullName: 'Sneha Patel',
        role: 'customer',
        isActive: true,
        isVerified: true,
        phone: '+91 9876543215',
        bio: 'Travel blogger and fashion enthusiast',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
        address: {
          street: '987 SG Highway',
          city: 'Ahmedabad',
          state: 'Gujarat',
          zipCode: '380015',
          country: 'India'
        },
        socialStats: { postsCount: 0, followersCount: 0, followingCount: 0 }
      },
      {
        username: 'rohit_gupta',
        email: 'rohit@example.com',
        password: plainPassword,
        fullName: 'Rohit Gupta',
        role: 'customer',
        isActive: true,
        isVerified: true,
        phone: '+91 9876543216',
        bio: 'Business analyst and style conscious',
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
        address: {
          street: '147 Sector 18',
          city: 'Noida',
          state: 'Uttar Pradesh',
          zipCode: '201301',
          country: 'India'
        },
        socialStats: { postsCount: 0, followersCount: 0, followingCount: 0 }
      },
      {
        username: 'ananya_joshi',
        email: 'ananya@example.com',
        password: plainPassword,
        fullName: 'Ananya Joshi',
        role: 'customer',
        isActive: true,
        isVerified: true,
        phone: '+91 9876543217',
        bio: 'Marketing professional and fashion lover',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        address: {
          street: '258 Koregaon Park',
          city: 'Pune',
          state: 'Maharashtra',
          zipCode: '411001',
          country: 'India'
        },
        socialStats: { postsCount: 0, followersCount: 0, followingCount: 0 }
      },
      {
        username: 'vikram_shah',
        email: 'vikram@example.com',
        password: plainPassword,
        fullName: 'Vikram Shah',
        role: 'customer',
        isActive: true,
        isVerified: true,
        phone: '+91 9876543218',
        bio: 'Entrepreneur and fashion forward thinker',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
        address: {
          street: '369 Linking Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400050',
          country: 'India'
        },
        socialStats: { postsCount: 0, followersCount: 0, followingCount: 0 }
      },
      {
        username: 'meera_nair',
        email: 'meera@example.com',
        password: plainPassword,
        fullName: 'Meera Nair',
        role: 'customer',
        isActive: true,
        isVerified: true,
        phone: '+91 9876543219',
        bio: 'Software engineer with impeccable style',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
        address: {
          street: '741 MG Road',
          city: 'Kochi',
          state: 'Kerala',
          zipCode: '682016',
          country: 'India'
        },
        socialStats: { postsCount: 0, followersCount: 0, followingCount: 0 }
      },
      {
        username: 'dfashion_vendor',
        email: 'vendor@dfashion.com',
        password: plainPassword,
        fullName: 'DFashion Store',
        role: 'customer',
        isActive: true,
        isVerified: true,
        phone: '+91 9876543220',
        bio: 'Official DFashion store account',
        avatar: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150',
        vendorInfo: {
          businessName: 'DFashion Official Store',
          businessType: 'Fashion Retailer',
          isApproved: true
        },
        socialStats: { postsCount: 0, followersCount: 0, followingCount: 0 }
      },
      // AI Fashion Influencers
      {
        username: 'ai_fashionista_maya',
        email: 'maya.ai@dfashion.com',
        password: plainPassword,
        fullName: 'Maya Chen',
        role: 'customer',
        isActive: true,
        isVerified: true,
        phone: '+91 9876543221',
        bio: '🤖 AI Fashion Influencer | Sustainable Style Advocate | 500K+ Followers | Powered by DFashion AI',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
        socialStats: {
          postsCount: 247,
          followersCount: 523000,
          followingCount: 1200,
          engagementRate: 8.5,
          averageLikes: 42000,
          averageComments: 3200
        },
        preferences: {
          favoriteCategories: ['sustainable-fashion', 'designer-collection', 'street-style'],
          stylePersonality: 'Eco-conscious trendsetter with a love for sustainable luxury',
          contentFocus: ['outfit-styling', 'sustainable-fashion', 'trend-forecasting']
        },
        influencerMetrics: {
          isInfluencer: true,
          tier: 'mega',
          specialties: ['sustainable fashion', 'luxury styling', 'trend analysis'],
          collaborationRate: 15000,
          avgPostReach: 180000,
          brandPartnerships: ['EcoLux', 'GreenThread', 'SustainableStyle']
        }
      },
      {
        username: 'ai_stylist_alex',
        email: 'alex.ai@dfashion.com',
        password: plainPassword,
        fullName: 'Alex Rodriguez',
        role: 'customer',
        isActive: true,
        isVerified: true,
        phone: '+91 9876543222',
        bio: '🎨 AI Personal Stylist | Men\'s Fashion Expert | Street Style Curator | 350K+ Community',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        socialStats: {
          postsCount: 189,
          followersCount: 347000,
          followingCount: 890,
          engagementRate: 9.2,
          averageLikes: 31000,
          averageComments: 2800
        },
        preferences: {
          favoriteCategories: ['street-style', 'formal-wear', 'sportswear'],
          stylePersonality: 'Urban sophisticate with athletic edge',
          contentFocus: ['mens-styling', 'street-fashion', 'fitness-fashion']
        },
        influencerMetrics: {
          isInfluencer: true,
          tier: 'macro',
          specialties: ['mens fashion', 'street style', 'athletic wear'],
          collaborationRate: 12000,
          avgPostReach: 145000,
          brandPartnerships: ['UrbanEdge', 'SportLux', 'StreetCouture']
        }
      },
      {
        username: 'ai_trendsetter_zara',
        email: 'zara.ai@dfashion.com',
        password: plainPassword,
        fullName: 'Zara Patel',
        role: 'customer',
        isActive: true,
        isVerified: true,
        phone: '+91 9876543223',
        bio: '✨ AI Trend Forecaster | Ethnic Fusion Expert | Beauty & Fashion | 280K+ Style Enthusiasts',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        socialStats: {
          postsCount: 312,
          followersCount: 284000,
          followingCount: 1500,
          engagementRate: 7.8,
          averageLikes: 22000,
          averageComments: 1900
        },
        preferences: {
          favoriteCategories: ['ethnic-wear', 'beauty-cosmetics', 'festival-party'],
          stylePersonality: 'Cultural fusion trendsetter with modern twist',
          contentFocus: ['ethnic-fusion', 'beauty-trends', 'festival-fashion']
        },
        influencerMetrics: {
          isInfluencer: true,
          tier: 'macro',
          specialties: ['ethnic wear', 'beauty trends', 'cultural fashion'],
          collaborationRate: 10000,
          avgPostReach: 120000,
          brandPartnerships: ['EthnicChic', 'BeautyBlend', 'CulturalCouture']
        }
      },
      {
        username: 'ai_minimalist_kai',
        email: 'kai.ai@dfashion.com',
        password: plainPassword,
        fullName: 'Kai Thompson',
        role: 'customer',
        isActive: true,
        isVerified: true,
        phone: '+91 9876543224',
        bio: '🌿 AI Minimalist | Capsule Wardrobe Expert | Slow Fashion Advocate | 195K+ Mindful Followers',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        socialStats: {
          postsCount: 156,
          followersCount: 195000,
          followingCount: 650,
          engagementRate: 11.2,
          averageLikes: 21000,
          averageComments: 2100
        },
        preferences: {
          favoriteCategories: ['sustainable-fashion', 'formal-wear', 'workwear'],
          stylePersonality: 'Minimalist professional with sustainable values',
          contentFocus: ['capsule-wardrobe', 'sustainable-living', 'professional-style']
        },
        influencerMetrics: {
          isInfluencer: true,
          tier: 'macro',
          specialties: ['minimalist fashion', 'sustainable living', 'professional wear'],
          collaborationRate: 8000,
          avgPostReach: 95000,
          brandPartnerships: ['MinimalChic', 'EcoWork', 'SustainablePro']
        }
      },
      {
        username: 'ai_glamour_sophia',
        email: 'sophia.ai@dfashion.com',
        password: plainPassword,
        fullName: 'Sophia Williams',
        role: 'customer',
        isActive: true,
        isVerified: true,
        phone: '+91 9876543225',
        bio: '💎 AI Luxury Curator | High Fashion Enthusiast | Red Carpet Specialist | 420K+ Glamour Lovers',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
        socialStats: {
          postsCount: 203,
          followersCount: 418000,
          followingCount: 980,
          engagementRate: 6.9,
          averageLikes: 28000,
          averageComments: 2400
        },
        preferences: {
          favoriteCategories: ['designer-collection', 'festival-party', 'beauty-cosmetics'],
          stylePersonality: 'Luxury fashion connoisseur with glamorous taste',
          contentFocus: ['luxury-fashion', 'red-carpet-looks', 'high-end-beauty']
        },
        influencerMetrics: {
          isInfluencer: true,
          tier: 'mega',
          specialties: ['luxury fashion', 'red carpet styling', 'high-end beauty'],
          collaborationRate: 18000,
          avgPostReach: 200000,
          brandPartnerships: ['LuxeStyle', 'GlamourHouse', 'HighEndBeauty']
        }
      }
    ]);
    console.log(`✅ Created ${users.length} users\n`);

    // Get vendor from users array
    const vendor = users[users.length - 1]; // Last user is the vendor

    // 2. Create Categories (10+ records)
    console.log('📂 Creating categories...');

    const categories = await Category.create([
      {
        name: 'Men',
        slug: 'men',
        description: 'Fashion and accessories for men',
        image: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=400',
        icon: '👨',
        isActive: true,
        isFeatured: true,
        sortOrder: 1,
        subcategories: [
          { name: 'Shirts', slug: 'shirts', description: 'Casual and formal shirts' },
          { name: 'T-Shirts', slug: 'tshirts', description: 'Comfortable t-shirts' },
          { name: 'Jeans', slug: 'jeans', description: 'Denim jeans and pants' },
          { name: 'Shoes', slug: 'shoes', description: 'Footwear for men' }
        ],
        seo: {
          metaTitle: 'Men\'s Fashion - DFashion',
          metaDescription: 'Discover the latest men\'s fashion trends and styles',
          metaKeywords: ['men fashion', 'mens clothing', 'mens accessories']
        }
      },
      {
        name: 'Women',
        slug: 'women',
        description: 'Fashion and accessories for women',
        image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
        icon: '👩',
        isActive: true,
        isFeatured: true,
        sortOrder: 2,
        subcategories: [
          { name: 'Dresses', slug: 'dresses', description: 'Beautiful dresses for all occasions' },
          { name: 'Tops', slug: 'tops', description: 'Stylish tops and blouses' },
          { name: 'Sarees', slug: 'sarees', description: 'Traditional Indian sarees' },
          { name: 'Handbags', slug: 'handbags', description: 'Designer handbags and purses' }
        ],
        seo: {
          metaTitle: 'Women\'s Fashion - DFashion',
          metaDescription: 'Explore trendy women\'s fashion and accessories',
          metaKeywords: ['women fashion', 'womens clothing', 'womens accessories']
        }
      },
      {
        name: 'Children',
        slug: 'children',
        description: 'Fashion for kids and children',
        image: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400',
        icon: '👶',
        isActive: true,
        isFeatured: true,
        sortOrder: 3,
        subcategories: [
          { name: 'Boys', slug: 'boys', description: 'Clothing for boys' },
          { name: 'Girls', slug: 'girls', description: 'Clothing for girls' },
          { name: 'Toys', slug: 'toys', description: 'Fashion toys and accessories' }
        ],
        seo: {
          metaTitle: 'Kids Fashion - DFashion',
          metaDescription: 'Cute and comfortable fashion for children',
          metaKeywords: ['kids fashion', 'children clothing', 'baby clothes']
        }
      },
      {
        name: 'Accessories',
        slug: 'accessories',
        description: 'Fashion accessories and jewelry',
        image: 'https://images.unsplash.com/photo-1506629905607-d405b7a30db9?w=400',
        icon: '💎',
        isActive: true,
        isFeatured: true,
        sortOrder: 4,
        subcategories: [
          { name: 'Jewelry', slug: 'jewelry', description: 'Beautiful jewelry pieces' },
          { name: 'Watches', slug: 'watches', description: 'Stylish watches' },
          { name: 'Bags', slug: 'bags', description: 'Handbags and backpacks' },
          { name: 'Sunglasses', slug: 'sunglasses', description: 'Trendy sunglasses' }
        ],
        seo: {
          metaTitle: 'Fashion Accessories - DFashion',
          metaDescription: 'Complete your look with our fashion accessories',
          metaKeywords: ['fashion accessories', 'jewelry', 'watches', 'bags']
        }
      },
      {
        name: 'Footwear',
        slug: 'footwear',
        description: 'Shoes and footwear for all',
        image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
        icon: '👟',
        isActive: true,
        isFeatured: true,
        sortOrder: 5,
        subcategories: [
          { name: 'Sneakers', slug: 'sneakers', description: 'Casual sneakers' },
          { name: 'Formal Shoes', slug: 'formal-shoes', description: 'Professional footwear' },
          { name: 'Sandals', slug: 'sandals', description: 'Comfortable sandals' },
          { name: 'Boots', slug: 'boots', description: 'Stylish boots' }
        ],
        seo: {
          metaTitle: 'Footwear Collection - DFashion',
          metaDescription: 'Step out in style with our footwear collection',
          metaKeywords: ['footwear', 'shoes', 'sneakers', 'boots']
        }
      },
      {
        name: 'Ethnic Wear',
        slug: 'ethnic-wear',
        description: 'Traditional and ethnic clothing',
        image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400',
        icon: '🥻',
        isActive: true,
        isFeatured: true,
        sortOrder: 6,
        subcategories: [
          { name: 'Kurtas', slug: 'kurtas', description: 'Traditional kurtas' },
          { name: 'Lehengas', slug: 'lehengas', description: 'Beautiful lehengas' },
          { name: 'Sherwanis', slug: 'sherwanis', description: 'Elegant sherwanis' }
        ],
        seo: {
          metaTitle: 'Ethnic Wear - DFashion',
          metaDescription: 'Traditional Indian ethnic wear collection',
          metaKeywords: ['ethnic wear', 'traditional clothing', 'indian fashion']
        }
      },
      {
        name: 'Sportswear',
        slug: 'sportswear',
        description: 'Athletic and sports clothing',
        image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
        icon: '🏃',
        isActive: true,
        isFeatured: false,
        sortOrder: 7,
        subcategories: [
          { name: 'Gym Wear', slug: 'gym-wear', description: 'Workout clothing' },
          { name: 'Running Gear', slug: 'running-gear', description: 'Running essentials' },
          { name: 'Yoga Wear', slug: 'yoga-wear', description: 'Comfortable yoga clothing' }
        ],
        seo: {
          metaTitle: 'Sportswear - DFashion',
          metaDescription: 'High-performance sportswear and athletic clothing',
          metaKeywords: ['sportswear', 'athletic wear', 'gym clothes']
        }
      },
      {
        name: 'Winter Wear',
        slug: 'winter-wear',
        description: 'Warm clothing for winter season',
        image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400',
        icon: '🧥',
        isActive: true,
        isFeatured: false,
        sortOrder: 8,
        subcategories: [
          { name: 'Jackets', slug: 'jackets', description: 'Warm jackets and coats' },
          { name: 'Sweaters', slug: 'sweaters', description: 'Cozy sweaters' },
          { name: 'Hoodies', slug: 'hoodies', description: 'Comfortable hoodies' }
        ],
        seo: {
          metaTitle: 'Winter Wear - DFashion',
          metaDescription: 'Stay warm with our winter clothing collection',
          metaKeywords: ['winter wear', 'jackets', 'sweaters', 'warm clothes']
        }
      },
      {
        name: 'Summer Collection',
        slug: 'summer-collection',
        description: 'Light and breezy summer clothing',
        image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400',
        icon: '☀️',
        isActive: true,
        isFeatured: false,
        sortOrder: 9,
        subcategories: [
          { name: 'Cotton Wear', slug: 'cotton-wear', description: 'Breathable cotton clothing' },
          { name: 'Shorts', slug: 'shorts', description: 'Comfortable shorts' },
          { name: 'Tank Tops', slug: 'tank-tops', description: 'Cool tank tops' }
        ],
        seo: {
          metaTitle: 'Summer Collection - DFashion',
          metaDescription: 'Beat the heat with our summer fashion collection',
          metaKeywords: ['summer fashion', 'cotton wear', 'light clothing']
        }
      },
      {
        name: 'Formal Wear',
        slug: 'formal-wear',
        description: 'Professional and formal clothing',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
        icon: '👔',
        isActive: true,
        isFeatured: false,
        sortOrder: 10,
        subcategories: [
          { name: 'Suits', slug: 'suits', description: 'Professional suits' },
          { name: 'Blazers', slug: 'blazers', description: 'Stylish blazers' },
          { name: 'Formal Shirts', slug: 'formal-shirts', description: 'Professional shirts' }
        ],
        seo: {
          metaTitle: 'Formal Wear - DFashion',
          metaDescription: 'Professional formal wear for office and events',
          metaKeywords: ['formal wear', 'suits', 'professional clothing']
        }
      },
      {
        name: 'Beauty & Cosmetics',
        slug: 'beauty-cosmetics',
        description: 'Beauty products and cosmetics',
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
        icon: '💄',
        isActive: true,
        isFeatured: true,
        sortOrder: 11,
        subcategories: [
          { name: 'Makeup', slug: 'makeup', description: 'Face and eye makeup' },
          { name: 'Skincare', slug: 'skincare', description: 'Skincare products' },
          { name: 'Fragrances', slug: 'fragrances', description: 'Perfumes and body sprays' },
          { name: 'Hair Care', slug: 'hair-care', description: 'Hair styling and care products' }
        ],
        seo: {
          metaTitle: 'Beauty & Cosmetics - DFashion',
          metaDescription: 'Premium beauty products and cosmetics',
          metaKeywords: ['beauty', 'cosmetics', 'makeup', 'skincare']
        }
      },
      {
        name: 'Lingerie & Innerwear',
        slug: 'lingerie-innerwear',
        description: 'Intimate apparel and undergarments',
        image: 'https://images.unsplash.com/photo-1571513722275-4b8c2fd1a06b?w=400',
        icon: '👙',
        isActive: true,
        isFeatured: false,
        sortOrder: 12,
        subcategories: [
          { name: 'Bras', slug: 'bras', description: 'Comfortable and stylish bras' },
          { name: 'Panties', slug: 'panties', description: 'Everyday and special occasion panties' },
          { name: 'Sleepwear', slug: 'sleepwear', description: 'Comfortable nightwear' },
          { name: 'Men\'s Underwear', slug: 'mens-underwear', description: 'Men\'s undergarments' }
        ],
        seo: {
          metaTitle: 'Lingerie & Innerwear - DFashion',
          metaDescription: 'Comfortable and stylish intimate apparel',
          metaKeywords: ['lingerie', 'innerwear', 'undergarments', 'sleepwear']
        }
      },
      {
        name: 'Home & Living',
        slug: 'home-living',
        description: 'Home decor and lifestyle products',
        image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400',
        icon: '🏠',
        isActive: true,
        isFeatured: false,
        sortOrder: 13,
        subcategories: [
          { name: 'Bedding', slug: 'bedding', description: 'Bed sheets and pillows' },
          { name: 'Curtains', slug: 'curtains', description: 'Window treatments' },
          { name: 'Cushions', slug: 'cushions', description: 'Decorative cushions' },
          { name: 'Rugs', slug: 'rugs', description: 'Floor rugs and carpets' }
        ],
        seo: {
          metaTitle: 'Home & Living - DFashion',
          metaDescription: 'Stylish home decor and living essentials',
          metaKeywords: ['home decor', 'bedding', 'curtains', 'lifestyle']
        }
      },
      {
        name: 'Maternity Wear',
        slug: 'maternity-wear',
        description: 'Comfortable clothing for expecting mothers',
        image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
        icon: '🤱',
        isActive: true,
        isFeatured: false,
        sortOrder: 14,
        subcategories: [
          { name: 'Maternity Tops', slug: 'maternity-tops', description: 'Comfortable maternity tops' },
          { name: 'Maternity Dresses', slug: 'maternity-dresses', description: 'Stylish maternity dresses' },
          { name: 'Maternity Jeans', slug: 'maternity-jeans', description: 'Comfortable maternity jeans' },
          { name: 'Nursing Wear', slug: 'nursing-wear', description: 'Nursing-friendly clothing' }
        ],
        seo: {
          metaTitle: 'Maternity Wear - DFashion',
          metaDescription: 'Comfortable and stylish maternity clothing',
          metaKeywords: ['maternity wear', 'pregnancy clothes', 'nursing wear']
        }
      },
      {
        name: 'Plus Size',
        slug: 'plus-size',
        description: 'Fashionable clothing in extended sizes',
        image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400',
        icon: '👗',
        isActive: true,
        isFeatured: true,
        sortOrder: 15,
        subcategories: [
          { name: 'Plus Size Tops', slug: 'plus-size-tops', description: 'Stylish plus size tops' },
          { name: 'Plus Size Dresses', slug: 'plus-size-dresses', description: 'Beautiful plus size dresses' },
          { name: 'Plus Size Jeans', slug: 'plus-size-jeans', description: 'Comfortable plus size jeans' },
          { name: 'Plus Size Activewear', slug: 'plus-size-activewear', description: 'Plus size workout clothes' }
        ],
        seo: {
          metaTitle: 'Plus Size Fashion - DFashion',
          metaDescription: 'Trendy fashion in extended sizes',
          metaKeywords: ['plus size', 'extended sizes', 'curvy fashion']
        }
      },
      {
        name: 'Vintage & Retro',
        slug: 'vintage-retro',
        description: 'Classic vintage and retro fashion',
        image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
        icon: '🕰️',
        isActive: true,
        isFeatured: false,
        sortOrder: 16,
        subcategories: [
          { name: 'Vintage Dresses', slug: 'vintage-dresses', description: 'Classic vintage dresses' },
          { name: 'Retro Tops', slug: 'retro-tops', description: 'Retro style tops' },
          { name: 'Vintage Accessories', slug: 'vintage-accessories', description: 'Classic accessories' },
          { name: 'Retro Footwear', slug: 'retro-footwear', description: 'Vintage style shoes' }
        ],
        seo: {
          metaTitle: 'Vintage & Retro Fashion - DFashion',
          metaDescription: 'Classic vintage and retro fashion pieces',
          metaKeywords: ['vintage', 'retro', 'classic fashion', 'throwback']
        }
      },
      {
        name: 'Sustainable Fashion',
        slug: 'sustainable-fashion',
        description: 'Eco-friendly and sustainable clothing',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
        icon: '🌱',
        isActive: true,
        isFeatured: true,
        sortOrder: 17,
        subcategories: [
          { name: 'Organic Cotton', slug: 'organic-cotton', description: 'Organic cotton clothing' },
          { name: 'Recycled Materials', slug: 'recycled-materials', description: 'Clothes from recycled materials' },
          { name: 'Eco-Friendly Dyes', slug: 'eco-friendly-dyes', description: 'Naturally dyed clothing' },
          { name: 'Upcycled Fashion', slug: 'upcycled-fashion', description: 'Upcycled and repurposed clothing' }
        ],
        seo: {
          metaTitle: 'Sustainable Fashion - DFashion',
          metaDescription: 'Eco-friendly and sustainable fashion choices',
          metaKeywords: ['sustainable fashion', 'eco-friendly', 'organic', 'green fashion']
        }
      },
      {
        name: 'Designer Collection',
        slug: 'designer-collection',
        description: 'Premium designer fashion pieces',
        image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
        icon: '✨',
        isActive: true,
        isFeatured: true,
        sortOrder: 18,
        subcategories: [
          { name: 'Designer Dresses', slug: 'designer-dresses', description: 'Luxury designer dresses' },
          { name: 'Designer Bags', slug: 'designer-bags', description: 'Premium designer handbags' },
          { name: 'Designer Shoes', slug: 'designer-shoes', description: 'Luxury footwear' },
          { name: 'Designer Jewelry', slug: 'designer-jewelry', description: 'High-end jewelry pieces' }
        ],
        seo: {
          metaTitle: 'Designer Collection - DFashion',
          metaDescription: 'Luxury designer fashion and accessories',
          metaKeywords: ['designer fashion', 'luxury', 'premium', 'high-end']
        }
      },
      {
        name: 'Street Style',
        slug: 'street-style',
        description: 'Urban and street fashion',
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
        icon: '🏙️',
        isActive: true,
        isFeatured: false,
        sortOrder: 19,
        subcategories: [
          { name: 'Hoodies & Sweatshirts', slug: 'hoodies-sweatshirts', description: 'Urban hoodies and sweatshirts' },
          { name: 'Graphic Tees', slug: 'graphic-tees', description: 'Statement graphic t-shirts' },
          { name: 'Streetwear Sneakers', slug: 'streetwear-sneakers', description: 'Trendy street sneakers' },
          { name: 'Urban Accessories', slug: 'urban-accessories', description: 'Street style accessories' }
        ],
        seo: {
          metaTitle: 'Street Style Fashion - DFashion',
          metaDescription: 'Urban street fashion and trendy streetwear',
          metaKeywords: ['street style', 'urban fashion', 'streetwear', 'trendy']
        }
      },
      {
        name: 'Workwear',
        slug: 'workwear',
        description: 'Professional workwear and uniforms',
        image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
        icon: '💼',
        isActive: true,
        isFeatured: false,
        sortOrder: 20,
        subcategories: [
          { name: 'Office Wear', slug: 'office-wear', description: 'Professional office clothing' },
          { name: 'Scrubs', slug: 'scrubs', description: 'Medical scrubs and uniforms' },
          { name: 'Chef Wear', slug: 'chef-wear', description: 'Chef uniforms and aprons' },
          { name: 'Safety Wear', slug: 'safety-wear', description: 'Industrial safety clothing' }
        ],
        seo: {
          metaTitle: 'Workwear & Uniforms - DFashion',
          metaDescription: 'Professional workwear and uniform solutions',
          metaKeywords: ['workwear', 'uniforms', 'professional clothing', 'office wear']
        }
      },
      {
        name: 'Festival & Party',
        slug: 'festival-party',
        description: 'Festive and party wear collection',
        image: 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=400',
        icon: '🎉',
        isActive: true,
        isFeatured: true,
        sortOrder: 21,
        subcategories: [
          { name: 'Party Dresses', slug: 'party-dresses', description: 'Glamorous party dresses' },
          { name: 'Festival Outfits', slug: 'festival-outfits', description: 'Colorful festival clothing' },
          { name: 'Cocktail Wear', slug: 'cocktail-wear', description: 'Elegant cocktail attire' },
          { name: 'Dance Costumes', slug: 'dance-costumes', description: 'Performance and dance wear' }
        ],
        seo: {
          metaTitle: 'Festival & Party Wear - DFashion',
          metaDescription: 'Stunning festival and party wear collection',
          metaKeywords: ['party wear', 'festival fashion', 'cocktail dress', 'celebration']
        }
      },
      {
        name: 'Travel & Vacation',
        slug: 'travel-vacation',
        description: 'Comfortable travel and vacation wear',
        image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400',
        icon: '✈️',
        isActive: true,
        isFeatured: false,
        sortOrder: 22,
        subcategories: [
          { name: 'Resort Wear', slug: 'resort-wear', description: 'Relaxed resort clothing' },
          { name: 'Beach Wear', slug: 'beach-wear', description: 'Beach and swimwear' },
          { name: 'Travel Accessories', slug: 'travel-accessories', description: 'Travel-friendly accessories' },
          { name: 'Comfortable Shoes', slug: 'comfortable-shoes', description: 'Walking and travel shoes' }
        ],
        seo: {
          metaTitle: 'Travel & Vacation Wear - DFashion',
          metaDescription: 'Comfortable and stylish travel clothing',
          metaKeywords: ['travel wear', 'vacation clothes', 'resort fashion', 'beach wear']
        }
      }
    ]);
    console.log(`✅ Created ${categories.length} categories\n`);

    // 3. Create Brands (10+ records)
    console.log('🏷️ Creating brands...');
    const brands = await Brand.create([
      {
        name: 'Zara',
        slug: 'zara',
        description: 'International fashion retailer known for trendy and affordable clothing',
        logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop',
        website: 'https://www.zara.com',
        isActive: true,
        isFeatured: true,
        productCount: 0,
        avgRating: 4.3,
        totalViews: 125000
      },
      {
        name: 'H&M',
        slug: 'hm',
        description: 'Swedish multinational clothing-retail company known for fast-fashion',
        logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop',
        website: 'https://www.hm.com',
        isActive: true,
        isFeatured: true,
        productCount: 0,
        avgRating: 4.1,
        totalViews: 98000
      },
      {
        name: 'Nike',
        slug: 'nike',
        description: 'American multinational corporation engaged in design and manufacturing of footwear and apparel',
        logo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop',
        website: 'https://www.nike.com',
        isActive: true,
        isFeatured: true,
        productCount: 0,
        avgRating: 4.5,
        totalViews: 156000
      },
      {
        name: 'Adidas',
        slug: 'adidas',
        description: 'German multinational corporation that designs and manufactures shoes, clothing and accessories',
        logo: 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=200&h=200&fit=crop',
        website: 'https://www.adidas.com',
        isActive: true,
        isFeatured: true,
        productCount: 0,
        avgRating: 4.4,
        totalViews: 142000
      },
      {
        name: 'Uniqlo',
        slug: 'uniqlo',
        description: 'Japanese casual wear designer, manufacturer and retailer',
        logo: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=200&h=200&fit=crop',
        website: 'https://www.uniqlo.com',
        isActive: true,
        isFeatured: true,
        productCount: 0,
        avgRating: 4.2,
        totalViews: 87000
      },
      {
        name: 'Gucci',
        slug: 'gucci',
        description: 'Italian luxury brand of fashion and leather goods',
        logo: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=200&h=200&fit=crop',
        website: 'https://www.gucci.com',
        isActive: true,
        isFeatured: true,
        productCount: 0,
        avgRating: 4.7,
        totalViews: 203000
      },
      {
        name: 'Prada',
        slug: 'prada',
        description: 'Italian luxury fashion house specializing in leather handbags, travel accessories, shoes, ready-to-wear, perfumes and other fashion accessories',
        logo: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=200&h=200&fit=crop',
        website: 'https://www.prada.com',
        isActive: true,
        isFeatured: true,
        productCount: 0,
        avgRating: 4.6,
        totalViews: 178000
      },
      {
        name: 'Versace',
        slug: 'versace',
        description: 'Italian luxury fashion company and trade name founded by Gianni Versace',
        logo: 'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=200&h=200&fit=crop',
        website: 'https://www.versace.com',
        isActive: true,
        isFeatured: false,
        productCount: 0,
        avgRating: 4.5,
        totalViews: 134000
      },
      {
        name: 'ComfortWear',
        slug: 'comfortwear',
        description: 'Premium comfort clothing brand focusing on quality and everyday wear',
        logo: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=200&h=200&fit=crop',
        website: 'https://www.comfortwear.com',
        isActive: true,
        isFeatured: false,
        productCount: 0,
        avgRating: 4.0,
        totalViews: 45000
      },
      {
        name: 'StyleHub',
        slug: 'stylehub',
        description: 'Contemporary fashion for modern lifestyle',
        logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop',
        website: 'https://www.stylehub.com',
        isActive: true,
        isFeatured: false,
        productCount: 0,
        avgRating: 3.9,
        totalViews: 32000
      }
    ]);
    console.log(`✅ Created ${brands.length} brands\n`);

    // 4. Create Products (10+ records)
    console.log('🛍️ Creating products...');
    const products = await Product.create([
      {
        name: 'Premium Cotton T-Shirt',
        description: 'High-quality 100% cotton t-shirt with comfortable fit. Perfect for casual wear and daily use.',
        price: 899,
        originalPrice: 1299,
        discount: 31,
        category: 'men',
        subcategory: 'shirts',
        brand: 'ComfortWear',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', alt: 'Cotton T-Shirt', isPrimary: true }
        ],
        sizes: [
          { size: 'S', stock: 25 },
          { size: 'M', stock: 30 },
          { size: 'L', stock: 20 },
          { size: 'XL', stock: 15 }
        ],
        colors: [
          { name: 'White', code: '#FFFFFF' },
          { name: 'Black', code: '#000000' },
          { name: 'Navy', code: '#000080' }
        ],
        tags: ['cotton', 'casual', 'comfortable', 'basic'],
        material: '100% Cotton',
        careInstructions: 'Machine wash cold, tumble dry low',
        isActive: true,
        isFeatured: true,
        isTrending: true,
        isNewArrival: false,
        isSuggested: true,
        rating: { average: 4.2, count: 156 }
      },
      {
        name: 'Elegant Summer Dress',
        description: 'Beautiful floral summer dress made from breathable fabric. Perfect for parties and casual outings.',
        price: 2499,
        originalPrice: 3499,
        discount: 29,
        category: 'women',
        subcategory: 'dresses',
        brand: 'StyleHub',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400', alt: 'Summer Dress', isPrimary: true }
        ],
        sizes: [
          { size: 'S', stock: 15 },
          { size: 'M', stock: 20 },
          { size: 'L', stock: 18 },
          { size: 'XL', stock: 12 }
        ],
        colors: [
          { name: 'Floral Blue', code: '#4169E1' },
          { name: 'Floral Pink', code: '#FFB6C1' }
        ],
        tags: ['summer', 'floral', 'party', 'elegant'],
        material: 'Polyester blend',
        careInstructions: 'Hand wash recommended, dry clean for best results',
        isActive: true,
        isFeatured: true,
        isTrending: true,
        isNewArrival: true,
        rating: { average: 4.5, count: 89 }
      },
      {
        name: 'Classic Denim Jeans',
        description: 'Premium quality denim jeans with perfect fit and durability. A wardrobe essential for every man.',
        price: 2999,
        originalPrice: 3999,
        discount: 25,
        category: 'men',
        subcategory: 'pants',
        brand: 'DenimCo',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400', alt: 'Denim Jeans', isPrimary: true }
        ],
        sizes: [
          { size: '30', stock: 10 },
          { size: '32', stock: 15 },
          { size: '34', stock: 12 },
          { size: '36', stock: 8 }
        ],
        colors: [
          { name: 'Dark Blue', code: '#191970' },
          { name: 'Light Blue', code: '#ADD8E6' }
        ],
        tags: ['denim', 'classic', 'durable', 'essential'],
        material: '98% Cotton, 2% Elastane',
        careInstructions: 'Machine wash cold, hang dry',
        isActive: true,
        isFeatured: false,
        isTrending: true,
        isNewArrival: false,
        rating: { average: 4.1, count: 203 }
      },
      {
        name: 'Leather Handbag',
        description: 'Genuine leather handbag with multiple compartments. Perfect for office and casual use.',
        price: 4999,
        originalPrice: 6999,
        discount: 29,
        category: 'women',
        subcategory: 'accessories',
        brand: 'LuxeBags',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', alt: 'Leather Handbag', isPrimary: true }
        ],
        sizes: [
          { size: 'One Size', stock: 20 }
        ],
        colors: [
          { name: 'Black', code: '#000000' },
          { name: 'Brown', code: '#8B4513' },
          { name: 'Tan', code: '#D2B48C' }
        ],
        tags: ['leather', 'handbag', 'office', 'premium'],
        material: 'Genuine Leather',
        careInstructions: 'Clean with leather cleaner, store in dust bag',
        isActive: true,
        isFeatured: true,
        isTrending: false,
        isNewArrival: true,
        rating: { average: 4.7, count: 67 }
      },
      {
        name: 'Sports Running Shoes',
        description: 'High-performance running shoes with advanced cushioning and breathable mesh upper.',
        price: 3999,
        originalPrice: 5499,
        discount: 27,
        category: 'men',
        subcategory: 'shoes',
        brand: 'SportsPro',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', alt: 'Running Shoes', isPrimary: true }
        ],
        sizes: [
          { size: '7', stock: 8 },
          { size: '8', stock: 12 },
          { size: '9', stock: 15 },
          { size: '10', stock: 10 },
          { size: '11', stock: 5 }
        ],
        colors: [
          { name: 'Black/White', code: '#000000' },
          { name: 'Blue/White', code: '#0000FF' }
        ],
        tags: ['sports', 'running', 'comfortable', 'breathable'],
        material: 'Mesh upper, rubber sole',
        careInstructions: 'Clean with damp cloth, air dry',
        isActive: true,
        isFeatured: true,
        isTrending: true,
        isNewArrival: false,
        rating: { average: 4.3, count: 124 }
      },
      {
        name: 'Designer Silk Saree',
        description: 'Exquisite handwoven silk saree with traditional motifs. Perfect for weddings and special occasions.',
        price: 8999,
        originalPrice: 12999,
        discount: 31,
        category: 'women',
        subcategory: 'ethnic',
        brand: 'SilkCraft',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400', alt: 'Silk Saree', isPrimary: true }
        ],
        sizes: [
          { size: 'One Size', stock: 15 }
        ],
        colors: [
          { name: 'Royal Blue', code: '#4169E1' },
          { name: 'Maroon', code: '#800000' },
          { name: 'Golden', code: '#FFD700' }
        ],
        tags: ['silk', 'traditional', 'wedding', 'ethnic'],
        material: 'Pure Silk',
        careInstructions: 'Dry clean only',
        isActive: true,
        isFeatured: true,
        isTrending: false,
        isNewArrival: true,
        rating: { average: 4.8, count: 89 }
      },
      {
        name: 'Casual Sneakers',
        description: 'Trendy casual sneakers with comfortable sole. Perfect for everyday wear and light activities.',
        price: 2499,
        originalPrice: 3499,
        discount: 29,
        category: 'men',
        subcategory: 'shoes',
        brand: 'UrbanStep',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400', alt: 'Casual Sneakers', isPrimary: true }
        ],
        sizes: [
          { size: '7', stock: 12 },
          { size: '8', stock: 18 },
          { size: '9', stock: 20 },
          { size: '10', stock: 15 },
          { size: '11', stock: 8 }
        ],
        colors: [
          { name: 'White', code: '#FFFFFF' },
          { name: 'Black', code: '#000000' },
          { name: 'Gray', code: '#808080' }
        ],
        tags: ['casual', 'sneakers', 'comfortable', 'trendy'],
        material: 'Canvas and rubber',
        careInstructions: 'Clean with damp cloth',
        isActive: true,
        isFeatured: false,
        isTrending: true,
        isNewArrival: true,
        rating: { average: 4.1, count: 203 }
      },
      {
        name: 'Floral Print Kurti',
        description: 'Beautiful floral print kurti made from soft cotton. Ideal for casual and office wear.',
        price: 1299,
        originalPrice: 1899,
        discount: 32,
        category: 'women',
        subcategory: 'tops',
        brand: 'FloralFashion',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400', alt: 'Floral Kurti', isPrimary: true }
        ],
        sizes: [
          { size: 'S', stock: 20 },
          { size: 'M', stock: 25 },
          { size: 'L', stock: 22 },
          { size: 'XL', stock: 18 },
          { size: 'XXL', stock: 10 }
        ],
        colors: [
          { name: 'Pink Floral', code: '#FFB6C1' },
          { name: 'Blue Floral', code: '#87CEEB' },
          { name: 'Green Floral', code: '#98FB98' }
        ],
        tags: ['kurti', 'floral', 'cotton', 'casual'],
        material: '100% Cotton',
        careInstructions: 'Machine wash cold',
        isActive: true,
        isFeatured: true,
        isTrending: false,
        isNewArrival: true,
        rating: { average: 4.4, count: 167 }
      },
      {
        name: 'Formal Blazer',
        description: 'Professional formal blazer with slim fit design. Perfect for business meetings and formal events.',
        price: 4999,
        originalPrice: 6999,
        discount: 29,
        category: 'men',
        subcategory: 'jackets',
        brand: 'FormalFit',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', alt: 'Formal Blazer', isPrimary: true }
        ],
        sizes: [
          { size: 'S', stock: 8 },
          { size: 'M', stock: 15 },
          { size: 'L', stock: 18 },
          { size: 'XL', stock: 12 },
          { size: 'XXL', stock: 5 }
        ],
        colors: [
          { name: 'Navy Blue', code: '#000080' },
          { name: 'Charcoal Gray', code: '#36454F' },
          { name: 'Black', code: '#000000' }
        ],
        tags: ['blazer', 'formal', 'professional', 'slim-fit'],
        material: 'Wool blend',
        careInstructions: 'Dry clean only',
        isActive: true,
        isFeatured: false,
        isTrending: true,
        isNewArrival: false,
        rating: { average: 4.6, count: 94 }
      },
      {
        name: 'Kids Party Dress',
        description: 'Adorable party dress for little girls with sparkly details. Perfect for birthdays and celebrations.',
        price: 1899,
        originalPrice: 2499,
        discount: 24,
        category: 'children',
        subcategory: 'dresses',
        brand: 'LittlePrincess',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400', alt: 'Kids Party Dress', isPrimary: true }
        ],
        sizes: [
          { size: '2-3Y', stock: 10 },
          { size: '4-5Y', stock: 15 },
          { size: '6-7Y', stock: 12 },
          { size: '8-9Y', stock: 8 }
        ],
        colors: [
          { name: 'Pink', code: '#FFC0CB' },
          { name: 'Purple', code: '#800080' },
          { name: 'Blue', code: '#0000FF' }
        ],
        tags: ['kids', 'party', 'dress', 'sparkly'],
        material: 'Polyester with sequins',
        careInstructions: 'Hand wash gently',
        isActive: true,
        isFeatured: true,
        isTrending: false,
        isNewArrival: true,
        rating: { average: 4.7, count: 78 }
      },
      {
        name: 'Leather Wallet',
        description: 'Premium genuine leather wallet with multiple card slots and coin pocket. Durable and stylish.',
        price: 1499,
        originalPrice: 1999,
        discount: 25,
        category: 'men',
        subcategory: 'accessories',
        brand: 'LeatherCraft',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', alt: 'Leather Wallet', isPrimary: true }
        ],
        sizes: [
          { size: 'One Size', stock: 50 }
        ],
        colors: [
          { name: 'Brown', code: '#8B4513' },
          { name: 'Black', code: '#000000' },
          { name: 'Tan', code: '#D2B48C' }
        ],
        tags: ['wallet', 'leather', 'accessories', 'premium'],
        material: 'Genuine Leather',
        careInstructions: 'Clean with leather conditioner',
        isActive: true,
        isFeatured: false,
        isTrending: true,
        isNewArrival: false,
        rating: { average: 4.3, count: 145 }
      },
      {
        name: 'Yoga Leggings',
        description: 'High-waisted yoga leggings with moisture-wicking fabric. Perfect for workouts and yoga sessions.',
        price: 1799,
        originalPrice: 2299,
        discount: 22,
        category: 'women',
        subcategory: 'sportswear',
        brand: 'YogaFit',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400', alt: 'Yoga Leggings', isPrimary: true }
        ],
        sizes: [
          { size: 'XS', stock: 15 },
          { size: 'S', stock: 25 },
          { size: 'M', stock: 30 },
          { size: 'L', stock: 20 },
          { size: 'XL', stock: 12 }
        ],
        colors: [
          { name: 'Black', code: '#000000' },
          { name: 'Navy', code: '#000080' },
          { name: 'Gray', code: '#808080' },
          { name: 'Purple', code: '#800080' }
        ],
        tags: ['yoga', 'leggings', 'sportswear', 'fitness'],
        material: 'Polyester-Spandex blend',
        careInstructions: 'Machine wash cold, hang dry',
        isActive: true,
        isFeatured: true,
        isTrending: true,
        isNewArrival: true,
        rating: { average: 4.5, count: 189 }
      },
      {
        name: 'Winter Jacket',
        description: 'Warm and stylish winter jacket with hood. Water-resistant and perfect for cold weather.',
        price: 5999,
        originalPrice: 7999,
        discount: 25,
        category: 'men',
        subcategory: 'jackets',
        brand: 'WinterWear',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400', alt: 'Winter Jacket', isPrimary: true }
        ],
        sizes: [
          { size: 'S', stock: 10 },
          { size: 'M', stock: 18 },
          { size: 'L', stock: 22 },
          { size: 'XL', stock: 15 },
          { size: 'XXL', stock: 8 }
        ],
        colors: [
          { name: 'Black', code: '#000000' },
          { name: 'Navy', code: '#000080' },
          { name: 'Olive Green', code: '#808000' }
        ],
        tags: ['winter', 'jacket', 'warm', 'waterproof'],
        material: 'Polyester with insulation',
        careInstructions: 'Machine wash cold, tumble dry low',
        isActive: true,
        isFeatured: false,
        isTrending: false,
        isNewArrival: true,
        rating: { average: 4.4, count: 112 }
      },
      {
        name: 'Designer Watch',
        description: 'Elegant designer watch with stainless steel strap. Perfect accessory for any occasion.',
        price: 3499,
        originalPrice: 4999,
        discount: 30,
        category: 'men',
        subcategory: 'accessories',
        brand: 'TimeStyle',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400', alt: 'Designer Watch', isPrimary: true }
        ],
        sizes: [
          { size: 'One Size', stock: 25 }
        ],
        colors: [
          { name: 'Silver', code: '#C0C0C0' },
          { name: 'Gold', code: '#FFD700' },
          { name: 'Black', code: '#000000' }
        ],
        tags: ['watch', 'designer', 'accessories', 'elegant'],
        material: 'Stainless Steel',
        careInstructions: 'Clean with soft cloth',
        isActive: true,
        isFeatured: true,
        isTrending: true,
        isNewArrival: false,
        rating: { average: 4.6, count: 156 }
      },

      // NEW ARRIVALS - Fresh Fashion Collection
      {
        name: 'Trendy Crop Top',
        description: 'Stylish crop top with modern cut and premium fabric. Perfect for casual outings and summer vibes.',
        price: 899,
        originalPrice: 1299,
        discount: 31,
        category: 'women',
        subcategory: 'tops',
        brand: 'TrendyWear',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400', alt: 'Trendy Crop Top', isPrimary: true }
        ],
        sizes: [
          { size: 'XS', stock: 15 },
          { size: 'S', stock: 25 },
          { size: 'M', stock: 30 },
          { size: 'L', stock: 20 },
          { size: 'XL', stock: 10 }
        ],
        colors: [
          { name: 'Coral Pink', code: '#FF7F7F' },
          { name: 'Mint Green', code: '#98FB98' },
          { name: 'Lavender', code: '#E6E6FA' }
        ],
        tags: ['crop-top', 'trendy', 'summer', 'casual'],
        material: '95% Cotton, 5% Elastane',
        careInstructions: 'Machine wash cold, tumble dry low',
        isActive: true,
        isFeatured: false,
        isTrending: false,
        isNewArrival: true,
        rating: { average: 4.3, count: 45 }
      },
      {
        name: 'Oversized Hoodie',
        description: 'Comfortable oversized hoodie with soft fleece lining. Perfect for cozy days and streetwear style.',
        price: 2199,
        originalPrice: 2999,
        discount: 27,
        category: 'men',
        subcategory: 'tops',
        brand: 'StreetStyle',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400', alt: 'Oversized Hoodie', isPrimary: true }
        ],
        sizes: [
          { size: 'S', stock: 20 },
          { size: 'M', stock: 35 },
          { size: 'L', stock: 40 },
          { size: 'XL', stock: 25 },
          { size: 'XXL', stock: 15 }
        ],
        colors: [
          { name: 'Charcoal Gray', code: '#36454F' },
          { name: 'Forest Green', code: '#228B22' },
          { name: 'Burgundy', code: '#800020' }
        ],
        tags: ['hoodie', 'oversized', 'streetwear', 'comfortable'],
        material: '80% Cotton, 20% Polyester',
        careInstructions: 'Machine wash warm, tumble dry medium',
        isActive: true,
        isFeatured: false,
        isTrending: false,
        isNewArrival: true,
        rating: { average: 4.5, count: 67 }
      },
      {
        name: 'High-Waisted Jeans',
        description: 'Vintage-inspired high-waisted jeans with perfect fit and premium denim quality.',
        price: 3299,
        originalPrice: 4199,
        discount: 21,
        category: 'women',
        subcategory: 'pants',
        brand: 'VintageVibes',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400', alt: 'High-Waisted Jeans', isPrimary: true }
        ],
        sizes: [
          { size: '26', stock: 12 },
          { size: '28', stock: 18 },
          { size: '30', stock: 22 },
          { size: '32', stock: 15 },
          { size: '34', stock: 8 }
        ],
        colors: [
          { name: 'Classic Blue', code: '#4169E1' },
          { name: 'Vintage Wash', code: '#6495ED' },
          { name: 'Dark Indigo', code: '#191970' }
        ],
        tags: ['jeans', 'high-waisted', 'vintage', 'denim'],
        material: '99% Cotton, 1% Elastane',
        careInstructions: 'Machine wash cold, hang dry',
        isActive: true,
        isFeatured: true,
        isTrending: false,
        isNewArrival: true,
        rating: { average: 4.6, count: 89 }
      },
      {
        name: 'Minimalist Backpack',
        description: 'Sleek minimalist backpack with laptop compartment and water-resistant material.',
        price: 2799,
        originalPrice: 3499,
        discount: 20,
        category: 'men',
        subcategory: 'accessories',
        brand: 'MinimalCo',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', alt: 'Minimalist Backpack', isPrimary: true }
        ],
        sizes: [
          { size: 'One Size', stock: 40 }
        ],
        colors: [
          { name: 'Matte Black', code: '#28282B' },
          { name: 'Stone Gray', code: '#918E85' },
          { name: 'Navy Blue', code: '#000080' }
        ],
        tags: ['backpack', 'minimalist', 'laptop', 'travel'],
        material: 'Water-resistant nylon',
        careInstructions: 'Spot clean with damp cloth',
        isActive: true,
        isFeatured: false,
        isTrending: false,
        isNewArrival: true,
        rating: { average: 4.4, count: 123 }
      },

      // TRENDING NOW - Popular Fashion Items
      {
        name: 'Viral TikTok Dress',
        description: 'The dress everyone is talking about! Viral sensation with perfect fit and Instagram-worthy style.',
        price: 1999,
        originalPrice: 2799,
        discount: 29,
        category: 'women',
        subcategory: 'dresses',
        brand: 'ViralFashion',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', alt: 'Viral TikTok Dress', isPrimary: true }
        ],
        sizes: [
          { size: 'XS', stock: 8 },
          { size: 'S', stock: 15 },
          { size: 'M', stock: 25 },
          { size: 'L', stock: 18 },
          { size: 'XL', stock: 12 }
        ],
        colors: [
          { name: 'Sage Green', code: '#9CAF88' },
          { name: 'Dusty Rose', code: '#DCAE96' },
          { name: 'Cream White', code: '#F5F5DC' }
        ],
        tags: ['viral', 'tiktok', 'trending', 'instagram'],
        material: '92% Polyester, 8% Elastane',
        careInstructions: 'Hand wash cold, lay flat to dry',
        isActive: true,
        isFeatured: true,
        isTrending: true,
        isNewArrival: false,
        rating: { average: 4.7, count: 234 }
      },
      {
        name: 'Chunky Dad Sneakers',
        description: 'Retro-inspired chunky sneakers that are taking the fashion world by storm. Ultimate comfort meets style.',
        price: 4299,
        originalPrice: 5999,
        discount: 28,
        category: 'men',
        subcategory: 'shoes',
        brand: 'RetroKicks',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400', alt: 'Chunky Dad Sneakers', isPrimary: true }
        ],
        sizes: [
          { size: '6', stock: 10 },
          { size: '7', stock: 15 },
          { size: '8', stock: 20 },
          { size: '9', stock: 25 },
          { size: '10', stock: 18 },
          { size: '11', stock: 12 }
        ],
        colors: [
          { name: 'Triple White', code: '#FFFFFF' },
          { name: 'Beige Mix', code: '#F5F5DC' },
          { name: 'Black/Gray', code: '#2F2F2F' }
        ],
        tags: ['chunky', 'dad-sneakers', 'retro', 'trending'],
        material: 'Leather and mesh upper',
        careInstructions: 'Clean with sneaker cleaner',
        isActive: true,
        isFeatured: true,
        isTrending: true,
        isNewArrival: false,
        rating: { average: 4.5, count: 189 }
      },
      {
        name: 'Y2K Cargo Pants',
        description: 'Y2K revival cargo pants with multiple pockets and relaxed fit. The ultimate Gen-Z fashion statement.',
        price: 2899,
        originalPrice: 3799,
        discount: 24,
        category: 'men',
        subcategory: 'pants',
        brand: 'Y2KRevival',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400', alt: 'Y2K Cargo Pants', isPrimary: true }
        ],
        sizes: [
          { size: 'XS', stock: 12 },
          { size: 'S', stock: 20 },
          { size: 'M', stock: 28 },
          { size: 'L', stock: 22 },
          { size: 'XL', stock: 15 }
        ],
        colors: [
          { name: 'Khaki Green', code: '#C3B091' },
          { name: 'Vintage Black', code: '#36454F' },
          { name: 'Desert Tan', code: '#D2B48C' }
        ],
        tags: ['y2k', 'cargo', 'vintage', 'genz'],
        material: '100% Cotton twill',
        careInstructions: 'Machine wash cold, tumble dry low',
        isActive: true,
        isFeatured: true,
        isTrending: true,
        isNewArrival: false,
        rating: { average: 4.6, count: 167 }
      },
      {
        name: 'Oversized Blazer',
        description: 'Power dressing redefined! Oversized blazer that is dominating fashion feeds and office looks.',
        price: 3999,
        originalPrice: 5499,
        discount: 27,
        category: 'women',
        subcategory: 'jackets',
        brand: 'PowerSuit',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', alt: 'Oversized Blazer', isPrimary: true }
        ],
        sizes: [
          { size: 'XS', stock: 10 },
          { size: 'S', stock: 18 },
          { size: 'M', stock: 25 },
          { size: 'L', stock: 20 },
          { size: 'XL', stock: 12 }
        ],
        colors: [
          { name: 'Classic Black', code: '#000000' },
          { name: 'Camel Brown', code: '#C19A6B' },
          { name: 'Pinstripe Navy', code: '#191970' }
        ],
        tags: ['blazer', 'oversized', 'power-dressing', 'office'],
        material: 'Wool blend with polyester lining',
        careInstructions: 'Dry clean recommended',
        isActive: true,
        isFeatured: true,
        isTrending: true,
        isNewArrival: false,
        rating: { average: 4.8, count: 145 }
      },

      // MORE NEW ARRIVALS - Latest Fashion Drops
      {
        name: 'Sustainable Bamboo T-Shirt',
        description: 'Eco-friendly bamboo fiber t-shirt with ultra-soft texture. Perfect for conscious fashion lovers.',
        price: 1299,
        originalPrice: 1799,
        discount: 28,
        category: 'men',
        subcategory: 'tops',
        brand: 'EcoWear',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', alt: 'Sustainable Bamboo T-Shirt', isPrimary: true }
        ],
        sizes: [
          { size: 'XS', stock: 15 },
          { size: 'S', stock: 25 },
          { size: 'M', stock: 30 },
          { size: 'L', stock: 25 },
          { size: 'XL', stock: 15 }
        ],
        colors: [
          { name: 'Natural White', code: '#F8F8FF' },
          { name: 'Earth Brown', code: '#8B4513' },
          { name: 'Sage Green', code: '#9CAF88' }
        ],
        tags: ['sustainable', 'bamboo', 'eco-friendly', 'soft'],
        material: '95% Bamboo fiber, 5% Elastane',
        careInstructions: 'Machine wash cold, air dry',
        isActive: true,
        isFeatured: false,
        isTrending: false,
        isNewArrival: true,
        rating: { average: 4.5, count: 78 }
      },
      {
        name: 'Tech-Wear Joggers',
        description: 'Futuristic tech-wear joggers with multiple zippers and water-resistant fabric. Street style meets function.',
        price: 3599,
        originalPrice: 4799,
        discount: 25,
        category: 'men',
        subcategory: 'pants',
        brand: 'TechStreet',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400', alt: 'Tech-Wear Joggers', isPrimary: true }
        ],
        sizes: [
          { size: 'S', stock: 18 },
          { size: 'M', stock: 25 },
          { size: 'L', stock: 22 },
          { size: 'XL', stock: 15 },
          { size: 'XXL', stock: 10 }
        ],
        colors: [
          { name: 'Tactical Black', code: '#1C1C1C' },
          { name: 'Urban Gray', code: '#696969' },
          { name: 'Olive Drab', code: '#6B8E23' }
        ],
        tags: ['tech-wear', 'joggers', 'futuristic', 'functional'],
        material: 'Water-resistant polyester blend',
        careInstructions: 'Machine wash cold, hang dry',
        isActive: true,
        isFeatured: false,
        isTrending: false,
        isNewArrival: true,
        rating: { average: 4.4, count: 92 }
      },
      {
        name: 'Cottagecore Midi Dress',
        description: 'Romantic cottagecore midi dress with floral embroidery. Perfect for dreamy aesthetic vibes.',
        price: 2799,
        originalPrice: 3599,
        discount: 22,
        category: 'women',
        subcategory: 'dresses',
        brand: 'CottageVibes',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', alt: 'Cottagecore Midi Dress', isPrimary: true }
        ],
        sizes: [
          { size: 'XS', stock: 12 },
          { size: 'S', stock: 20 },
          { size: 'M', stock: 25 },
          { size: 'L', stock: 18 },
          { size: 'XL', stock: 10 }
        ],
        colors: [
          { name: 'Meadow Green', code: '#90EE90' },
          { name: 'Sunset Peach', code: '#FFCBA4' },
          { name: 'Lavender Fields', code: '#E6E6FA' }
        ],
        tags: ['cottagecore', 'midi', 'romantic', 'embroidery'],
        material: '100% Cotton with embroidered details',
        careInstructions: 'Hand wash cold, lay flat to dry',
        isActive: true,
        isFeatured: true,
        isTrending: false,
        isNewArrival: true,
        rating: { average: 4.7, count: 134 }
      },

      // MORE TRENDING - Hot Fashion Items
      {
        name: 'Platform Boots',
        description: 'Chunky platform boots that are everywhere on social media. Bold statement piece for any outfit.',
        price: 4599,
        originalPrice: 6299,
        discount: 27,
        category: 'women',
        subcategory: 'shoes',
        brand: 'PlatformPower',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400', alt: 'Platform Boots', isPrimary: true }
        ],
        sizes: [
          { size: '5', stock: 8 },
          { size: '6', stock: 12 },
          { size: '7', stock: 18 },
          { size: '8', stock: 15 },
          { size: '9', stock: 10 },
          { size: '10', stock: 7 }
        ],
        colors: [
          { name: 'Matte Black', code: '#28282B' },
          { name: 'Patent White', code: '#F8F8FF' },
          { name: 'Metallic Silver', code: '#C0C0C0' }
        ],
        tags: ['platform', 'boots', 'chunky', 'statement'],
        material: 'Synthetic leather with rubber sole',
        careInstructions: 'Clean with damp cloth',
        isActive: true,
        isFeatured: true,
        isTrending: true,
        isNewArrival: false,
        rating: { average: 4.6, count: 203 }
      },
      {
        name: 'Bucket Hat',
        description: 'The comeback king! Trendy bucket hat that is dominating street style and festival fashion.',
        price: 899,
        originalPrice: 1299,
        discount: 31,
        category: 'men',
        subcategory: 'accessories',
        brand: 'StreetHead',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=400', alt: 'Bucket Hat', isPrimary: true }
        ],
        sizes: [
          { size: 'One Size', stock: 50 }
        ],
        colors: [
          { name: 'Classic Black', code: '#000000' },
          { name: 'Khaki Green', code: '#C3B091' },
          { name: 'Tie-Dye Multi', code: '#FF69B4' },
          { name: 'Denim Blue', code: '#6495ED' }
        ],
        tags: ['bucket-hat', 'streetwear', 'festival', 'trending'],
        material: '100% Cotton canvas',
        careInstructions: 'Hand wash cold, air dry',
        isActive: true,
        isFeatured: false,
        isTrending: true,
        isNewArrival: false,
        rating: { average: 4.3, count: 156 }
      },
      {
        name: 'Corset Top',
        description: 'Victorian-inspired corset top that is taking over fashion feeds. Perfect for layering or statement looks.',
        price: 1899,
        originalPrice: 2599,
        discount: 27,
        category: 'women',
        subcategory: 'tops',
        brand: 'VictorianVibes',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400', alt: 'Corset Top', isPrimary: true }
        ],
        sizes: [
          { size: 'XS', stock: 10 },
          { size: 'S', stock: 18 },
          { size: 'M', stock: 22 },
          { size: 'L', stock: 15 },
          { size: 'XL', stock: 8 }
        ],
        colors: [
          { name: 'Midnight Black', code: '#000000' },
          { name: 'Burgundy Wine', code: '#722F37' },
          { name: 'Ivory Cream', code: '#FFFFF0' }
        ],
        tags: ['corset', 'victorian', 'statement', 'layering'],
        material: 'Structured cotton with boning',
        careInstructions: 'Hand wash cold, lay flat to dry',
        isActive: true,
        isFeatured: true,
        isTrending: true,
        isNewArrival: false,
        rating: { average: 4.5, count: 187 }
      },
      {
        name: 'Wide-Leg Trousers',
        description: 'Effortlessly chic wide-leg trousers that are everywhere in fashion magazines. Comfort meets elegance.',
        price: 2999,
        originalPrice: 3999,
        discount: 25,
        category: 'women',
        subcategory: 'pants',
        brand: 'ChicFlow',
        vendor: vendor._id,
        images: [
          { url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400', alt: 'Wide-Leg Trousers', isPrimary: true }
        ],
        sizes: [
          { size: 'XS', stock: 12 },
          { size: 'S', stock: 20 },
          { size: 'M', stock: 25 },
          { size: 'L', stock: 18 },
          { size: 'XL', stock: 10 }
        ],
        colors: [
          { name: 'Camel Beige', code: '#C19A6B' },
          { name: 'Chocolate Brown', code: '#7B3F00' },
          { name: 'Charcoal Gray', code: '#36454F' }
        ],
        tags: ['wide-leg', 'trousers', 'elegant', 'comfortable'],
        material: 'Viscose blend with stretch',
        careInstructions: 'Machine wash cold, hang dry',
        isActive: true,
        isFeatured: true,
        isTrending: true,
        isNewArrival: false,
        rating: { average: 4.7, count: 198 }
      }
    ]);
    console.log(`✅ Created ${products.length} products\n`);

    // 4. Create Orders (10+ records)
    console.log('📦 Creating orders...');

    const orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    const paymentMethods = ['card', 'upi', 'netbanking', 'wallet', 'cod'];
    const paymentStatuses = ['pending', 'paid', 'failed'];

    const orders = [];
    const customers = users.slice(0, -1); // All users except vendor

    for (let i = 0; i < 12; i++) {
      const customer = customers[i % customers.length];
      const orderProducts = products.slice(i % 5, (i % 5) + Math.floor(Math.random() * 3) + 1); // Each order gets 1-3 products

      const orderItems = orderProducts.map(product => ({
        product: product._id,
        quantity: Math.floor(Math.random() * 3) + 1, // 1-3 quantity
        price: product.price,
        size: product.sizes[Math.floor(Math.random() * product.sizes.length)]?.size || 'M',
        color: product.colors[Math.floor(Math.random() * product.colors.length)]?.name || 'Default'
      }));

      const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const taxAmount = Math.round(totalAmount * 0.18); // 18% GST
      const shippingAmount = totalAmount > 2000 ? 0 : 99; // Free shipping above ₹2000

      const order = {
        orderNumber: Order.generateOrderNumber(),
        customer: customer._id,
        items: orderItems,
        totalAmount: totalAmount,
        status: orderStatuses[Math.floor(Math.random() * orderStatuses.length)],
        paymentStatus: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)],
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        shippingAddress: {
          fullName: customer.fullName,
          phone: customer.phone,
          addressLine1: customer.address.street,
          city: customer.address.city,
          state: customer.address.state,
          pincode: customer.address.zipCode,
          country: customer.address.country
        },
        billingAddress: {
          fullName: customer.fullName,
          phone: customer.phone,
          addressLine1: customer.address.street,
          city: customer.address.city,
          state: customer.address.state,
          pincode: customer.address.zipCode,
          country: customer.address.country
        },
        orderDate: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)), // Stagger order dates
        expectedDelivery: new Date(Date.now() + ((7 - i) * 24 * 60 * 60 * 1000)), // 1-7 days delivery
        tax: {
          amount: taxAmount,
          rate: 18
        },
        shipping: {
          amount: shippingAmount,
          method: 'Standard Delivery',
          provider: 'DFashion Logistics'
        },
        vendor: vendor._id
      };

      orders.push(order);
    }

    const createdOrders = await Order.create(orders);
    console.log(`✅ Created ${createdOrders.length} orders\n`);

    // 5. Create Posts (10+ records)
    console.log('📱 Creating posts...');

    const posts = [];
    for (let i = 0; i < 15; i++) {
      const author = users[i % (users.length - 1)]; // Exclude vendor
      const relatedProduct = products[i % products.length];

      posts.push({
        user: author._id,
        caption: [
          'Just got this amazing piece! Love the quality and style 😍 #fashion #style #ootd',
          'Perfect for the season! Highly recommend this to everyone 👌 #shopping #fashion',
          'Great fit and comfortable fabric. Worth every penny! ✨ #quality #comfort',
          'Styling this with my favorite accessories today 💫 #style #accessories',
          'This has become my go-to outfit for casual days 🌟 #casual #everyday',
          'The color is even better in person! So happy with this purchase 💕 #color #happy',
          'Received so many compliments wearing this! 🥰 #compliments #confidence',
          'Quality is top-notch and delivery was super fast ⚡ #quality #delivery',
          'Perfect addition to my wardrobe collection 👗 #wardrobe #collection',
          'Comfortable and stylish - exactly what I was looking for! 🎯 #comfortable #stylish'
        ][i % 10],
        media: [
          {
            type: 'image',
            url: relatedProduct.images[0]?.url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
            alt: `${author.fullName} wearing ${relatedProduct.name}`
          }
        ],
        hashtags: ['fashion', 'style', 'ootd', 'shopping', relatedProduct.category],
        products: [
          {
            product: relatedProduct._id,
            position: { x: 50, y: 30 },
            size: relatedProduct.sizes[0]?.size || 'M',
            color: relatedProduct.colors[0]?.name || 'Default'
          }
        ],
        visibility: 'public',
        analytics: {
          views: Math.floor(Math.random() * 1000) + 100,
          likes: Math.floor(Math.random() * 200) + 10,
          comments: Math.floor(Math.random() * 50) + 2,
          shares: Math.floor(Math.random() * 20) + 1,
          saves: Math.floor(Math.random() * 30) + 5,
          productClicks: Math.floor(Math.random() * 50) + 5,
          purchases: Math.floor(Math.random() * 10) + 1
        },
        settings: {
          allowComments: true,
          allowSharing: true
        }
      });
    }

    const createdPosts = await Post.create(posts);
    console.log(`✅ Created ${createdPosts.length} posts\n`);

    // 6. Create Stories (10+ records)
    console.log('📸 Creating stories...');

    const stories = [];
    for (let i = 0; i < 12; i++) {
      const author = users[i % (users.length - 1)]; // Exclude vendor
      const relatedProduct = products[i % products.length];
      const isVideo = Math.random() > 0.7;

      stories.push({
        user: author._id,
        caption: [
          'Check out my new style! 💫',
          'Shopping haul from today 🛍️',
          'Loving this new addition to my wardrobe ✨',
          'Perfect outfit for the day! 👌',
          'Can\'t stop wearing this! 😍',
          'New favorite piece 💕',
          'Style inspiration for today 🌟',
          'Fresh look, fresh vibes! ⚡',
          'Outfit of the day sorted! 🎯',
          'Fashion mood: ON 🔥'
        ][i % 10],
        media: {
          type: isVideo ? 'video' : 'image',
          url: relatedProduct.images[0]?.url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
          thumbnail: isVideo ? relatedProduct.images[0]?.url : undefined,
          duration: isVideo ? Math.floor(Math.random() * 10) + 5 : undefined
        },
        products: [
          {
            product: relatedProduct._id,
            position: { x: 60, y: 40 },
            size: relatedProduct.sizes[0]?.size || 'M',
            color: relatedProduct.colors[0]?.name || 'Default'
          }
        ],
        analytics: {
          views: Math.floor(Math.random() * 500) + 50,
          likes: Math.floor(Math.random() * 100) + 5,
          shares: Math.floor(Math.random() * 20) + 1,
          productClicks: Math.floor(Math.random() * 30) + 3,
          purchases: Math.floor(Math.random() * 5) + 1
        },
        settings: {
          allowComments: true,
          allowSharing: true,
          visibility: 'public'
        },
        expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 hours from now
      });
    }

    const createdStories = await Story.create(stories);
    console.log(`✅ Created ${createdStories.length} stories\n`);

    // 7. Create Carts (10+ records)
    console.log('🛒 Creating carts...');

    const carts = [];
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      const cartProducts = products.slice(i % 3, (i % 3) + Math.floor(Math.random() * 4) + 1); // 1-4 products per cart

      const cartItems = cartProducts.map(product => ({
        product: product._id,
        quantity: Math.floor(Math.random() * 3) + 1, // 1-3 quantity
        size: product.sizes[Math.floor(Math.random() * product.sizes.length)]?.size || 'M',
        color: product.colors[Math.floor(Math.random() * product.colors.length)]?.name || 'Default',
        price: product.price,
        originalPrice: product.originalPrice,
        addedFrom: ['product', 'post', 'story', 'wishlist'][Math.floor(Math.random() * 4)],
        vendor: product.vendor,
        addedAt: new Date(Date.now() - (Math.random() * 7 * 24 * 60 * 60 * 1000)) // Random time in last 7 days
      }));

      carts.push({
        user: customer._id,
        items: cartItems,
        isActive: true,
        lastUpdated: new Date()
      });
    }

    const createdCarts = await Cart.create(carts);
    console.log(`✅ Created ${createdCarts.length} carts\n`);

    // 8. Create Wishlists (10+ records)
    console.log('💝 Creating wishlists...');

    const wishlists = [];
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      const wishlistProducts = products.slice(i % 4, (i % 4) + Math.floor(Math.random() * 5) + 2); // 2-6 products per wishlist

      const wishlistItems = wishlistProducts.map(product => ({
        product: product._id,
        price: product.price,
        originalPrice: product.originalPrice,
        size: product.sizes[Math.floor(Math.random() * product.sizes.length)]?.size || 'M',
        color: product.colors[Math.floor(Math.random() * product.colors.length)]?.name || 'Default',
        addedFrom: ['product', 'post', 'story', 'cart'][Math.floor(Math.random() * 4)],
        vendor: product.vendor,
        addedAt: new Date(Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000)), // Random time in last 30 days
        notes: Math.random() > 0.7 ? [
          'Perfect for summer!',
          'Need this for the wedding',
          'Love the color',
          'Waiting for sale',
          'Gift for mom',
          'Perfect for office'
        ][Math.floor(Math.random() * 6)] : undefined,
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
      }));

      wishlists.push({
        user: customer._id,
        items: wishlistItems,
        name: `${customer.fullName}'s Wishlist`,
        description: [
          'My favorite fashion picks',
          'Items I\'m planning to buy',
          'Style inspiration collection',
          'Seasonal must-haves',
          'Dream wardrobe pieces'
        ][i % 5],
        isPublic: Math.random() > 0.5,
        shareSettings: {
          allowComments: true,
          allowLikes: true
        }
      });
    }

    const createdWishlists = await Wishlist.create(wishlists);
    console.log(`✅ Created ${createdWishlists.length} wishlists\n`);

    // 9. Create Notifications (20+ records)
    console.log('🔔 Creating notifications...');
    const notifications = [];
    for (let i = 0; i < 25; i++) {
      const recipient = customers[i % customers.length];
      const sender = i % 3 === 0 ? null : customers[(i + 1) % customers.length]; // Some system notifications
      const notificationTypes = [
        'order_placed', 'order_confirmed', 'order_shipped', 'order_delivered',
        'payment_success', 'product_liked', 'user_followed', 'post_liked',
        'post_commented', 'story_viewed', 'new_product', 'promotion',
        'welcome', 'profile_updated'
      ];
      const type = notificationTypes[i % notificationTypes.length];

      notifications.push({
        recipient: recipient._id,
        sender: sender?._id,
        type: type,
        title: {
          'order_placed': 'Order Placed Successfully',
          'order_confirmed': 'Order Confirmed',
          'order_shipped': 'Order Shipped',
          'order_delivered': 'Order Delivered',
          'payment_success': 'Payment Successful',
          'product_liked': 'Someone liked your product',
          'user_followed': 'New Follower',
          'post_liked': 'Post Liked',
          'post_commented': 'New Comment',
          'story_viewed': 'Story Viewed',
          'new_product': 'New Product Available',
          'promotion': 'Special Offer',
          'welcome': 'Welcome to DFashion',
          'profile_updated': 'Profile Updated'
        }[type],
        message: {
          'order_placed': 'Your order has been placed successfully and is being processed.',
          'order_confirmed': 'Your order has been confirmed and will be shipped soon.',
          'order_shipped': 'Your order is on its way! Track your package.',
          'order_delivered': 'Your order has been delivered successfully.',
          'payment_success': 'Payment of ₹' + (Math.floor(Math.random() * 5000) + 500) + ' processed successfully.',
          'product_liked': sender?.fullName + ' liked your product.',
          'user_followed': sender?.fullName + ' started following you.',
          'post_liked': sender?.fullName + ' liked your post.',
          'post_commented': sender?.fullName + ' commented on your post.',
          'story_viewed': sender?.fullName + ' viewed your story.',
          'new_product': 'Check out the latest arrivals in your favorite category.',
          'promotion': 'Get 20% off on your next purchase. Limited time offer!',
          'welcome': 'Welcome to DFashion! Start exploring amazing fashion.',
          'profile_updated': 'Your profile has been updated successfully.'
        }[type],
        isRead: Math.random() > 0.4, // 60% read
        readAt: Math.random() > 0.4 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
        metadata: {
          orderId: type.includes('order') ? createdOrders[i % createdOrders.length]?._id : undefined,
          productId: type.includes('product') ? products[i % products.length]?._id : undefined,
          postId: type.includes('post') ? createdPosts[i % createdPosts.length]?._id : undefined,
          storyId: type.includes('story') ? createdStories[i % createdStories.length]?._id : undefined
        },
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        category: ['system', 'social', 'order', 'marketing'][Math.floor(Math.random() * 4)],
        isArchived: Math.random() > 0.9, // 10% archived
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Last 30 days
      });
    }
    const createdNotifications = await Notification.create(notifications);
    console.log(`✅ Created ${createdNotifications.length} notifications\n`);

    // 10. Create Payments (15+ records)
    console.log('💳 Creating payments...');
    const payments = [];
    for (let i = 0; i < createdOrders.length; i++) {
      const order = createdOrders[i];
      const paymentMethods = ['card', 'upi', 'netbanking', 'wallet', 'cod'];
      const paymentGateways = ['razorpay', 'stripe', 'payu', 'cashfree'];
      const statuses = ['completed', 'completed', 'completed', 'pending', 'failed']; // Mostly completed

      const paymentMethod = paymentMethods[i % paymentMethods.length];
      const status = statuses[i % statuses.length];

      payments.push({
        order: order._id,
        customer: order.customer,
        amount: order.totalAmount,
        currency: 'INR',
        paymentMethod: paymentMethod,
        paymentGateway: paymentMethod !== 'cod' ? paymentGateways[i % paymentGateways.length] : undefined,
        gatewayTransactionId: paymentMethod !== 'cod' ? `TXN${Date.now()}${i}` : undefined,
        gatewayPaymentId: paymentMethod !== 'cod' ? `PAY${Date.now()}${i}` : undefined,
        gatewayOrderId: paymentMethod !== 'cod' ? `ORD${Date.now()}${i}` : undefined,
        status: status,
        paymentDetails: {
          cardLast4: paymentMethod === 'card' ? `${Math.floor(Math.random() * 9000) + 1000}` : undefined,
          cardBrand: paymentMethod === 'card' ? ['Visa', 'Mastercard', 'RuPay'][i % 3] : undefined,
          upiId: paymentMethod === 'upi' ? `user${i}@paytm` : undefined,
          bankName: paymentMethod === 'netbanking' ? ['SBI', 'HDFC', 'ICICI', 'Axis'][i % 4] : undefined,
          walletProvider: paymentMethod === 'wallet' ? ['Paytm', 'PhonePe', 'GooglePay'][i % 3] : undefined
        },
        failureReason: status === 'failed' ? 'Insufficient funds' : undefined,
        metadata: {
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          deviceInfo: 'Desktop'
        },
        timeline: [{
          status: 'pending',
          timestamp: new Date(order.createdAt),
          notes: 'Payment initiated'
        }, {
          status: status,
          timestamp: new Date(order.createdAt.getTime() + (Math.random() * 60 * 60 * 1000)), // Within 1 hour
          notes: status === 'completed' ? 'Payment processed successfully' :
                 status === 'failed' ? 'Payment failed due to insufficient funds' : 'Payment pending'
        }]
      });
    }
    const createdPayments = await Payment.create(payments);
    console.log(`✅ Created ${createdPayments.length} payments\n`);

    // 11. Create Reels (12+ records)
    console.log('🎬 Creating reels...');
    const reels = [];
    for (let i = 0; i < 15; i++) {
      const author = customers[i % customers.length];
      const relatedProduct = products[i % products.length];

      reels.push({
        title: [
          'Fashion Haul 2024',
          'OOTD Styling Tips',
          'Unboxing My Latest Purchase',
          'How to Style This Look',
          'Fashion Transformation',
          'Trending Fashion Alert',
          'My Wardrobe Essentials',
          'Fashion Do\'s and Don\'ts',
          'Style Challenge',
          'Fashion Week Inspired Look',
          'Budget Fashion Finds',
          'Seasonal Style Guide',
          'Fashion Hacks You Need',
          'Outfit Ideas for Work',
          'Weekend Fashion Vibes'
        ][i % 15],
        description: [
          'Check out my latest fashion haul with amazing pieces!',
          'Sharing my daily outfit inspiration with you all',
          'Unboxing and trying on my new favorite pieces',
          'Step by step styling guide for this trendy look',
          'Before and after fashion transformation',
          'Latest fashion trends you need to know about',
          'Essential pieces every wardrobe needs',
          'Common fashion mistakes and how to avoid them',
          'Taking on the latest fashion challenge',
          'Recreating runway looks with affordable pieces',
          'Amazing fashion finds under budget',
          'Perfect outfits for every season',
          'Quick fashion tips and tricks',
          'Professional outfit ideas for work',
          'Casual and comfortable weekend styles'
        ][i % 15],
        user: author._id,
        media: {
          type: 'video',
          url: `https://example.com/reels/video_${i + 1}.mp4`,
          thumbnail: relatedProduct.images[0]?.url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
          duration: Math.floor(Math.random() * 60) + 15, // 15-75 seconds
          size: Math.floor(Math.random() * 50000000) + 10000000, // 10-60MB
          resolution: {
            width: 1080,
            height: 1920
          }
        },
        hashtags: [
          ['fashion', 'style', 'ootd', 'trending'],
          ['fashionhaul', 'shopping', 'newcollection'],
          ['styletips', 'fashionhacks', 'styling'],
          ['transformation', 'makeover', 'beforeafter'],
          ['budget', 'affordable', 'deals'],
          ['workwear', 'professional', 'office'],
          ['casual', 'weekend', 'comfort'],
          ['seasonal', 'winter', 'summer'],
          ['trendy', 'viral', 'popular']
        ][i % 9],
        products: [{
          product: relatedProduct._id,
          position: { x: Math.floor(Math.random() * 80) + 10, y: Math.floor(Math.random() * 80) + 10 },
          size: relatedProduct.sizes[0]?.size || 'M',
          color: relatedProduct.colors[0]?.name || 'Default'
        }],
        music: {
          title: `Trending Song ${i + 1}`,
          artist: `Artist ${i + 1}`,
          url: `https://example.com/music/song_${i + 1}.mp3`,
          duration: 30
        },
        location: [
          'Mumbai, India',
          'Delhi, India',
          'Bangalore, India',
          'Chennai, India',
          'Kolkata, India',
          'Pune, India',
          'Hyderabad, India',
          'Ahmedabad, India'
        ][i % 8],
        visibility: 'public',
        allowComments: true,
        allowSharing: true,
        analytics: {
          views: Math.floor(Math.random() * 10000) + 1000,
          likes: Math.floor(Math.random() * 1000) + 100,
          comments: Math.floor(Math.random() * 200) + 20,
          shares: Math.floor(Math.random() * 100) + 10,
          saves: Math.floor(Math.random() * 150) + 25,
          reach: Math.floor(Math.random() * 15000) + 2000,
          impressions: Math.floor(Math.random() * 20000) + 3000
        },
        likedBy: customers.slice(0, Math.floor(Math.random() * 5) + 1).map(user => ({
          user: user._id,
          likedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        })),
        savedBy: customers.slice(0, Math.floor(Math.random() * 3) + 1).map(user => ({
          user: user._id,
          savedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        })),
        status: 'published',
        trending: {
          score: Math.floor(Math.random() * 100) + 50,
          lastCalculated: new Date()
        },
        featured: Math.random() > 0.8, // 20% featured
        publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
    }
    const createdReels = await Reel.create(reels);
    console.log(`✅ Created ${createdReels.length} reels\n`);

    // 12. Create Search Histories (20+ records) - TEMPORARILY DISABLED
    // console.log('🔍 Creating search histories...');
    /*
    const searchHistories = [];
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      const searchQueries = [
        'summer dress', 'casual shirts', 'formal shoes', 'winter jacket',
        'party wear', 'ethnic wear', 'sports shoes', 'handbags',
        'sunglasses', 'watches', 'jeans', 'tops', 'kurtas',
        'sneakers', 'accessories', 'jewelry', 'scarves', 'belts'
      ];

      const searches = [];
      for (let j = 0; j < Math.floor(Math.random() * 8) + 3; j++) { // 3-10 searches per user
        const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
        const relatedProducts = products.filter(p =>
          p.name.toLowerCase().includes(query.split(' ')[0]) ||
          p.category.toLowerCase().includes(query.split(' ')[0])
        ).slice(0, Math.floor(Math.random() * 5) + 1);

        searches.push({
          query: query,
          filters: {
            category: Math.random() > 0.5 ? categories[Math.floor(Math.random() * categories.length)].name : undefined,
            brand: Math.random() > 0.7 ? brands[Math.floor(Math.random() * brands.length)].name : undefined,
            minPrice: Math.random() > 0.8 ? Math.floor(Math.random() * 1000) + 500 : undefined,
            maxPrice: Math.random() > 0.8 ? Math.floor(Math.random() * 5000) + 2000 : undefined,
            sortBy: ['price', 'rating', 'popularity', 'newest'][Math.floor(Math.random() * 4)],
            sortOrder: ['asc', 'desc'][Math.floor(Math.random() * 2)]
          },
          results: {
            count: relatedProducts.length,
            clicked: relatedProducts.slice(0, Math.floor(Math.random() * 3) + 1).map((product, index) => ({
              productId: product._id,
              position: index + 1,
              clickedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
            })),
            purchased: Math.random() > 0.7 ? [{
              productId: relatedProducts[0]?._id,
              purchasedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
            }] : []
          },
          metadata: {
            source: ['search_bar', 'voice_search', 'suggestion', 'filter'][Math.floor(Math.random() * 4)],
            sessionId: `session_${customer._id}_${j}`,
            deviceType: ['mobile', 'desktop', 'tablet'][Math.floor(Math.random() * 3)],
            location: 'Mumbai, India',
            duration: Math.floor(Math.random() * 300) + 30, // 30-330 seconds
            refinements: Math.floor(Math.random() * 5)
          },
          timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        });
      }

      searchHistories.push({
        user: customer._id,
        searches: searches,
        totalSearches: searches.length,
        lastSearchDate: new Date(),
        topCategories: categories.slice(0, 3).map(cat => cat.name),
        topBrands: brands.slice(0, 3).map(brand => brand.name),
        averageSessionDuration: Math.floor(Math.random() * 200) + 100,
        searchPatterns: {
          peakHours: [9, 12, 15, 18, 21],
          preferredCategories: categories.slice(0, 3).map(cat => cat.name),
          priceRange: {
            min: 500,
            max: 5000,
            average: 2000
          }
        }
      });
    }
    const createdSearchHistories = await SearchHistory.create(searchHistories);
    console.log(`✅ Created ${createdSearchHistories.length} search histories\n`);

    // Create Trending Searches
    console.log('🔥 Creating trending searches...');
    const trendingSearches = [
      'summer dress', 'casual shirts', 'formal shoes', 'winter jacket',
      'party wear', 'ethnic wear', 'sports shoes', 'handbags',
      'sunglasses', 'watches', 'jeans', 'tops', 'kurtas',
      'sneakers', 'accessories', 'jewelry', 'scarves', 'belts'
    ].map((query, index) => ({
      query: query,
      searchCount: Math.floor(Math.random() * 1000) + 500,
      period: 'daily',
      category: categories[index % categories.length].name,
      demographics: {
        ageGroups: {
          '18-25': Math.floor(Math.random() * 40) + 20,
          '26-35': Math.floor(Math.random() * 40) + 20,
          '36-45': Math.floor(Math.random() * 30) + 10,
          '46+': Math.floor(Math.random() * 20) + 5
        },
        genders: {
          male: Math.floor(Math.random() * 60) + 20,
          female: Math.floor(Math.random() * 60) + 20,
          other: Math.floor(Math.random() * 10) + 1
        },
        locations: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata']
      },
      relatedQueries: [
        `${query} online`,
        `best ${query}`,
        `cheap ${query}`,
        `${query} brands`
      ],
      trending: {
        score: Math.floor(Math.random() * 100) + 50,
        rank: index + 1,
        change: Math.floor(Math.random() * 20) - 10 // -10 to +10
      },
      lastUpdated: new Date()
    }));
    const createdTrendingSearches = await TrendingSearch.create(trendingSearches);
    console.log(`✅ Created ${createdTrendingSearches.length} trending searches\n`);

    // Create Search Suggestions
    console.log('💡 Creating search suggestions...');
    const searchSuggestions = [];
    const baseQueries = ['dress', 'shirt', 'shoe', 'bag', 'watch', 'jean', 'top', 'kurta'];
    baseQueries.forEach(base => {
      const suggestions = [
        `${base}s for women`,
        `${base}s for men`,
        `casual ${base}s`,
        `formal ${base}s`,
        `party ${base}s`,
        `summer ${base}s`,
        `winter ${base}s`,
        `branded ${base}s`,
        `cheap ${base}s`,
        `best ${base}s`
      ];

      suggestions.forEach((suggestion, index) => {
        searchSuggestions.push({
          query: suggestion,
          baseQuery: base,
          type: 'autocomplete',
          popularity: Math.floor(Math.random() * 100) + 50,
          category: categories[Math.floor(Math.random() * categories.length)].name,
          source: ['user_searches', 'admin_curated', 'algorithm_generated'][Math.floor(Math.random() * 3)],
          metadata: {
            searchCount: Math.floor(Math.random() * 500) + 100,
            clickThroughRate: Math.floor(Math.random() * 50) + 20,
            conversionRate: Math.floor(Math.random() * 10) + 2
          },
          isActive: true,
          priority: Math.floor(Math.random() * 10) + 1,
          lastUpdated: new Date()
        });
      });
    });
    const createdSearchSuggestions = await SearchSuggestion.create(searchSuggestions);
    console.log(`✅ Created ${createdSearchSuggestions.length} search suggestions\n`);
    */

    // 13. Create User Behaviors (25+ records)
    console.log('📊 Creating user behaviors...');
    const userBehaviors = [];
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];

      const interactions = [];
      // Generate various interactions for each user
      for (let j = 0; j < Math.floor(Math.random() * 20) + 10; j++) { // 10-30 interactions per user
        const interactionTypes = [
          'product_view', 'product_like', 'product_share', 'product_purchase',
          'post_view', 'post_like', 'post_share', 'post_comment',
          'story_view', 'story_like', 'story_share',
          'search', 'category_browse', 'filter_apply',
          'cart_add', 'cart_remove', 'wishlist_add', 'wishlist_remove',
          'vendor_follow', 'user_follow'
        ];

        const type = interactionTypes[Math.floor(Math.random() * interactionTypes.length)];
        let targetId, targetType;

        if (type.includes('product')) {
          targetId = products[Math.floor(Math.random() * products.length)]._id;
          targetType = 'product';
        } else if (type.includes('post')) {
          targetId = createdPosts[Math.floor(Math.random() * createdPosts.length)]._id;
          targetType = 'post';
        } else if (type.includes('story')) {
          targetId = createdStories[Math.floor(Math.random() * createdStories.length)]._id;
          targetType = 'story';
        } else if (type.includes('user')) {
          targetId = customers[Math.floor(Math.random() * customers.length)]._id;
          targetType = 'user';
        } else if (type.includes('vendor')) {
          targetId = vendor._id;
          targetType = 'vendor';
        } else {
          targetId = categories[Math.floor(Math.random() * categories.length)]._id;
          targetType = 'category';
        }

        interactions.push({
          type: type,
          targetId: targetId,
          targetType: targetType,
          metadata: {
            category: Math.random() > 0.5 ? categories[Math.floor(Math.random() * categories.length)].name : undefined,
            brand: Math.random() > 0.5 ? brands[Math.floor(Math.random() * brands.length)].name : undefined,
            price: Math.random() > 0.5 ? Math.floor(Math.random() * 5000) + 500 : undefined,
            searchQuery: type === 'search' ? ['summer dress', 'casual shirts', 'formal shoes'][Math.floor(Math.random() * 3)] : undefined,
            duration: Math.floor(Math.random() * 300) + 10,
            source: ['home', 'search', 'category', 'profile', 'recommendations'][Math.floor(Math.random() * 5)],
            deviceType: ['mobile', 'desktop', 'tablet'][Math.floor(Math.random() * 3)],
            sessionId: `session_${customer._id}_${Math.floor(j / 5)}`
          },
          timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        });
      }

      userBehaviors.push({
        user: customer._id,
        interactions: interactions,
        preferences: {
          categories: categories.slice(0, Math.floor(Math.random() * 4) + 2).map(cat => ({
            category: cat.name,
            score: Math.floor(Math.random() * 100) + 50,
            lastInteraction: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
          })),
          brands: brands.slice(0, Math.floor(Math.random() * 3) + 2).map(brand => ({
            brand: brand.name,
            score: Math.floor(Math.random() * 100) + 50,
            lastInteraction: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
          })),
          priceRange: {
            min: Math.floor(Math.random() * 1000) + 500,
            max: Math.floor(Math.random() * 5000) + 2000,
            preferred: Math.floor(Math.random() * 3000) + 1000
          },
          colors: ['Black', 'White', 'Blue', 'Red', 'Green'].slice(0, Math.floor(Math.random() * 3) + 2).map(color => ({
            name: color,
            score: Math.floor(Math.random() * 100) + 50,
            interactions: Math.floor(Math.random() * 20) + 5
          })),
          sizes: ['S', 'M', 'L', 'XL'].slice(0, Math.floor(Math.random() * 2) + 1).map(size => ({
            name: size,
            score: Math.floor(Math.random() * 100) + 50,
            interactions: Math.floor(Math.random() * 15) + 3
          }))
        },
        analytics: {
          totalInteractions: interactions.length,
          averageSessionDuration: Math.floor(Math.random() * 300) + 120,
          conversionRate: Math.floor(Math.random() * 20) + 5, // 5-25%
          lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          deviceUsage: {
            mobile: Math.floor(Math.random() * 60) + 40, // 40-100%
            desktop: Math.floor(Math.random() * 40) + 10, // 10-50%
            tablet: Math.floor(Math.random() * 20) + 5 // 5-25%
          },
          peakActivityHours: [9, 12, 15, 18, 21].slice(0, Math.floor(Math.random() * 3) + 2)
        },
        segments: [
          'frequent_buyer', 'window_shopper', 'price_conscious', 'brand_loyal',
          'trend_follower', 'casual_browser', 'deal_hunter'
        ].slice(0, Math.floor(Math.random() * 3) + 1),
        lastUpdated: new Date()
      });
    }
    const createdUserBehaviors = await UserBehavior.create(userBehaviors);
    console.log(`✅ Created ${createdUserBehaviors.length} user behaviors\n`);

    console.log('\n📊 Comprehensive Database Seeding Summary:');
    console.log(`✅ Created ${roles.length} roles`);
    console.log(`✅ Created ${users.length} users (${customers.length} customers + 1 vendor)`);
    console.log(`✅ Created ${categories.length} categories`);
    console.log(`✅ Created ${brands.length} brands`);
    console.log(`✅ Created ${products.length} products`);
    console.log(`✅ Created ${createdOrders.length} orders`);
    console.log(`✅ Created ${createdPosts.length} posts`);
    console.log(`✅ Created ${createdStories.length} stories`);
    console.log(`✅ Created ${createdCarts.length} carts`);
    console.log(`✅ Created ${createdWishlists.length} wishlists`);
    console.log(`✅ Created ${createdNotifications.length} notifications`);
    console.log(`✅ Created ${createdPayments.length} payments`);
    console.log(`✅ Created ${createdReels.length} reels`);
    // console.log(`✅ Created ${createdSearchHistories.length} search histories`);
    // console.log(`✅ Created ${createdTrendingSearches.length} trending searches`);
    // console.log(`✅ Created ${createdSearchSuggestions.length} search suggestions`);
    console.log(`✅ Created ${createdUserBehaviors.length} user behaviors`);

    console.log('\n🎉 Comprehensive database seeding completed successfully!');
    console.log('\n🔗 Database now contains:');
    console.log('   • Complete role-based access control system');
    console.log('   • Complete user profiles with social stats and behaviors');
    console.log('   • Comprehensive product catalog with brands and categories');
    console.log('   • Real orders with payment processing and tracking');
    console.log('   • Social media posts, stories, and reels with engagement');
    console.log('   • Active shopping carts and wishlists');
    console.log('   • Real-time notifications and user interactions');
    console.log('   • Detailed search histories and user behavior analytics');
    console.log('   • Payment processing with multiple gateway support');
    console.log('   • Video content (reels) with trending algorithms');
    console.log('   • All data interconnected with proper relationships');
    console.log('   • Ready for full e-commerce and social platform testing');
    console.log('   • Complete analytics and recommendation engine data');

  } catch (error) {
    console.error('❌ Error seeding real data:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectDatabase();
    await seedRealData();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⚠️ Seeding interrupted by user');
  await mongoose.disconnect();
  process.exit(0);
});

// Run the seeder
main();
