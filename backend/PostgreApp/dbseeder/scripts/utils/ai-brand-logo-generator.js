#!/usr/bin/env node

/**
 * 🤖 AI Brand Logo Generator Agent
 * Automatically creates professional brand logos for all brands
 * Uses SVG + Sharp for high-quality PNG conversion
 * 
 * Usage:
 *   npm install sharp
 *   node scripts/ai-brand-logo-generator.js
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

// Brand configurations with colors and styles
const BRANDS = [
  {
    name: 'Nike',
    slug: 'nike',
    primaryColor: '#111111',
    secondaryColor: '#FFFFFF',
    style: 'minimalist',
    text: 'Nike',
    symbol: '✓'
  },
  {
    name: 'Adidas',
    slug: 'adidas',
    primaryColor: '#000000',
    secondaryColor: '#FFFFFF',
    style: 'geometric',
    text: 'adidas',
    symbol: '▲▲▲'
  },
  {
    name: 'Puma',
    slug: 'puma',
    primaryColor: '#000000',
    secondaryColor: '#FBD800',
    style: 'animal',
    text: 'PUMA',
    symbol: '🐆'
  },
  {
    name: 'Ralph Lauren',
    slug: 'ralph-lauren',
    primaryColor: '#C41E3A',
    secondaryColor: '#FFFFFF',
    style: 'classic',
    text: 'RL',
    symbol: '👑'
  },
  {
    name: "Levi's",
    slug: 'levis',
    primaryColor: '#E4003B',
    secondaryColor: '#FFFFFF',
    style: 'vintage',
    text: "Levi's",
    symbol: '502'
  },
  {
    name: 'Tommy Hilfiger',
    slug: 'tommy-hilfiger',
    primaryColor: '#003DA5',
    secondaryColor: '#FFFFFF',
    style: 'modern',
    text: 'TH',
    symbol: '⬜'
  },
  {
    name: 'Calvin Klein',
    slug: 'calvin-klein',
    primaryColor: '#000000',
    secondaryColor: '#FFFFFF',
    style: 'minimalist',
    text: 'CK',
    symbol: '■'
  },
  {
    name: 'Gucci',
    slug: 'gucci',
    primaryColor: '#00A651',
    secondaryColor: '#DC143C',
    style: 'luxury',
    text: 'Gucci',
    symbol: 'Ⓖ'
  },
  {
    name: 'H&M',
    slug: 'hm',
    primaryColor: '#C41E3A',
    secondaryColor: '#FFFFFF',
    style: 'bold',
    text: 'H&M',
    symbol: 'HM'
  },
  {
    name: 'Zara',
    slug: 'zara',
    primaryColor: '#000000',
    secondaryColor: '#FFFFFF',
    style: 'minimalist',
    text: 'ZARA',
    symbol: 'Z'
  },
  {
    name: 'Forever 21',
    slug: 'forever21',
    primaryColor: '#E91E63',
    secondaryColor: '#FFFFFF',
    style: 'vibrant',
    text: 'F21',
    symbol: '∞'
  },
  {
    name: 'Louis Vuitton',
    slug: 'louis-vuitton',
    primaryColor: '#9E8B5C',
    secondaryColor: '#1A1A1A',
    style: 'luxury',
    text: 'LV',
    symbol: '⬥'
  },
  {
    name: 'Versace',
    slug: 'versace',
    primaryColor: '#000000',
    secondaryColor: '#FFD700',
    style: 'luxury',
    text: 'Versace',
    symbol: 'V'
  },
  {
    name: 'Chanel',
    slug: 'chanel',
    primaryColor: '#000000',
    secondaryColor: '#F5F5F5',
    style: 'elegant',
    text: 'CHANEL',
    symbol: 'CC'
  },
  {
    name: 'Dior',
    slug: 'dior',
    primaryColor: '#C1A572',
    secondaryColor: '#1A1A1A',
    style: 'luxury',
    text: 'DIOR',
    symbol: 'D'
  },
  {
    name: 'Prada',
    slug: 'prada',
    primaryColor: '#000000',
    secondaryColor: '#F4E4D7',
    style: 'elegant',
    text: 'PRADA',
    symbol: 'P'
  }
];

// SVG templates for different styles
const SVG_TEMPLATES = {
  minimalist: (brand) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="${brand.secondaryColor}"/>
      <rect x="30" y="30" width="340" height="340" fill="none" stroke="${brand.primaryColor}" stroke-width="12"/>
      <text x="200" y="220" font-family="Arial, sans-serif" font-size="80" font-weight="bold" 
            text-anchor="middle" fill="${brand.primaryColor}">${brand.text}</text>
    </svg>
  `,
  geometric: (brand) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="${brand.secondaryColor}"/>
      <polygon points="200,80 260,200 380,200 290,280 320,400 200,340 80,400 110,280 20,200 140,200" 
               fill="${brand.primaryColor}"/>
      <text x="200" y="350" font-family="Arial, sans-serif" font-size="40" font-weight="bold" 
            text-anchor="middle" fill="${brand.primaryColor}">${brand.text}</text>
    </svg>
  `,
  classic: (brand) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="${brand.secondaryColor}"/>
      <circle cx="200" cy="200" r="150" fill="${brand.primaryColor}"/>
      <text x="200" y="235" font-family="Georgia, serif" font-size="100" font-weight="bold" 
            text-anchor="middle" fill="${brand.secondaryColor}">${brand.text}</text>
    </svg>
  `,
  modern: (brand) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="${brand.secondaryColor}"/>
      <rect x="50" y="50" width="100" height="100" fill="${brand.primaryColor}"/>
      <rect x="250" y="50" width="100" height="100" fill="${brand.primaryColor}"/>
      <rect x="50" y="250" width="100" height="100" fill="${brand.primaryColor}"/>
      <rect x="250" y="250" width="100" height="100" fill="${brand.primaryColor}"/>
      <text x="200" y="235" font-family="Arial, sans-serif" font-size="60" font-weight="bold" 
            text-anchor="middle" fill="${brand.primaryColor}">${brand.text}</text>
    </svg>
  `,
  luxury: (brand) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="${brand.secondaryColor}"/>
      <circle cx="200" cy="200" r="160" fill="none" stroke="${brand.primaryColor}" stroke-width="3"/>
      <circle cx="200" cy="200" r="150" fill="none" stroke="${brand.primaryColor}" stroke-width="2"/>
      <text x="200" y="220" font-family="Georgia, serif" font-size="70" font-style="italic" font-weight="bold" 
            text-anchor="middle" fill="${brand.primaryColor}">${brand.text}</text>
    </svg>
  `,
  bold: (brand) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="${brand.primaryColor}"/>
      <rect x="40" y="40" width="320" height="320" fill="none" stroke="${brand.secondaryColor}" stroke-width="15"/>
      <text x="200" y="230" font-family="Arial, sans-serif" font-size="90" font-weight="900" 
            text-anchor="middle" fill="${brand.secondaryColor}" letter-spacing="10">${brand.text}</text>
    </svg>
  `,
  vibrant: (brand) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${brand.primaryColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#FF1493;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#grad)"/>
      <text x="200" y="230" font-family="Arial, sans-serif" font-size="100" font-weight="bold" 
            text-anchor="middle" fill="${brand.secondaryColor}">${brand.text}</text>
    </svg>
  `,
  vintage: (brand) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="${brand.secondaryColor}"/>
      <rect x="20" y="20" width="360" height="360" fill="none" stroke="${brand.primaryColor}" stroke-width="8"/>
      <rect x="40" y="40" width="320" height="320" fill="none" stroke="${brand.primaryColor}" stroke-width="2"/>
      <text x="200" y="220" font-family="Georgia, serif" font-size="80" font-weight="bold" 
            text-anchor="middle" fill="${brand.primaryColor}">${brand.text}</text>
    </svg>
  `,
  elegant: (brand) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="${brand.secondaryColor}"/>
      <polygon points="200,60 320,200 200,340 80,200" fill="${brand.primaryColor}" opacity="0.1"/>
      <polygon points="200,80 310,200 200,320 90,200" fill="none" stroke="${brand.primaryColor}" stroke-width="3"/>
      <text x="200" y="220" font-family="Georgia, serif" font-size="70" font-weight="600" 
            text-anchor="middle" fill="${brand.primaryColor}">${brand.text}</text>
    </svg>
  `,
  animal: (brand) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="${brand.primaryColor}"/>
      <circle cx="200" cy="140" r="60" fill="${brand.secondaryColor}"/>
      <polygon points="160,150 140,200 180,190" fill="${brand.secondaryColor}"/>
      <polygon points="240,150 260,200 220,190" fill="${brand.secondaryColor}"/>
      <ellipse cx="200" cy="240" rx="80" ry="100" fill="${brand.secondaryColor}"/>
      <text x="200" y="330" font-family="Arial, sans-serif" font-size="50" font-weight="bold" 
            text-anchor="middle" fill="${brand.primaryColor}">${brand.text}</text>
    </svg>
  `
};

/**
 * Generate SVG for a brand
 */
function generateBrandSVG(brand) {
  const template = SVG_TEMPLATES[brand.style] || SVG_TEMPLATES.minimalist;
  return template(brand);
}

/**
 * Convert SVG to PNG using ImageMagick or built-in method
 */
async function convertSvgToPng(svgContent, outputPath) {
  try {
    // Try using ImageMagick (convert command)
    const tempSvgPath = outputPath.replace('.png', '.svg');
    fs.writeFileSync(tempSvgPath, svgContent);

    try {
      await execPromise(`convert "${tempSvgPath}" -background white -alpha off "${outputPath}"`);
      fs.unlinkSync(tempSvgPath);
      return true;
    } catch (e) {
      // Fallback: Try using ffmpeg if available
      try {
        await execPromise(`ffmpeg -i "${tempSvgPath}" "${outputPath}" -y 2>/dev/null`);
        fs.unlinkSync(tempSvgPath);
        return true;
      } catch (e2) {
        // Keep SVG as-is for web display
        console.warn(`  ⚠️  Could not convert to PNG, saving as SVG. Install ImageMagick or ffmpeg for PNG conversion.`);
        const svgPath = outputPath.replace('.png', '.svg');
        fs.writeFileSync(svgPath, svgContent);
        fs.unlinkSync(tempSvgPath);
        return false;
      }
    }
  } catch (error) {
    console.error(`  ❌ Conversion error for ${outputPath}:`, error.message);
    return false;
  }
}

/**
 * Create PNG using Sharp if available, otherwise SVG
 */
async function createBrandLogo(brand, uploadsPath) {
  try {
    const filename = `${brand.slug}.png`;
    const filePath = path.join(uploadsPath, filename);

    // Check if file exists
    if (fs.existsSync(filePath)) {
      return { success: false, message: 'exists' };
    }

    const svgImagePath = path.join(uploadsPath, `${brand.slug}.svg`);

    // Generate SVG
    const svgContent = generateBrandSVG(brand);
    fs.writeFileSync(svgImagePath, svgContent);

    // Try to convert to PNG using available tools
    try {
      const sharp = require('sharp');
      await sharp(svgImagePath)
        .png({ quality: 90 })
        .toFile(filePath);
      
      fs.unlinkSync(svgImagePath); // Remove intermediate SVG
      return { success: true, format: 'PNG (via Sharp)' };
    } catch (sharpError) {
      // Sharp not available, try ImageMagick
      const converted = await convertSvgToPng(svgContent, filePath);
      
      if (converted) {
        return { success: true, format: 'PNG (via ImageMagick)' };
      } else {
        // Keep as SVG
        return { success: true, format: 'SVG (fallback)' };
      }
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Main agent function
 */
async function generateAllBrandLogos() {
  console.log('\n🤖 AI Brand Logo Generator Agent Started\n');
  console.log('═'.repeat(60));

  const uploadsPath = path.join(__dirname, '../uploads/brands');

  // Ensure directory exists
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log(`✅ Created directory: ${uploadsPath}\n`);
  }

  console.log(`📁 Target folder: ${uploadsPath}`);
  console.log(`🎨 Total brands: ${BRANDS.length}`);
  console.log('═'.repeat(60) + '\n');

  const results = {
    created: [],
    skipped: [],
    failed: []
  };

  // Generate logos for each brand
  for (let i = 0; i < BRANDS.length; i++) {
    const brand = BRANDS[i];
    process.stdout.write(`[${String(i + 1).padStart(2)}/${BRANDS.length}] ${brand.name.padEnd(20)}`);

    const result = await createBrandLogo(brand, uploadsPath);

    if (result.success) {
      console.log(`✅ ${result.format || 'Created'}`);
      results.created.push(brand.name);
    } else if (result.message === 'exists') {
      console.log(`⏭️  Already exists`);
      results.skipped.push(brand.name);
    } else {
      console.log(`❌ Failed: ${result.message}`);
      results.failed.push(brand.name);
    }
  }

  // Summary report
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Generation Complete\n');
  console.log(`✅ Created:  ${results.created.length} new logos`);
  console.log(`⏭️  Skipped:  ${results.skipped.length} existing logos`);
  console.log(`❌ Failed:   ${results.failed.length} logos`);
  console.log('\n' + '═'.repeat(60));

  if (results.created.length > 0) {
    console.log('\n🎉 New Brands Created:');
    results.created.forEach(name => console.log(`   • ${name}`));
  }

  if (results.failed.length > 0) {
    console.log('\n⚠️  Failed Brands:');
    results.failed.forEach(name => console.log(`   • ${name}`));
  }

  console.log('\n💡 Next Steps:');
  console.log('   1. Re-seed database to update brand records');
  console.log('   2. Restart backend server to clear cache');
  console.log('   3. Visit http://localhost:3000/home to verify logos\n');

  console.log('📂 Logo files saved to:');
  console.log(`   ${uploadsPath}\n`);

  return {
    total: BRANDS.length,
    created: results.created.length,
    skipped: results.skipped.length,
    failed: results.failed.length,
    success: results.failed.length === 0
  };
}

// Run the agent
generateAllBrandLogos()
  .then(result => {
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Fatal Error:', error.message);
    process.exit(1);
  });
