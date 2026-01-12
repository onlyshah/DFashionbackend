const imageUtil = require('./image-utils');

async function generate() {
  console.log('Generating upload placeholders...');

  // Categories
  const categories = ['default','men','women','kids','shoes','bags','jewelry','watches','accessories','eyewear'];
  categories.forEach((c, idx) => imageUtil.createMediaFile('categories', c, idx, 'svg'));

  // Avatars
  for (let i = 0; i < 10; i++) imageUtil.createMediaFile('avatars', `avatar ${i}`, i, 'svg');

  // Products - two images each
  for (let i = 0; i < 50; i++) {
    imageUtil.createMediaFile('products', `product ${i} primary`, `${i}_1`, 'svg');
    imageUtil.createMediaFile('products', `product ${i} secondary`, `${i}_2`, 'svg');
  }

  // Banners
  for (let i = 0; i < 15; i++) imageUtil.createMediaFile('banners', `banner ${i}`, i, 'svg');

  // Posts
  for (let i = 0; i < 20; i++) imageUtil.createMediaFile('posts', `post ${i}`, i, 'svg');

  // Stories
  for (let i = 0; i < 20; i++) imageUtil.createMediaFile('stories', `story ${i}`, i, 'svg');

  // Reels (placeholder mp4 files)
  for (let i = 0; i < 20; i++) imageUtil.createMediaFile('reels', `reel ${i}`, i, 'mp4');

  // Style inspiration
  for (let i = 0; i < 15; i++) imageUtil.createMediaFile('style_inspiration', `style ${i}`, i, 'svg');

  console.log('Done. Created placeholders under backend/uploads/*');
}

generate();
