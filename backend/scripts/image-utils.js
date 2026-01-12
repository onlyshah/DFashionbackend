const fs = require('fs');
const path = require('path');

function slugify(s) {
  return (s || 'file').toString().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function defaultSvgContent(title, w = 800, h = 600) {
  const safe = String(title).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n  <rect width="100%" height="100%" fill="#f5f5f7"/>\n  <text x="50%" y="50%" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#999" text-anchor="middle" dominant-baseline="central">${safe}</text>\n</svg>`;
}

// Creates or reuses a media file in uploads/<subfolder>
// Returns the public URL path: /uploads/<subfolder>/<filename>
function createMediaFile(subfolder, baseName, index = 0, ext = 'svg') {
  const uploadsRoot = path.join(__dirname, '..', 'uploads');
  const folder = path.join(uploadsRoot, subfolder);
  ensureDir(folder);

  const name = slugify(baseName || subfolder);
  const filename = `${name}-${index}.${ext}`;
  const filePath = path.join(folder, filename);

  if (!fs.existsSync(filePath)) {
    if (ext === 'svg' || ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
      fs.writeFileSync(filePath, defaultSvgContent(baseName || filename));
    } else {
      // placeholder binary/text for other media types (mp4, webm)
      fs.writeFileSync(filePath, `Placeholder media for ${baseName || filename}`);
    }
  }

  return `/uploads/${subfolder}/${filename}`;
}

module.exports = {
  createMediaFile,
  ensureDir,
  slugify
};
