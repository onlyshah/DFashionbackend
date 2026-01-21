// Verify categories and sub-categories data
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

const Category = sequelize.define('Category', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  name: DataTypes.STRING,
  slug: DataTypes.STRING
}, { tableName: 'categories', timestamps: false });

const SubCategory = sequelize.define('SubCategory', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  category_id: DataTypes.INTEGER,
  name: DataTypes.STRING,
  slug: DataTypes.STRING
}, { tableName: 'sub_categories', timestamps: false });

async function verify() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const categories = await sequelize.query(
      'SELECT COUNT(*) as count FROM categories'
    );
    const subCategories = await sequelize.query(
      'SELECT COUNT(*) as count FROM sub_categories'
    );

    console.log('📊 Data Count:');
    console.log(`   • Categories: ${categories[0][0].count}`);
    console.log(`   • Sub-Categories: ${subCategories[0][0].count}\n`);

    // Get all categories with sub-category counts
    const result = await sequelize.query(`
      SELECT 
        c.id, c.name, c.slug,
        COUNT(sc.id) as sub_category_count
      FROM categories c
      LEFT JOIN sub_categories sc ON c.id = sc.category_id
      GROUP BY c.id, c.name, c.slug
      ORDER BY c.id
    `);

    console.log('📋 Categories with Sub-Category Distribution:');
    result[0].forEach(row => {
      console.log(`   • ${row.name} (${row.slug}): ${row.sub_category_count} sub-categories`);
    });

    console.log('\n✨ Verification complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verify();
