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

function escapeSvg(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paletteFor(subfolder, baseName = '') {
  const key = `${subfolder}:${baseName}`.toLowerCase();
  const palettes = [
    ['#0f172a', '#2563eb', '#38bdf8'],
    ['#111827', '#f97316', '#facc15'],
    ['#1f2937', '#ec4899', '#f472b6'],
    ['#0f766e', '#14b8a6', '#a7f3d0'],
    ['#312e81', '#8b5cf6', '#c4b5fd']
  ];

  let index = 0;
  for (let i = 0; i < key.length; i++) {
    index = (index + key.charCodeAt(i)) % palettes.length;
  }
  return palettes[index];
}

function defaultSvgContent(title, w = 900, h = 900, meta = {}) {
  const safe = escapeSvg(title);
  const sub = escapeSvg(meta.subtitle || 'DFashion');
  const accent = meta.accent || '#2563eb';
  const accent2 = meta.accent2 || '#f97316';
  const [bg1, bg2, bg3] = meta.palette || ['#0f172a', '#2563eb', '#38bdf8'];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="55%" stop-color="${bg2}"/>
      <stop offset="100%" stop-color="${bg3}"/>
    </linearGradient>
    <radialGradient id="glow" cx="30%" cy="20%" r="70%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" rx="48" fill="url(#bg)"/>
  <circle cx="${w * 0.78}" cy="${h * 0.22}" r="${Math.min(w, h) * 0.22}" fill="url(#glow)"/>
  <circle cx="${w * 0.18}" cy="${h * 0.78}" r="${Math.min(w, h) * 0.18}" fill="rgba(255,255,255,0.08)"/>
  <g filter="url(#shadow)">
    <rect x="72" y="72" width="${w - 144}" height="${h - 144}" rx="36" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.22)"/>
  </g>
  <circle cx="${w * 0.18}" cy="${h * 0.22}" r="56" fill="rgba(255,255,255,0.16)"/>
  <circle cx="${w * 0.82}" cy="${h * 0.78}" r="84" fill="rgba(255,255,255,0.12)"/>
  <path d="M120 200 C 220 120, 320 120, 420 200 S 620 280, 720 200" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="18" stroke-linecap="round"/>
  <path d="M150 700 C 260 620, 370 620, 480 700 S 700 780, 810 700" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="14" stroke-linecap="round"/>
  <text x="88" y="340" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="700" fill="#fff" letter-spacing="2">${safe}</text>
  <text x="88" y="405" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="rgba(255,255,255,0.82)">${sub}</text>
  <g transform="translate(88, 470)">
    <rect width="260" height="86" rx="24" fill="${accent}" opacity="0.92"/>
    <text x="130" y="55" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#fff">DFashion</text>
  </g>
  <g transform="translate(${w - 320}, ${h - 330}) rotate(-12)">
    <rect width="180" height="240" rx="28" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.2)"/>
    <circle cx="90" cy="80" r="42" fill="${accent2}" opacity="0.9"/>
    <path d="M48 190 C 70 150, 110 150, 132 190" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
    <path d="M58 190 L 58 120 L 90 150 L 122 120 L 122 190" fill="none" stroke="#fff" stroke-width="8" stroke-linejoin="round"/>
  </g>
</svg>`;
}

function createFashionArtwork(subfolder, baseName, index = 0, options = {}) {
  const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
  const folder = path.join(uploadsRoot, subfolder);
  ensureDir(folder);

  const name = slugify(baseName || subfolder);
  const filename = `${name}-${index}.svg`;
  const filePath = path.join(folder, filename);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(
      filePath,
      defaultSvgContent(baseName || filename, options.width || 900, options.height || 900, {
        subtitle: options.subtitle || subfolder,
        accent: options.accent,
        accent2: options.accent2,
        palette: options.palette || paletteFor(subfolder, baseName)
      })
    );
  }

  return `/uploads/${subfolder}/${filename}`;
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
      fs.writeFileSync(filePath, defaultSvgContent(baseName || filename, 800, 800, {
        subtitle: subfolder,
        palette: paletteFor(subfolder, baseName)
      }));
    } else {
      // placeholder binary/text for other media types (mp4, webm)
      fs.writeFileSync(filePath, `Placeholder media for ${baseName || filename}`);
    }
  }

  return `/uploads/${subfolder}/${filename}`;
}

module.exports = {
  createMediaFile,
  createFashionArtwork,
  ensureDir,
  slugify,
  defaultSvgContent
};
