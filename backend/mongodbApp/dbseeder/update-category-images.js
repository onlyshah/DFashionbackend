#!/usr/bin/env node

/**
 * Category Image Update Script
 * Updates existing categories with image paths if they don't have them
 * Usage: node update-category-images.js
 */

require('dotenv').config();
const { Client } = require('pg');

const categoryImages = {
  'Men': '/uploads/categories/men.svg',
  'Women': '/uploads/categories/women.svg',
  'Kids': '/uploads/categories/kids.svg',
  'Accessories': '/uploads/categories/accessories.svg',
  'Footwear': '/uploads/categories/shoes.svg',
  'Sportswear': '/uploads/categories/sportswear.svg',
  'Ethnic Wear': '/uploads/categories/ethnic-wear.svg',
  'Western Wear': '/uploads/categories/western-wear.svg',
  'Formal Wear': '/uploads/categories/formal-wear.svg',
  'Casual Wear': '/uploads/categories/casual-wear.svg'
};

async function updateCategoryImages() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'dfashion'
  });

  try {
    console.log('🔄 Connecting to database...\n');
    await client.connect();
    console.log('✅ Connected to database\n');

    // First, check if the image column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories' AND column_name = 'image'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('⚠️  Image column does not exist in categories table');
      console.log('🔧 Please run the migration first:');
      console.log('   node migrate-categories.js\n');
      process.exit(1);
    }

    console.log('📋 Updating categories with images...\n');
    let updatedCount = 0;

    for (const [categoryName, imagePath] of Object.entries(categoryImages)) {
      const result = await client.query(
        `UPDATE categories 
         SET image = $1, sort_order = COALESCE(sort_order, $2)
         WHERE name = $3 AND (image IS NULL OR image = '')
         RETURNING id, name, image`,
        [imagePath, Object.keys(categoryImages).indexOf(categoryName) + 1, categoryName]
      );

      if (result.rows.length > 0) {
        console.log(`✅ Updated: ${categoryName}`);
        console.log(`   Image: ${imagePath}\n`);
        updatedCount++;
      } else {
        console.log(`⏭️  Skipped: ${categoryName} (already has image)\n`);
      }
    }

    console.log(`✨ Completed! Updated ${updatedCount} categories\n`);

    // Show current state
    console.log('📊 Current categories:');
    const allCats = await client.query(
      `SELECT name, image, sort_order FROM categories ORDER BY sort_order ASC LIMIT 10`
    );

    allCats.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.name}`);
      console.log(`      Image: ${row.image || '(none)'}`);
      console.log(`      Order: ${row.sort_order}\n`);
    });

  } catch (error) {
    console.error('\n❌ Update failed:', error.message);
    console.error('\nMake sure:');
    console.error('  1. PostgreSQL is running');
    console.error('  2. .env file has correct database credentials');
    console.error('  3. Migration has been run (migrate-categories.js)');
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the update
updateCategoryImages().catch(err => {
  console.error(err);
  process.exit(1);
});
