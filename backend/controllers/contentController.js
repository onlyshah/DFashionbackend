const models = require('../models');
const Post = models.Post;
const Story = models.Story;
const Reel = models.Reel;
const Product = models.Product;
const User = models.User;
const DataValidationService = require('../services/dataValidationService');
const RewardService = require('../services/rewardService');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/content/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
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

/**
 * Create new content (post, story, or reel) with mandatory product tagging
 */
const createContent = async (req, res) => {
  try {
    const { type, caption, tags, location, products, settings } = req.body;
    const userId = req.user.id;
    
    // Validate content creation requirements
    const validation = await DataValidationService.validateContentCreation(
      { products: JSON.parse(products || '[]') },
      userId
    );
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(', ')
      });
    }
    
    // Parse products array
    const productTags = JSON.parse(products || '[]');
    
    // Validate that all tagged products exist and are active
    for (const productTag of productTags) {
      const product = await Product.findById(productTag.product);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product with ID ${productTag.product} does not exist`
        });
      }
      if (!product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} is not available`
        });
      }
    }
    
    // Process uploaded files
    const mediaFiles = [];
    if (req.files) {
      Object.keys(req.files).forEach(key => {
        if (key.startsWith('media_')) {
          mediaFiles.push({
            url: `/uploads/content/${req.files[key][0].filename}`,
            type: req.files[key][0].mimetype.startsWith('video/') ? 'video' : 'image',
            filename: req.files[key][0].filename
          });
        }
      });
    }
    
    if (mediaFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one media file is required'
      });
    }
    
    // Create content based on type
    let content;
    const contentData = {
      user: userId,
      caption: caption || '',
      media: mediaFiles,
      products: productTags,
      tags: JSON.parse(tags || '[]'),
      location: location ? JSON.parse(location) : undefined,
      settings: settings ? JSON.parse(settings) : undefined
    };
    
    switch (type) {
      case 'post':
        content = new Post(contentData);
        break;
      case 'story':
        content = new Story({
          ...contentData,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });
        break;
      case 'reel':
        content = new Reel(contentData);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid content type'
        });
    }
    
    await content.save();
    
    // Update user content stats
    await User.findByIdAndUpdate(userId, {
      $inc: {
        [`contentStats.${type}sPosted`]: 1,
        'contentStats.productsTagged': productTags.length,
        'analytics.totalPosts': 1
      }
    });
    
    // Award credits for content creation
    await RewardService.awardCredits(userId, 'content_creation', {
      contentType: type,
      contentId: content._id,
      productsTagged: productTags.length
    });
    
    // Populate the response
    await content.populate('user', 'username fullName profilePicture');
    await content.populate('products.product', 'name price images');
    
    res.status(201).json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} created successfully`,
      data: content
    });
    
  } catch (error) {
    console.error('Error creating content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create content',
      error: error.message
    });
  }
};

/**
 * Get available products for tagging
 */
const getAvailableProducts = async (req, res) => {
  try {
    const { search, category, limit = 20 } = req.query;
    
    const query = { isActive: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    const products = await Product.find(query)
      .select('name price images category tags vendor')
      .populate('vendor', 'businessName')
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: products
    });
    
  } catch (error) {
    console.error('Error fetching available products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

/**
 * Track content engagement
 */
const trackEngagement = async (req, res) => {
  try {
    const { contentId, engagementType, metadata } = req.body;
    const userId = req.user?.id;
    
    // Find content in any collection
    let content = await Post.findById(contentId) || 
                  await Story.findById(contentId) || 
                  await Reel.findById(contentId);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }
    
    // Update engagement stats
    const updateData = {};
    switch (engagementType) {
      case 'view':
        updateData['engagement.views'] = 1;
        if (userId && !content.viewedBy?.includes(userId)) {
          updateData['engagement.uniqueViews'] = 1;
          updateData.$addToSet = { viewedBy: userId };
        }
        break;
      case 'like':
        if (userId) {
          await RewardService.awardCredits(userId, 'post_like', {
            sourceContent: { contentType: content.constructor.modelName.toLowerCase(), contentId }
          });
        }
        break;
      case 'share':
        updateData['engagement.shares'] = 1;
        if (userId) {
          await RewardService.awardCredits(userId, 'post_share', {
            sourceContent: { contentType: content.constructor.modelName.toLowerCase(), contentId }
          });
        }
        break;
      case 'product_click':
        updateData['engagement.clickThroughs'] = 1;
        break;
    }
    
    if (Object.keys(updateData).length > 0) {
      await content.constructor.findByIdAndUpdate(contentId, { $inc: updateData });
    }
    
    res.json({
      success: true,
      message: 'Engagement tracked successfully'
    });
    
  } catch (error) {
    console.error('Error tracking engagement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track engagement',
      error: error.message
    });
  }
};

/**
 * Get user content with analytics
 */
const getUserContent = async (req, res) => {
  try {
    const { userId, type } = req.query;
    const targetUserId = userId || req.user.id;
    
    let content = [];
    
    if (!type || type === 'post') {
      const posts = await Post.find({ user: targetUserId })
        .populate('user', 'username fullName profilePicture')
        .populate('products.product', 'name price images')
        .sort({ createdAt: -1 });
      content = content.concat(posts.map(p => ({ ...p.toObject(), type: 'post' })));
    }
    
    if (!type || type === 'story') {
      const stories = await Story.find({ 
        user: targetUserId,
        expiresAt: { $gt: new Date() }
      })
        .populate('user', 'username fullName profilePicture')
        .populate('products.product', 'name price images')
        .sort({ createdAt: -1 });
      content = content.concat(stories.map(s => ({ ...s.toObject(), type: 'story' })));
    }
    
    if (!type || type === 'reel') {
      const reels = await Reel.find({ user: targetUserId })
        .populate('user', 'username fullName profilePicture')
        .populate('products.product', 'name price images')
        .sort({ createdAt: -1 });
      content = content.concat(reels.map(r => ({ ...r.toObject(), type: 'reel' })));
    }
    
    // Sort by creation date
    content.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      data: content
    });
    
  } catch (error) {
    console.error('Error fetching user content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content',
      error: error.message
    });
  }
};

module.exports = {
  createContent,
  getAvailableProducts,
  trackEngagement,
  getUserContent
};
