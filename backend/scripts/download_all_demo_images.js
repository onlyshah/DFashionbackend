// Download new, unique demo images for all upload folders
// Usage: node scripts/download_all_demo_images.js

const fs = require('fs');
const path = require('path');
const https = require('https');

const FOLDERS = {
  products: [
    { name: 'product-1.jpg', url: 'https://images.pexels.com/photos/532220/pexels-photo-532220.jpeg?auto=compress&w=400' },
    { name: 'product-2.jpg', url: 'https://images.pexels.com/photos/2983464/pexels-photo-2983464.jpeg?auto=compress&w=400' },
    { name: 'product-3.jpg', url: 'https://images.pexels.com/photos/2983463/pexels-photo-2983463.jpeg?auto=compress&w=400' },
    { name: 'product-4.jpg', url: 'https://images.pexels.com/photos/1488463/pexels-photo-1488463.jpeg?auto=compress&w=400' },
    { name: 'product-5.jpg', url: 'https://images.pexels.com/photos/934070/pexels-photo-934070.jpeg?auto=compress&w=400' }
  ],
  categories: [
    { name: 'men.jpg', url: 'https://images.pexels.com/photos/936075/pexels-photo-936075.jpeg?auto=compress&w=400' },
    { name: 'women.jpg', url: 'https://images.pexels.com/photos/1138903/pexels-photo-1138903.jpeg?auto=compress&w=400' },
    { name: 'kids.jpg', url: 'https://images.pexels.com/photos/1648376/pexels-photo-1648376.jpeg?auto=compress&w=400' },
    { name: 'accessories.jpg', url: 'https://images.pexels.com/photos/2983465/pexels-photo-2983465.jpeg?auto=compress&w=400' },
    { name: 'bags.jpg', url: 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&w=400' }
  ],
  avatars: [
    { name: 'user1.jpg', url: 'https://randomuser.me/api/portraits/men/1.jpg' },
    { name: 'user2.jpg', url: 'https://randomuser.me/api/portraits/women/2.jpg' },
    { name: 'user3.jpg', url: 'https://randomuser.me/api/portraits/men/3.jpg' },
    { name: 'user4.jpg', url: 'https://randomuser.me/api/portraits/women/4.jpg' },
    { name: 'user5.jpg', url: 'https://randomuser.me/api/portraits/men/5.jpg' }
  ],
  posts: [
    { name: 'post-1.jpg', url: 'https://images.pexels.com/photos/1707828/pexels-photo-1707828.jpeg?auto=compress&w=400' },
    { name: 'post-2.jpg', url: 'https://images.pexels.com/photos/1707829/pexels-photo-1707829.jpeg?auto=compress&w=400' },
    { name: 'post-3.jpg', url: 'https://images.pexels.com/photos/1707830/pexels-photo-1707830.jpeg?auto=compress&w=400' }
  ],
  stories: [
    { name: 'story-1.jpg', url: 'https://images.pexels.com/photos/1707831/pexels-photo-1707831.jpeg?auto=compress&w=400' },
    { name: 'story-2.jpg', url: 'https://images.pexels.com/photos/1707832/pexels-photo-1707832.jpeg?auto=compress&w=400' },
    { name: 'story-3.jpg', url: 'https://images.pexels.com/photos/1707833/pexels-photo-1707833.jpeg?auto=compress&w=400' }
  ]
};

async function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, response => {
      if (response.statusCode !== 200) {
        // Consume response and skip instead of failing the whole script
        response.resume();
        file.close && file.close();
        try { fs.unlinkSync(dest); } catch (e) {}
        console.warn(`Warning: Skipping ${url} - status ${response.statusCode}`);
        resolve(false);
        return;
      }
      response.pipe(file);
      file.on('finish', () => file.close(() => resolve(true)));
    }).on('error', err => {
      try { fs.unlinkSync(dest); } catch (e) {}
      reject(err);
    });
  });
}

async function cleanAndDownload() {
  for (const [folder, images] of Object.entries(FOLDERS)) {
    const dir = path.join(__dirname, `../uploads/${folder}`);
    if (fs.existsSync(dir)) {
      for (const file of fs.readdirSync(dir)) {
        if (/(.jpg|.jpeg|.png|.webp)$/i.test(file)) {
          fs.unlinkSync(path.join(dir, file));
        }
      }
    } else {
      fs.mkdirSync(dir, { recursive: true });
    }
    for (const img of images) {
      const dest = path.join(dir, img.name);
      console.log(`Downloading ${img.name} to ${folder}...`);
      try {
        const ok = await downloadImage(img.url, dest);
        if (!ok) console.log(`   ⏭️  Skipped: ${img.name}`);
      } catch (err) {
        console.warn(`   ⚠️  Error downloading ${img.name}: ${err.message}`);
      }
    }
  }
  console.log('All demo images downloaded and replaced.');
}

cleanAndDownload().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
