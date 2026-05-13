/**
 * 🎨 Generate Brand Logo Placeholders
 * Creates simple placeholder logos for all brands
 * Usage: node scripts/generate-brand-logos.js
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// List of brands to create logos for
const BRANDS = [
  { name: 'Nike', color: '#111111', bg: '#FFFFFF' },
  { name: 'Adidas', color: '#000000', bg: '#FFFFFF' },
  { name: 'Puma', color: '#FBD800', bg: '#000000' },
  { name: 'Ralph Lauren', color: '#C41E3A', bg: '#FFFFFF' },
  { name: 'Levis', color: '#E4003B', bg: '#FFFFFF' },
  { name: 'Tommy Hilfiger', color: '#003DA5', bg: '#FFFFFF' },
  { name: 'Calvin Klein', color: '#000000', bg: '#FFFFFF' },
  { name: 'Gucci', color: '#00A651', bg: '#FFFFFF' },
  { name: 'H&M', color: '#C41E3A', bg: '#FFFFFF' },
  { name: 'Zara', color: '#000000', bg: '#FFFFFF' },
  { name: 'Forever 21', color: '#E91E63', bg: '#FFFFFF' },
  { name: 'Louis Vuitton', color: '#9E8B5C', bg: '#1A1A1A' },
  { name: 'Versace', color: '#FFD700', bg: '#000000' },
  { name: 'Chanel', color: '#000000', bg: '#F5F5F5' },
  { name: 'Dior', color: '#C1A572', bg: '#1A1A1A' },
  { name: 'Prada', color: '#000000', bg: '#F4E4D7' }
];

function generateLogo(brandName, color, bgColor) {
  // Create canvas
  const width = 400;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Add border
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Add brand name
  ctx.fillStyle = color;
  ctx.font = 'bold 60px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Get initials if name is long
  let text = brandName.length > 8 
    ? brandName.split(' ').map(w => w[0]).join('').toUpperCase()
    : brandName.toUpperCase();

  ctx.fillText(text, width / 2, height / 2 - 30);

  // Add small text below
  ctx.font = '24px Arial';
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.7;
  ctx.fillText(brandName, width / 2, height / 2 + 50);
  ctx.globalAlpha = 1;

  return canvas;
}

async function createAllLogos() {
  const uploadsPath = path.join(__dirname, '../uploads/brands');

  // Ensure directory exists
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log(`✅ Created directory: ${uploadsPath}`);
  }

  console.log('🎨 Generating brand logos...\n');

  let created = 0;
  let skipped = 0;

  for (const brand of BRANDS) {
    const filename = brand.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[&']/g, '') + '.png';
    
    const filePath = path.join(uploadsPath, filename);

    // Skip if already exists
    if (fs.existsSync(filePath)) {
      console.log(`⏭️  Skipped (exists): ${filename}`);
      skipped++;
      continue;
    }

    try {
      const canvas = generateLogo(brand.name, brand.color, brand.bg);
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(filePath, buffer);
      console.log(`✅ Created: ${filename}`);
      created++;
    } catch (error) {
      console.error(`❌ Failed to create ${filename}:`, error.message);
    }
  }

  console.log(`\n✨ Complete!`);
  console.log(`   Created: ${created} new logos`);
  console.log(`   Skipped: ${skipped} existing logos`);
  console.log(`\n📂 Logos saved to: ${uploadsPath}`);
}

// Check if canvas is installed
try {
  require.resolve('canvas');
  createAllLogos().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
} catch (e) {
  console.error('❌ canvas package not found!');
  console.error('\nInstall it with:');
  console.error('  npm install canvas\n');
  console.error('Or install pre-built binaries:');
  console.error('  npm install canvas --build-from-source\n');
  process.exit(1);
}
