const express = require('express');
const router = express.Router();
const cmsController = require('../controllers/cmsController');
const cmsMediaController = require('../controllers/cmsMediaController');
const { auth } = require('../middleware/auth');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuth');
const multer = require('multer');
const path = require('path');

// Configure multer for media uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/cms-media/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

// Pages
router.get('/pages', cmsController.getAllPages);
router.get('/pages/:slug', cmsController.getPageBySlug);
router.post('/pages', verifyAdminToken, requirePermission('cms', 'manage'), cmsController.createPage);
router.put('/pages/:id', verifyAdminToken, requirePermission('cms', 'manage'), cmsController.updatePage);
router.delete('/pages/:id', verifyAdminToken, requirePermission('cms', 'manage'), cmsController.deletePage);

// Banners
router.get('/banners', cmsController.getAllBanners);
router.get('/banners/:id', cmsController.getBannerById);
router.post('/banners', verifyAdminToken, requirePermission('cms', 'manage'), cmsController.createBanner);
router.put('/banners/:id', verifyAdminToken, requirePermission('cms', 'manage'), cmsController.updateBanner);
router.delete('/banners/:id', verifyAdminToken, requirePermission('cms', 'manage'), cmsController.deleteBanner);

// FAQs
router.get('/faqs', cmsController.getAllFAQs);
router.get('/faqs/:id', cmsController.getFAQById);
router.post('/faqs', verifyAdminToken, requirePermission('cms', 'manage'), cmsController.createFAQ);
router.put('/faqs/:id', verifyAdminToken, requirePermission('cms', 'manage'), cmsController.updateFAQ);
router.delete('/faqs/:id', verifyAdminToken, requirePermission('cms', 'manage'), cmsController.deleteFAQ);

// Media Library
router.get('/media', cmsMediaController.getAllMedia);
router.get('/media/:id', cmsMediaController.getMediaById);
router.post('/media', verifyAdminToken, requirePermission('cms', 'manage'), upload.single('file'), cmsMediaController.uploadMedia);
router.delete('/media/:id', verifyAdminToken, requirePermission('cms', 'manage'), cmsMediaController.deleteMedia);

module.exports = router;