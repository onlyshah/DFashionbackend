const express = require('express');
const uploadController = require('../controllers/uploadController');
const { auth, isVendor } = require('../middleware/auth');

const router = express.Router();

// Single image upload
router.post('/image', auth, uploadController.uploadImage);

// Multiple images upload
router.post('/multiple', auth, uploadController.uploadMultiple);

// Product images upload
router.post('/product-images', auth, isVendor, uploadController.uploadProductImages);

// Avatar upload
router.post('/avatar', auth, uploadController.uploadAvatar);

// Post media upload
router.post('/post-media', auth, uploadController.uploadPostMedia);

// Story media upload
router.post('/story-media', auth, uploadController.uploadStoryMedia);

// Delete uploaded file
router.delete('/:filename', auth, uploadController.deleteFile);

module.exports = router;