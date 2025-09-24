// Image Cleanup & Replacement Script
// Scans uploads folders, removes empty/corrupted images, and replaces with valid placeholders
// Usage: node scripts/cleanup_and_replace_images.js

const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MIN_SIZE_BYTES = 1024; // 1KB
const PLACEHOLDER_URL = 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80'; // generic fashion placeholder
const TARGET_FOLDERS = [
  '../uploads/products',
  '../uploads/categories',
  '../uploads/avatars',
  '../uploads/posts',
  '../uploads/stories'
];

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, response => {
      if (response.statusCode !== 200) {
        reject(new Error('Failed to download image: ' + response.statusCode));
        return;
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function cleanupAndReplace() {
  for (const folder of TARGET_FOLDERS) {
    const absFolder = path.join(__dirname, folder);
    if (!fs.existsSync(absFolder)) continue;
    const files = fs.readdirSync(absFolder);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      const filePath = path.join(absFolder, file);
      if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;
      let stats;
      try {
        stats = fs.statSync(filePath);
      } catch {
        continue;
      }
      if (stats.size < MIN_SIZE_BYTES) {
        console.log(`Deleting corrupted/empty: ${filePath}`);
        fs.unlinkSync(filePath);
        // Download and save placeholder
        const newFile = filePath;
        console.log(`Downloading placeholder to: ${newFile}`);
        await downloadImage(PLACEHOLDER_URL, newFile);
      }
    }
  }
  console.log('Image cleanup and replacement complete.');
}

cleanupAndReplace().catch(err => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
