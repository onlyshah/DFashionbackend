const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const uploadController = require('../controllers/uploadController');
const { auth, isVendor } = require('../middleware/auth');

const router = express.Router();

const uploadsRoot = path.join(__dirname, '..', 'uploads');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function buildStorage(subdir) {
  const prefixMap = {
    products: 'product',
    posts: 'post',
    reels: 'reel',
    stories: 'story',
    users: 'user',
    avatars: 'avatar',
    brands: 'brand',
    temp: 'file'
  };

  return multer.diskStorage({
    destination(req, file, cb) {
      const target = path.join(uploadsRoot, subdir);
      ensureDir(target);
      cb(null, target);
    },
    filename(req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
      cb(null, `${prefixMap[subdir] || 'file'}-${uniqueSuffix}${ext}`);
    }
  });
}

function buildUploader(subdir, { imageOnly = false, videoOnly = false, multiple = false, maxCount = 10 } = {}) {
  return multer({
    storage: buildStorage(subdir),
    limits: {
      fileSize: videoOnly ? 100 * 1024 * 1024 : 15 * 1024 * 1024
    },
    fileFilter(req, file, cb) {
      if (imageOnly && !file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'), false);
      }
      if (videoOnly && !file.mimetype.startsWith('video/')) {
        return cb(new Error('Only video files are allowed'), false);
      }
      cb(null, true);
    }
  });
}

// Single image upload
router.post('/image', auth, buildUploader('products', { imageOnly: true }).single('file'), uploadController.uploadImage);

// Single video upload
router.post('/video', auth, buildUploader('reels', { videoOnly: true }).single('file'), uploadController.uploadVideo);

// Multiple images upload
router.post('/multiple', auth, buildUploader('posts', { imageOnly: true }).array('files', 10), uploadController.uploadMultiple);

// Product images upload
router.post('/product-images', auth, isVendor, buildUploader('products', { imageOnly: true }).array('files', 12), uploadController.uploadProductImages);

// Avatar upload
router.post('/avatar', auth, buildUploader('avatars', { imageOnly: true }).single('file'), uploadController.uploadAvatar);

// Post media upload
router.post('/post-media', auth, buildUploader('posts').single('file'), uploadController.uploadPostMedia);

// Story media upload
router.post('/story-media', auth, buildUploader('stories').single('file'), uploadController.uploadStoryMedia);

// Delete uploaded file
router.delete('/:filename', auth, uploadController.deleteFile);

module.exports = router;
