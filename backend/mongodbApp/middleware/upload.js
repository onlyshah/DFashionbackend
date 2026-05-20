const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiError = require('../utils/ApiError');

const IMAGE_MAX = 5 * 1024 * 1024; // 5MB
const VIDEO_MAX = 100 * 1024 * 1024; // 100MB

const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };
ensureDir(path.join(process.cwd(), 'uploads', 'images'));
ensureDir(path.join(process.cwd(), 'uploads', 'videos'));

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'uploads', 'images')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`;
    cb(null, name);
  }
});

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'uploads', 'videos')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`;
    cb(null, name);
  }
});

const imageFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) return cb(new ApiError('Invalid image file type', 400, 'ERR_INVALID_FILE_TYPE'));
  cb(null, true);
};

const videoFilter = (req, file, cb) => {
  const allowed = ['.mp4', '.webm'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) return cb(new ApiError('Invalid video file type', 400, 'ERR_INVALID_FILE_TYPE'));
  cb(null, true);
};

exports.uploadImage = multer({ storage: imageStorage, fileFilter: imageFilter, limits: { fileSize: IMAGE_MAX } });
exports.uploadVideo = multer({ storage: videoStorage, fileFilter: videoFilter, limits: { fileSize: VIDEO_MAX } });
// multiple
exports.uploadAny = multer({ storage: multer.diskStorage({
  destination: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const dir = ['.mp4', '.webm'].includes(ext) ? path.join(process.cwd(), 'uploads', 'videos') : path.join(process.cwd(), 'uploads', 'images');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(file.originalname).toLowerCase()}`)
}) });

// Error wrapper for multer
exports.handleUploadError = (err, req, res, next) => {
  if (!err) return next();
  if (err instanceof ApiError) return next(err);
  if (err instanceof multer.MulterError) return next(new ApiError(err.message, 400, 'ERR_UPLOAD'));
  return next(new ApiError('File upload failed', 400, 'ERR_UPLOAD'));
};
