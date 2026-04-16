#!/usr/bin/env node

/**
 * 🚀 Brand Logo Generator - Smart Runner
 * Automatically checks dependencies and runs the AI generator
 * 
 * Usage: node scripts/setup-and-generate-logos.js
 */

const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(color, text) {
  console.log(`${colors[color || 'reset']}${text}${colors.reset}`);
}

function checkDependency(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function runSetup() {
  log('blue', '\n╔══════════════════════════════════════════════╗');
  log('blue', '║  🤖 AI Brand Logo Generator Setup             ║');
  log('blue', '╚══════════════════════════════════════════════╝\n');

  // Check Node.js version
  log('bold', '📋 Checking System Requirements:');
  const nodeVersion = process.version;
  log('green', `   ✅ Node.js: ${nodeVersion}`);

  // Check if uploads/brands exists
  const brandsPath = path.join(__dirname, '../uploads/brands');
  if (!fs.existsSync(brandsPath)) {
    fs.mkdirSync(brandsPath, { recursive: true });
    log('green', `   ✅ Created brands folder: ${brandsPath}`);
  } else {
    log('green', `   ✅ Brands folder exists: ${brandsPath}`);
  }

  // Check for image conversion tools
  log('bold', '\n🔧 Image Conversion Tools (Optional but Recommended):');
  
  const hasImageMagick = checkDependency('convert');
  const hasFFmpeg = checkDependency('ffmpeg');
  const hasSharp = (() => {
    try {
      require.resolve('sharp');
      return true;
    } catch {
      return false;
    }
  })();

  if (hasImageMagick) {
    log('green', '   ✅ ImageMagick found (best quality)');
  } else {
    log('yellow', '   ⚠️  ImageMagick not found');
  }

  if (hasFFmpeg) {
    log('green', '   ✅ FFmpeg found');
  } else {
    log('yellow', '   ⚠️  FFmpeg not found');
  }

  if (hasSharp) {
    log('green', '   ✅ Sharp package installed (will use for conversion)');
  } else {
    log('yellow', '   ⚠️  Sharp not installed (optional)');
  }

  // Suggest installations
  if (!hasImageMagick && !hasFFmpeg && !hasSharp) {
    log('bold', '\n💡 Recommendations:');
    log('yellow', '   For PNG conversion, install one of:');
    console.log('\n   Option 1: ImageMagick (Recommended)');
    console.log('   • Windows: choco install imagemagick');
    console.log('   • macOS:   brew install imagemagick');
    console.log('   • Linux:   sudo apt-get install imagemagick\n');

    console.log('   Option 2: Sharp (Node package)');
    console.log('   • npm install sharp\n');

    console.log('   Option 3: FFmpeg');
    console.log('   • Windows: choco install ffmpeg');
    console.log('   • macOS:   brew install ffmpeg');
    console.log('   • Linux:   sudo apt-get install ffmpeg\n');

    log('yellow', '   Without these, SVG versions will be created (still usable)\n');
  }

  // Run the generator
  log('bold', '\n🎨 Running AI Brand Logo Generator...\n');

  try {
    const generatorPath = path.join(__dirname, 'ai-brand-logo-generator.js');
    
    // Import and run directly
    const { spawn } = require('child_process');
    const proc = spawn('node', [generatorPath], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    proc.on('close', (code) => {
      if (code === 0) {
        log('green', '\n✅ Logo generation completed successfully!');
        
        log('bold', '\n📝 Next Steps:');
        console.log('   1. Restart your backend server:');
        log('yellow', '      npm start');
        console.log('\n   2. Re-seed brands (optional to update database):');
        log('yellow', '      npm run seed');
        console.log('\n   3. Visit: http://localhost:3000/home');
        console.log('      Go to "Featured Brands" section\n');
      } else {
        log('red', '\n❌ Generation failed with code:', code);
        process.exit(1);
      }
    });

    proc.on('error', (err) => {
      log('red', `\n❌ Error running generator: ${err.message}`);
      process.exit(1);
    });

  } catch (error) {
    log('red', `\n❌ Setup failed: ${error.message}`);
    process.exit(1);
  }
}

// Check if running from correct directory
const packageJsonPath = path.join(__dirname, '../package.json');
if (!fs.existsSync(packageJsonPath)) {
  log('red', '\n❌ Error: package.json not found');
  log('red', '   Make sure you run this from backend directory\n');
  process.exit(1);
}

runSetup().catch(err => {
  log('red', `\n❌ Fatal error: ${err.message}`);
  process.exit(1);
});
