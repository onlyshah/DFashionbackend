// Category and SubCategory Seeder for Postgres
// Usage: node scripts/category.seeder.postgres.js

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();
if (!DB_TYPE.includes('postgres')) {
  console.log('⏭️  Skipping category.seeder.postgres - Postgres disabled (DB_TYPE=' + DB_TYPE + ')');
  process.exit(0);
}

const sequelize = new Sequelize(
  process.env.DB_NAME || 'dfashion',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

// Category seed data with hierarchical sub-categories
const CATEGORIES_WITH_SUBCATEGORIES = [
  {
    name: 'Men',
    slug: 'men',
    description: 'Men\'s clothing and fashion',
    image: '/uploads/categories/men.jpg',
    isActive: true,
    sortOrder: 1,
    subcategories: [
      { name: 'Shirts', slug: 'shirts', description: 'Casual and formal shirts', sortOrder: 1 },
      { name: 'Pants & Jeans', slug: 'pants-jeans', description: 'Jeans, trousers, and casual pants', sortOrder: 2 },
      { name: 'Jackets & Coats', slug: 'jackets-coats', description: 'Coats and jackets for all seasons', sortOrder: 3 },
      { name: 'Shoes & Footwear', slug: 'shoes-footwear', description: 'Men\'s footwear collection', sortOrder: 4 },
      { name: 'Accessories', slug: 'accessories', description: 'Ties, belts, scarves, and more', sortOrder: 5 },
      { name: 'Casual Wear', slug: 'casual-wear', description: 'T-shirts, hoodies, and casual clothing', sortOrder: 6 },
      { name: 'Formal Wear', slug: 'formal-wear', description: 'Suits, blazers, and formal attire', sortOrder: 7 }
    ]
  },
  {
    name: 'Women',
    slug: 'women',
    description: 'Women\'s clothing and fashion',
    image: '/uploads/categories/women.jpg',
    isActive: true,
    sortOrder: 2,
    subcategories: [
      { name: 'Dresses', slug: 'dresses', description: 'Evening and casual dresses', sortOrder: 1 },
      { name: 'Tops & Blouses', slug: 'tops-blouses', description: 'T-shirts, blouses, and tops', sortOrder: 2 },
      { name: 'Bottoms', slug: 'bottoms', description: 'Skirts, pants, and leggings', sortOrder: 3 },
      { name: 'Outerwear', slug: 'outerwear', description: 'Jackets and coats', sortOrder: 4 },
      { name: 'Shoes & Footwear', slug: 'shoes-footwear', description: 'Women\'s footwear collection', sortOrder: 5 },
      { name: 'Activewear', slug: 'activewear', description: 'Sports and fitness clothing', sortOrder: 6 },
      { name: 'Accessories', slug: 'accessories', description: 'Bags, belts, scarves, jewelry', sortOrder: 7 },
      { name: 'Intimates', slug: 'intimates', description: 'Bras, underwear, and sleepwear', sortOrder: 8 }
    ]
  },
  {
    name: 'Kids',
    slug: 'kids',
    description: 'Children\'s fashion and accessories',
    image: '/uploads/categories/kids.jpg',
    isActive: true,
    sortOrder: 3,
    subcategories: [
      { name: 'Boys Clothing', slug: 'boys-clothing', description: 'Boys\' clothing and apparel', sortOrder: 1 },
      { name: 'Girls Clothing', slug: 'girls-clothing', description: 'Girls\' clothing and apparel', sortOrder: 2 },
      { name: 'Baby Clothing', slug: 'baby-clothing', description: 'Infant and toddler clothing', sortOrder: 3 },
      { name: 'Shoes', slug: 'shoes', description: 'Children\'s footwear', sortOrder: 4 },
      { name: 'Accessories & Bags', slug: 'accessories-bags', description: 'Kids\' accessories', sortOrder: 5 }
    ]
  },
  {
    name: 'Footwear',
    slug: 'footwear',
    description: 'Shoes and footwear for everyone',
    image: '/uploads/categories/footwear.jpg',
    isActive: true,
    sortOrder: 4,
    subcategories: [
      { name: 'Casual Shoes', slug: 'casual-shoes', description: 'Sneakers and casual footwear', sortOrder: 1 },
      { name: 'Formal Shoes', slug: 'formal-shoes', description: 'Dress shoes and formal footwear', sortOrder: 2 },
      { name: 'Sports Shoes', slug: 'sports-shoes', description: 'Athletic and sports footwear', sortOrder: 3 },
      { name: 'Sandals & Slippers', slug: 'sandals-slippers', description: 'Sandals, flip-flops, and slippers', sortOrder: 4 },
      { name: 'Boots', slug: 'boots', description: 'Boots and high-top footwear', sortOrder: 5 },
      { name: 'Winter Shoes', slug: 'winter-shoes', description: 'Winter boots and snow shoes', sortOrder: 6 }
    ]
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    description: 'Fashion accessories and jewelry',
    image: '/uploads/categories/accessories.jpg',
    isActive: true,
    sortOrder: 5,
    subcategories: [
      { name: 'Bags & Handbags', slug: 'bags-handbags', description: 'Purses, backpacks, and bags', sortOrder: 1 },
      { name: 'Jewelry', slug: 'jewelry', description: 'Necklaces, rings, and jewelry', sortOrder: 2 },
      { name: 'Watches', slug: 'watches', description: 'Wrist watches and timepieces', sortOrder: 3 },
      { name: 'Belts', slug: 'belts', description: 'Leather and fabric belts', sortOrder: 4 },
      { name: 'Scarves & Wraps', slug: 'scarves-wraps', description: 'Scarves and shawls', sortOrder: 5 },
      { name: 'Hats & Caps', slug: 'hats-caps', description: 'Hats, caps, and headwear', sortOrder: 6 },
      { name: 'Sunglasses', slug: 'sunglasses', description: 'Sunglasses and eyewear', sortOrder: 7 },
      { name: 'Gloves', slug: 'gloves', description: 'Winter and leather gloves', sortOrder: 8 }
    ]
  },
  {
    name: 'Sports & Activewear',
    slug: 'sports-activewear',
    description: 'Sports clothing and athletic wear',
    image: '/uploads/categories/sports.jpg',
    isActive: true,
    sortOrder: 6,
    subcategories: [
      { name: 'Gym Wear', slug: 'gym-wear', description: 'Workout and gym clothing', sortOrder: 1 },
      { name: 'Yoga & Pilates', slug: 'yoga-pilates', description: 'Yoga and pilates apparel', sortOrder: 2 },
      { name: 'Running Wear', slug: 'running-wear', description: 'Running and jogging clothing', sortOrder: 3 },
      { name: 'Team Sports', slug: 'team-sports', description: 'Team sports uniforms and gear', sortOrder: 4 },
      { name: 'Water Sports', slug: 'water-sports', description: 'Swimming and water sports gear', sortOrder: 5 },
      { name: 'Outdoor Gear', slug: 'outdoor-gear', description: 'Hiking and outdoor clothing', sortOrder: 6 }
    ]
  },
  {
    name: 'Home & Lifestyle',
    slug: 'home-lifestyle',
    description: 'Home products and lifestyle items',
    image: '/uploads/categories/home.jpg',
    isActive: true,
    sortOrder: 7,
    subcategories: [
      { name: 'Bedding', slug: 'bedding', description: 'Bed sheets, pillows, and bedding', sortOrder: 1 },
      { name: 'Kitchen & Dining', slug: 'kitchen-dining', description: 'Kitchen accessories and tableware', sortOrder: 2 },
      { name: 'Home Decor', slug: 'home-decor', description: 'Decorative items and furnishings', sortOrder: 3 },
      { name: 'Bath & Towels', slug: 'bath-towels', description: 'Towels and bathroom items', sortOrder: 4 },
      { name: 'Lighting', slug: 'lighting', description: 'Lamps and lighting fixtures', sortOrder: 5 }
    ]
  }
];

async function seedCategories() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Drop tables in reverse order (due to foreign keys)
    await sequelize.query('DROP TABLE IF EXISTS sub_categories CASCADE');
    await sequelize.query('TRUNCATE TABLE categories CASCADE');

    console.log('🗑️  Truncated existing categories and sub_categories');

    // Insert categories and sub-categories
    let categoryId = 1;
    for (const categoryData of CATEGORIES_WITH_SUBCATEGORIES) {
      // Insert main category
      const categoryInsert = `
        INSERT INTO categories (id, name, slug, description, image, is_active, sort_order, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id
      `;
      
      const [{ id }] = await sequelize.query(categoryInsert, {
        bind: [
          categoryId,
          categoryData.name,
          categoryData.slug,
          categoryData.description,
          categoryData.image || null,
          categoryData.isActive,
          categoryData.sortOrder
        ],
        type: 'SELECT'
      });

      console.log(`✅ Created category: ${categoryData.name} (ID: ${id})`);

      // Insert sub-categories
      if (categoryData.subcategories && categoryData.subcategories.length > 0) {
        for (const subcat of categoryData.subcategories) {
          const subcatInsert = `
            INSERT INTO sub_categories (category_id, name, slug, description, image, is_active, sort_order, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          `;

          await sequelize.query(subcatInsert, {
            bind: [
              id,
              subcat.name,
              subcat.slug,
              subcat.description || null,
              null,
              true,
              subcat.sortOrder
            ]
          });

          console.log(`   └─ Created sub-category: ${subcat.name}`);
        }
      }

      categoryId++;
    }

    console.log('\n✅ Category and sub-category seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Main categories: ${CATEGORIES_WITH_SUBCATEGORIES.length}`);
    console.log(`   - Total sub-categories: ${CATEGORIES_WITH_SUBCATEGORIES.reduce((sum, cat) => sum + (cat.subcategories?.length || 0), 0)}`);

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    if (error.original) {
      console.error('Database error:', error.original.message);
    }
    await sequelize.close();
    process.exit(1);
  }
}

// Run seeder
seedCategories();
