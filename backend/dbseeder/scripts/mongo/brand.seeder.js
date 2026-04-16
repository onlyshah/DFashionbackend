// Brand Seeder Script - PostgreSQL
// Seeds sample brands for the product ecosystem
// Usage: node scripts/brand.seeder.postgres.js

require('dotenv').config();
const { getSequelize } = require('../../../config/sequelize');
const modelsModule = require('../../../models_sql');

let sequelize;
let Brand;

const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();
if (!DB_TYPE.includes('postgres')) {
  console.log('⏭️  Skipping brand.seeder.postgres - Postgres disabled (DB_TYPE=' + DB_TYPE + ')');
  process.exit(0);
}

const BRANDS_DATA = [
  { name: 'Nike', slug: 'nike', description: 'Athletic footwear and apparel', website: 'https://www.nike.com', logo: '/uploads/brands/nike.png', is_active: true },
  { name: 'Adidas', slug: 'adidas', description: 'Sports shoes and clothing', website: 'https://www.adidas.com', logo: '/uploads/brands/adidas.png', is_active: true },
  { name: 'Puma', slug: 'puma', description: 'Performance sportswear', website: 'https://www.puma.com', logo: '/uploads/brands/puma.png', is_active: true },
  { name: 'Ralph Lauren', slug: 'ralph-lauren', description: 'Premium fashion brand', website: 'https://www.ralphlauren.com', logo: '/uploads/brands/ralph-lauren.png', is_active: true },
  { name: 'Levi\'s', slug: 'levis', description: 'Denim and casual clothing', website: 'https://www.levi.com', logo: '/uploads/brands/levis.png', is_active: true },
  { name: 'Tommy Hilfiger', slug: 'tommy-hilfiger', description: 'Classic American fashion', website: 'https://www.tommyhilfiger.com', logo: '/uploads/brands/tommy-hilfiger.png', is_active: true },
  { name: 'Calvin Klein', slug: 'calvin-klein', description: 'Contemporary fashion', website: 'https://www.calvinklein.com', logo: '/uploads/brands/calvin-klein.png', is_active: true },
  { name: 'Gucci', slug: 'gucci', description: 'Luxury fashion house', website: 'https://www.gucci.com', logo: '/uploads/brands/gucci.png', is_active: true }
];

async function seedBrands() {
  try {
    console.log('🚀 Starting PostgreSQL Brand Seeder...\n');
    sequelize = await getSequelize();
    if (!sequelize) throw new Error('Failed to initialize sequelize');
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // Reinitialize models now that sequelize is connected
    if (modelsModule.reinitializeModels) {
      await modelsModule.reinitializeModels();
    }
    Brand = modelsModule._raw.Brand;
    if (!Brand) throw new Error('Brand model not initialized');
    
    const existing = await Brand.count();
    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing brands. Clearing...\n`);
      await Brand.destroy({ where: {} });
    }

    console.log('📝 Seeding brands...');
    let seededCount = 0;
    for (const brandData of BRANDS_DATA) {
      const brand = await Brand.create(brandData);
      console.log(`  ✓ Created brand: ${brand.name}`);
      seededCount++;
    }

    console.log(`\n✅ Successfully seeded ${seededCount} brands\n`);
    console.log('═'.repeat(50));
    console.log('BRAND SEEDING COMPLETE');
    console.log('═'.repeat(50));
    console.log('\nSeeded Brands:');
    BRANDS_DATA.forEach(b => console.log(`  • ${b.name}`));
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Brand Seeding failed:', error.message);
    process.exit(1);
  }
}

seedBrands();
