// Sub-Categories Table Creation and Seeding Script
require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

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

// Define Category model based on actual schema
const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  slug: DataTypes.STRING(200)
}, {
  tableName: 'categories',
  timestamps: true,
  underscored: false
});

// Define SubCategory model
const SubCategory = sequelize.define('SubCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'categories',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  slug: DataTypes.STRING(200),
  description: DataTypes.TEXT,
  image: DataTypes.STRING(500),
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  sort_order: DataTypes.INTEGER
}, {
  tableName: 'sub_categories',
  timestamps: true,
  underscored: true
});

// Seed data with 7 categories and 45 sub-categories
const CATEGORIES_WITH_SUBCATEGORIES = [
  {
    name: 'Men',
    slug: 'men',
    description: 'Men\'s clothing and fashion',
    image: '/uploads/categories/men.jpg',
    is_active: true,
    sort_order: 1,
    subcategories: [
      { name: 'Shirts', slug: 'shirts', description: 'Casual and formal shirts', sort_order: 1 },
      { name: 'Pants & Jeans', slug: 'pants-jeans', description: 'Jeans, trousers, and casual pants', sort_order: 2 },
      { name: 'Jackets & Coats', slug: 'jackets-coats', description: 'Coats and jackets for all seasons', sort_order: 3 },
      { name: 'Shoes & Footwear', slug: 'shoes-footwear', description: 'Men\'s footwear collection', sort_order: 4 },
      { name: 'Accessories', slug: 'accessories', description: 'Ties, belts, scarves, and more', sort_order: 5 },
      { name: 'Casual Wear', slug: 'casual-wear', description: 'T-shirts, hoodies, and casual clothing', sort_order: 6 },
      { name: 'Formal Wear', slug: 'formal-wear', description: 'Suits, blazers, and formal attire', sort_order: 7 }
    ]
  },
  {
    name: 'Women',
    slug: 'women',
    description: 'Women\'s clothing and fashion',
    image: '/uploads/categories/women.jpg',
    is_active: true,
    sort_order: 2,
    subcategories: [
      { name: 'Dresses', slug: 'dresses', description: 'Party, casual, and formal dresses', sort_order: 1 },
      { name: 'Tops & Blouses', slug: 'tops-blouses', description: 'Shirts, blouses, and tunics', sort_order: 2 },
      { name: 'Skirts & Pants', slug: 'skirts-pants', description: 'Skirts, pants, and leggings', sort_order: 3 },
      { name: 'Jackets & Coats', slug: 'jackets-coats', description: 'Women\'s outerwear', sort_order: 4 },
      { name: 'Shoes & Footwear', slug: 'shoes-footwear', description: 'Women\'s footwear collection', sort_order: 5 },
      { name: 'Accessories', slug: 'accessories', description: 'Jewelry, scarves, and bags', sort_order: 6 },
      { name: 'Activewear', slug: 'activewear', description: 'Yoga, sports, and gym clothes', sort_order: 7 }
    ]
  },
  {
    name: 'Kids',
    slug: 'kids',
    description: 'Kids\' clothing and fashion',
    image: '/uploads/categories/kids.jpg',
    is_active: true,
    sort_order: 3,
    subcategories: [
      { name: 'Boys Clothing', slug: 'boys-clothing', description: 'Clothing for boys', sort_order: 1 },
      { name: 'Girls Clothing', slug: 'girls-clothing', description: 'Clothing for girls', sort_order: 2 },
      { name: 'Babies', slug: 'babies', description: 'Infant and baby clothing', sort_order: 3 },
      { name: 'Shoes & Footwear', slug: 'shoes-footwear', description: 'Kids\' footwear', sort_order: 4 },
      { name: 'Accessories', slug: 'accessories', description: 'Kids\' accessories and bags', sort_order: 5 },
      { name: 'Activewear', slug: 'activewear', description: 'Kids\' sports and gym clothes', sort_order: 6 },
      { name: 'Formal Wear', slug: 'formal-wear', description: 'Party and formal kids clothing', sort_order: 7 }
    ]
  },
  {
    name: 'Footwear',
    slug: 'footwear',
    description: 'Shoes and footwear for all',
    image: '/uploads/categories/footwear.jpg',
    is_active: true,
    sort_order: 4,
    subcategories: [
      { name: 'Casual Shoes', slug: 'casual-shoes', description: 'Everyday casual footwear', sort_order: 1 },
      { name: 'Sports Shoes', slug: 'sports-shoes', description: 'Running and sports shoes', sort_order: 2 },
      { name: 'Formal Shoes', slug: 'formal-shoes', description: 'Dress shoes and formal footwear', sort_order: 3 },
      { name: 'Sandals & Flip-Flops', slug: 'sandals-flipflops', description: 'Summer and casual sandals', sort_order: 4 },
      { name: 'Boots', slug: 'boots', description: 'Boots and high-top footwear', sort_order: 5 },
      { name: 'Traditional & Ethnic', slug: 'traditional-ethnic', description: 'Traditional and ethnic footwear', sort_order: 6 }
    ]
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    description: 'Fashion accessories and jewelry',
    image: '/uploads/categories/accessories.jpg',
    is_active: true,
    sort_order: 5,
    subcategories: [
      { name: 'Jewelry', slug: 'jewelry', description: 'Necklaces, bracelets, rings', sort_order: 1 },
      { name: 'Watches', slug: 'watches', description: 'Wrist watches and timepieces', sort_order: 2 },
      { name: 'Bags & Handbags', slug: 'bags-handbags', description: 'Bags, purses, and backpacks', sort_order: 3 },
      { name: 'Scarves & Shawls', slug: 'scarves-shawls', description: 'Scarves and shawls', sort_order: 4 },
      { name: 'Belts', slug: 'belts', description: 'Leather and casual belts', sort_order: 5 },
      { name: 'Hats & Caps', slug: 'hats-caps', description: 'Hats, caps, and beanies', sort_order: 6 }
    ]
  },
  {
    name: 'Ethnic Wear',
    slug: 'ethnic-wear',
    description: 'Traditional and ethnic clothing',
    image: '/uploads/categories/ethnic-wear.jpg',
    is_active: true,
    sort_order: 6,
    subcategories: [
      { name: 'Sarees', slug: 'sarees', description: 'Traditional sarees', sort_order: 1 },
      { name: 'Salwar Suits', slug: 'salwar-suits', description: 'Salwar kameez and suits', sort_order: 2 },
      { name: 'Lehengas', slug: 'lehengas', description: 'Lehengas and chaniya choli', sort_order: 3 },
      { name: 'Dhotis & Sherwanis', slug: 'dhotis-sherwanis', description: 'Traditional men wear', sort_order: 4 },
      { name: 'Kurtis & Tunics', slug: 'kurtis-tunics', description: 'Modern ethnic kurtis', sort_order: 5 },
      { name: 'Dupattas & Stoles', slug: 'dupattas-stoles', description: 'Dupattas and stoles', sort_order: 6 }
    ]
  },
  {
    name: 'Sports & Activewear',
    slug: 'sports-activewear',
    description: 'Sports and athletic clothing',
    image: '/uploads/categories/sports-activewear.jpg',
    is_active: true,
    sort_order: 7,
    subcategories: [
      { name: 'Sports Tops', slug: 'sports-tops', description: 'Sports bras and tops', sort_order: 1 },
      { name: 'Leggings & Tights', slug: 'leggings-tights', description: 'Yoga and sports leggings', sort_order: 2 },
      { name: 'Tracksuits', slug: 'tracksuits', description: 'Tracksuits and joggers', sort_order: 3 },
      { name: 'Sports Shorts', slug: 'sports-shorts', description: 'Running and training shorts', sort_order: 4 },
      { name: 'Sports Shoes', slug: 'sports-shoes', description: 'Athletic footwear', sort_order: 5 },
      { name: 'Gym Accessories', slug: 'gym-accessories', description: 'Belts, gloves, and more', sort_order: 6 }
    ]
  }
];

async function seedDatabase() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    console.log('🗑️  Creating/syncing tables...');
    await sequelize.sync({ alter: true });
    console.log('✅ Tables synced\n');

    // Try to get existing categories
    console.log('📊 Fetching existing categories...');
    const existingCategories = await Category.findAll();
    
    if (existingCategories.length === 0) {
      console.log('⚠️  No categories found. Creating categories first...');
      for (const catData of CATEGORIES_WITH_SUBCATEGORIES) {
        await Category.create({
          name: catData.name,
          slug: catData.slug,
          description: catData.description,
          image: catData.image,
          is_active: catData.is_active,
          sort_order: catData.sort_order
        });
      }
      console.log('✅ Categories created\n');
    } else {
      console.log(`✅ Found ${existingCategories.length} existing categories\n`);
    }

    // Clear existing sub-categories
    console.log('🗑️  Clearing existing sub-categories...');
    await SubCategory.destroy({ where: {} });
    console.log('✅ Sub-categories cleared\n');

    // Seed sub-categories
    console.log('🌱 Seeding sub-categories...');
    const categories = await Category.findAll();
    
    let totalSubCategories = 0;
    for (let i = 0; i < CATEGORIES_WITH_SUBCATEGORIES.length; i++) {
      const catData = CATEGORIES_WITH_SUBCATEGORIES[i];
      const category = categories.find(c => c.slug === catData.slug);
      
      if (!category) {
        console.log(`⚠️  Category not found: ${catData.name}`);
        continue;
      }

      for (const subCatData of catData.subcategories) {
        await SubCategory.create({
          category_id: category.id,
          name: subCatData.name,
          slug: subCatData.slug,
          description: subCatData.description,
          image: subCatData.image || null,
          is_active: true,
          sort_order: subCatData.sort_order
        });
        totalSubCategories++;
      }

      console.log(`  ✅ ${catData.name}: ${catData.subcategories.length} sub-categories`);
    }

    console.log(`\n✅ Total sub-categories seeded: ${totalSubCategories}`);
    console.log('\n📊 Summary:');
    console.log(`   • Categories: ${categories.length}`);
    console.log(`   • Sub-categories: ${totalSubCategories}`);
    console.log('\n✨ Database seeding completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedDatabase();
