const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, isVendor, isAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const config = require('../config').config;

const router = express.Router();

// Ensure upload directory exists
const uploadDir = config.upload.path;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create subdirectories for different types
const subdirs = ['products', 'users', 'posts', 'stories', 'temp'];
subdirs.forEach(subdir => {
  const dirPath = path.join(uploadDir, subdir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Helper function to parse file size
const parseFileSize = (sizeStr) => {
  const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
  if (!match) return 5 * 1024 * 1024; // Default 5MB
  return parseFloat(match[1]) * units[match[2].toUpperCase()];
};

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = config.upload.allowedTypes;
  const fileExt = path.extname(file.originalname).toLowerCase().slice(1);
  
  if (allowedTypes.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error(`File type .${fileExt} is not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Storage configuration for different upload types
const createStorage = (subdir) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(uploadDir, subdir);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileExt = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${fileExt}`);
    }
  });
};

// Multer configurations for different upload types
const uploadConfigs = {
  single: multer({
    storage: createStorage('temp'),
    limits: { fileSize: parseFileSize(config.upload.maxFileSize) },
    fileFilter
  }),
  
  multiple: multer({
    storage: createStorage('temp'),
    limits: { 
      fileSize: parseFileSize(config.upload.maxFileSize),
      files: 10 // Maximum 10 files
    },
    fileFilter
  }),
  
  products: multer({
    storage: createStorage('products'),
    limits: { 
      fileSize: parseFileSize(config.upload.maxFileSize),
      files: 5 // Maximum 5 product images
    },
    fileFilter
  }),
  
  users: multer({
    storage: createStorage('users'),
    limits: { fileSize: parseFileSize(config.upload.maxFileSize) },
    fileFilter
  }),
  
  posts: multer({
    storage: createStorage('posts'),
    limits: { 
      fileSize: parseFileSize(config.upload.maxFileSize),
      files: 10 // Maximum 10 media files per post
    },
    fileFilter
  }),
  
  stories: multer({
    storage: createStorage('stories'),
    limits: { fileSize: parseFileSize(config.upload.maxFileSize) },
    fileFilter
  })
};

// Helper function to generate file URL
const generateFileUrl = (req, filename, subdir = 'temp') => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/${subdir}/${filename}`;
};

// Helper function to move file from temp to permanent location
const moveFile = (tempPath, permanentPath) => {
  return new Promise((resolve, reject) => {
    fs.rename(tempPath, permanentPath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// @route   POST /api/upload/image
// @desc    Upload single image
// @access  Private
router.post('/image', [auth], (req, res) => {
  uploadConfigs.single.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File too large. Maximum size: ${config.upload.maxFileSize}`
          });
        }
      }
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileUrl = generateFileUrl(req, req.file.filename);
    
    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl,
        path: req.file.path
      }
    });
  });
});

// @route   POST /api/upload/multiple
// @desc    Upload multiple images
// @access  Private
router.post('/multiple', [auth], (req, res) => {
  uploadConfigs.multiple.array('images', 10)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File too large. Maximum size: ${config.upload.maxFileSize}`
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Too many files. Maximum 10 files allowed'
          });
        }
      }
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      url: generateFileUrl(req, file.filename),
      path: file.path
    }));
    
    res.json({
      success: true,
      message: `${req.files.length} images uploaded successfully`,
      data: {
        files: uploadedFiles,
        count: req.files.length
      }
    });
  });
});

// @route   POST /api/upload/product-images
// @desc    Upload product images
// @access  Private (Vendor only)
router.post('/product-images', [auth, isVendor], (req, res) => {
  uploadConfigs.products.array('images', 5)(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File too large. Maximum size: ${config.upload.maxFileSize}`
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Too many files. Maximum 5 product images allowed'
          });
        }
      }
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      url: generateFileUrl(req, file.filename, 'products'),
      path: file.path
    }));

    res.json({
      success: true,
      message: `${req.files.length} product images uploaded successfully`,
      data: {
        images: uploadedFiles,
        count: req.files.length
      }
    });
  });
});

// @route   POST /api/upload/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar', [auth], (req, res) => {
  uploadConfigs.users.single('avatar')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File too large. Maximum size: ${config.upload.maxFileSize}`
          });
        }
      }
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileUrl = generateFileUrl(req, req.file.filename, 'users');

    // Update user avatar in database
    try {
      const User = require('../models/User');
      await User.findByIdAndUpdate(req.user._id, { avatar: fileUrl });

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          url: fileUrl,
          path: req.file.path
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update user avatar',
        error: error.message
      });
    }
  });
});

// @route   POST /api/upload/post-media
// @desc    Upload post media (images/videos)
// @access  Private
router.post('/post-media', [auth], (req, res) => {
  uploadConfigs.posts.array('media', 10)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File too large. Maximum size: ${config.upload.maxFileSize}`
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Too many files. Maximum 10 media files allowed'
          });
        }
      }
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = req.files.map(file => {
      const isVideo = file.mimetype.startsWith('video/');
      return {
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        url: generateFileUrl(req, file.filename, 'posts'),
        path: file.path,
        type: isVideo ? 'video' : 'image',
        mimetype: file.mimetype
      };
    });

    res.json({
      success: true,
      message: `${req.files.length} media files uploaded successfully`,
      data: {
        media: uploadedFiles,
        count: req.files.length
      }
    });
  });
});

// @route   POST /api/upload/story-media
// @desc    Upload story media (single image/video)
// @access  Private
router.post('/story-media', [auth], (req, res) => {
  uploadConfigs.stories.single('media')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File too large. Maximum size: ${config.upload.maxFileSize}`
          });
        }
      }
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const isVideo = req.file.mimetype.startsWith('video/');
    const fileUrl = generateFileUrl(req, req.file.filename, 'stories');

    res.json({
      success: true,
      message: 'Story media uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl,
        path: req.file.path,
        type: isVideo ? 'video' : 'image',
        mimetype: req.file.mimetype
      }
    });
  });
});

module.exports = router;
