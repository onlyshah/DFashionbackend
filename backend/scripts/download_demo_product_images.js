// Download demo product images for realistic product demo
// Usage: node scripts/download_demo_product_images.js

const fs = require('fs');
const path = require('path');
const https = require('https');

const IMAGES = [
  { name: 'dress-1.jpg', url: 'https://images.pexels.com/photos/532220/pexels-photo-532220.jpeg?auto=compress&w=400' },
  { name: 'shoes-1.jpg', url: 'https://images.pexels.com/photos/19090/pexels-photo.jpg?auto=compress&w=400' },
  { name: 'jacket-1.jpg', url: 'https://images.pexels.com/photos/428340/pexels-photo-428340.jpeg?auto=compress&w=400' },
  { name: 'bag-1.jpg', url: 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&w=400' },
  { name: 'watch-1.jpg', url: 'https://images.pexels.com/photos/190819/pexels-photo-190819.jpeg?auto=compress&w=400' },
  { name: 'sunglasses-1.jpg', url: 'https://images.pexels.com/photos/46710/pexels-photo-46710.jpeg?auto=compress&w=400' },
  { name: 'tshirt-1.jpg', url: 'https://images.pexels.com/photos/2983464/pexels-photo-2983464.jpeg?auto=compress&w=400' },
  { name: 'jeans-1.jpg', url: 'https://images.pexels.com/photos/2983463/pexels-photo-2983463.jpeg?auto=compress&w=400' },
  { name: 'heels-1.jpg', url: 'https://images.pexels.com/photos/1488463/pexels-photo-1488463.jpeg?auto=compress&w=400' },
  { name: 'scarf-1.jpg', url: 'https://images.pexels.com/photos/934070/pexels-photo-934070.jpeg?auto=compress&w=400' }
];


const UPLOADS_DIR = path.join(__dirname, '../uploads');
const FOLDERS = ['products', 'categories', 'avatars', 'posts', 'stories', 'brands', 'temp'];

// For each folder, generate unique image names
const IMAGES_PER_FOLDER = 10;
const DEMO_IMAGE_URLS = [
  'https://images.pexels.com/photos/532220/pexels-photo-532220.jpeg?auto=compress&w=400',
  'https://images.pexels.com/photos/19090/pexels-photo.jpg?auto=compress&w=400',
  'https://images.pexels.com/photos/428340/pexels-photo-428340.jpeg?auto=compress&w=400',
  'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&w=400',
  'https://images.pexels.com/photos/190819/pexels-photo-190819.jpeg?auto=compress&w=400',
  'https://images.pexels.com/photos/46710/pexels-photo-46710.jpeg?auto=compress&w=400',
  'https://images.pexels.com/photos/2983464/pexels-photo-2983464.jpeg?auto=compress&w=400',
  'https://images.pexels.com/photos/2983463/pexels-photo-2983463.jpeg?auto=compress&w=400',
  'https://images.pexels.com/photos/1488463/pexels-photo-1488463.jpeg?auto=compress&w=400',
  'https://images.pexels.com/photos/934070/pexels-photo-934070.jpeg?auto=compress&w=400'
];

const BRAND_LOGOS = [
  { name: 'brand-nike.png', url: 'https://images.pexels.com/photos/267202/pexels-photo-267202.jpeg?auto=compress&w=200' },
  { name: 'brand-adidas.png', url: 'https://images.pexels.com/photos/2983464/pexels-photo-2983464.jpeg?auto=compress&w=200' },
  { name: 'brand-puma.png', url: 'https://images.pexels.com/photos/2983463/pexels-photo-2983463.jpeg?auto=compress&w=200' },
  { name: 'brand-zara.png', url: 'https://images.pexels.com/photos/934070/pexels-photo-934070.jpeg?auto=compress&w=200' },
  { name: 'brand-hm.png', url: 'https://images.pexels.com/photos/1488463/pexels-photo-1488463.jpeg?auto=compress&w=200' }
];

const DEFAULT_IMAGE = {
  name: 'default-image.png',
  url: 'https://images.pexels.com/photos/1022923/pexels-photo-1022923.jpeg?auto=compress&w=400'
};

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



function deleteAllImagesInDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.lstatSync(filePath).isDirectory()) {
      deleteAllImagesInDir(filePath);
      // Optionally remove empty subfolders, but keep main structure
      // fs.rmdirSync(filePath, { recursive: true });
    } else {
      // Only delete image files (jpg, jpeg, png, gif, webp, svg)
      if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)) {
        fs.unlinkSync(filePath);
      }
    }
  }
}

async function main() {
  // Delete all images in uploads and its subfolders
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  deleteAllImagesInDir(UPLOADS_DIR);

  for (const folder of FOLDERS) {
    const targetDir = path.join(UPLOADS_DIR, folder);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    if (folder === 'brands') {
      for (const logo of BRAND_LOGOS) {
        const dest = path.join(targetDir, logo.name);
        console.log(`Downloading ${logo.name} to brands...`);
        await downloadImage(logo.url, dest);
      }
      console.log('Brand logos downloaded.');
      continue;
    }

    if (folder === 'temp') {
      const dest = path.join(targetDir, DEFAULT_IMAGE.name);
      console.log(`Downloading default image to temp...`);
      await downloadImage(DEFAULT_IMAGE.url, dest);
      console.log('Default image downloaded to temp.');
      continue;
    }

    for (let i = 0; i < IMAGES_PER_FOLDER; i++) {
      const url = DEMO_IMAGE_URLS[i % DEMO_IMAGE_URLS.length];
      const ext = path.extname(url.split('?')[0]) || '.jpg';
      const imgName = `${folder}-${i + 1}${ext}`;
      const dest = path.join(targetDir, imgName);
      console.log(`Downloading ${imgName} to ${folder}...`);
      await downloadImage(url, dest);
    }
    console.log(`Demo images downloaded for ${folder}.`);
  }
  console.log('All demo images downloaded.');
}

main().catch(err => {
  console.error('Error downloading images:', err);
  process.exit(1);
});
