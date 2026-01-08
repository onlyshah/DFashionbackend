const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuth');
const { body, validationResult } = require('express-validator');
const Page = require('../models/Page');
const Banner = require('../models/Banner');
const FAQ = require('../models/FAQ');

const timestamp = () => new Date().toISOString();

const sendResponse = (res, statusCode, success, data = null, message = '', code = '') => {
  res.status(statusCode).json({
    success,
    data,
    message,
    code: code || statusCode,
    timestamp: timestamp()
  });
};

// ============================================================
// PAGE MANAGEMENT
// ============================================================

// Get all pages
router.get(
  '/pages',
  async (req, res) => {
    try {
      const { page = 1, limit = 20, slug, isPublished } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const filter = {};

      if (slug) filter.slug = slug;
      if (typeof isPublished !== 'undefined') filter.isPublished = isPublished === 'true';

      const pages = await Page.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Page.countDocuments(filter);

      sendResponse(res, 200, true, {
        pages,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total
        }
      }, 'Pages fetched successfully', 'PAGES_FETCHED');
    } catch (error) {
      console.error('Get pages error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch pages', 'FETCH_ERROR');
    }
  }
);

// Get single page by slug
router.get(
  '/pages/:slug',
  async (req, res) => {
    try {
      const page = await Page.findOne({ slug: req.params.slug }).lean();
      if (!page) {
        return sendResponse(res, 404, false, null, 'Page not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, page, 'Page fetched successfully', 'PAGE_FETCHED');
    } catch (error) {
      console.error('Get page error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch page', 'FETCH_ERROR');
    }
  }
);

// Create page (admin only)
router.post(
  '/pages',
  verifyAdminToken,
  requirePermission('cms', 'manage'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('slug').notEmpty().withMessage('Slug is required'),
    body('content').notEmpty().withMessage('Content is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, false, null, 'Validation failed', 'VALIDATION_ERROR');
      }

      const { title, slug, content, metaDescription, metaKeywords, isPublished, author } = req.body;

      // Check if slug already exists
      const existing = await Page.findOne({ slug });
      if (existing) {
        return sendResponse(res, 409, false, null, 'Page slug already exists', 'DUPLICATE_SLUG');
      }

      const page = new Page({
        title,
        slug,
        content,
        metaDescription,
        metaKeywords,
        isPublished: isPublished || false,
        author: author || req.user._id,
        publishedAt: isPublished ? new Date() : null
      });

      await page.save();
      sendResponse(res, 201, true, page, 'Page created successfully', 'PAGE_CREATED');
    } catch (error) {
      console.error('Create page error:', error);
      sendResponse(res, 500, false, null, 'Failed to create page', 'CREATE_ERROR');
    }
  }
);

// Update page (admin only)
router.put(
  '/pages/:id',
  verifyAdminToken,
  requirePermission('cms', 'manage'),
  async (req, res) => {
    try {
      const { title, content, metaDescription, metaKeywords, isPublished } = req.body;

      const page = await Page.findByIdAndUpdate(
        req.params.id,
        {
          title,
          content,
          metaDescription,
          metaKeywords,
          isPublished,
          publishedAt: isPublished && !req.body.publishedAt ? new Date() : req.body.publishedAt,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!page) {
        return sendResponse(res, 404, false, null, 'Page not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, page, 'Page updated successfully', 'PAGE_UPDATED');
    } catch (error) {
      console.error('Update page error:', error);
      sendResponse(res, 500, false, null, 'Failed to update page', 'UPDATE_ERROR');
    }
  }
);

// Delete page (admin only)
router.delete(
  '/pages/:id',
  verifyAdminToken,
  requirePermission('cms', 'manage'),
  async (req, res) => {
    try {
      const page = await Page.findByIdAndDelete(req.params.id);
      if (!page) {
        return sendResponse(res, 404, false, null, 'Page not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, null, 'Page deleted successfully', 'PAGE_DELETED');
    } catch (error) {
      console.error('Delete page error:', error);
      sendResponse(res, 500, false, null, 'Failed to delete page', 'DELETE_ERROR');
    }
  }
);

// ============================================================
// BANNER MANAGEMENT
// ============================================================

// Get all banners
router.get(
  '/banners',
  async (req, res) => {
    try {
      const { page = 1, limit = 20, position, isActive } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const filter = {};

      if (position) filter.position = position;
      if (typeof isActive !== 'undefined') filter.isActive = isActive === 'true';

      const banners = await Banner.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Banner.countDocuments(filter);

      sendResponse(res, 200, true, {
        banners,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total
        }
      }, 'Banners fetched successfully', 'BANNERS_FETCHED');
    } catch (error) {
      console.error('Get banners error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch banners', 'FETCH_ERROR');
    }
  }
);

// Get single banner
router.get(
  '/banners/:id',
  async (req, res) => {
    try {
      const banner = await Banner.findById(req.params.id).lean();
      if (!banner) {
        return sendResponse(res, 404, false, null, 'Banner not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, banner, 'Banner fetched successfully', 'BANNER_FETCHED');
    } catch (error) {
      console.error('Get banner error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch banner', 'FETCH_ERROR');
    }
  }
);

// Create banner (admin only)
router.post(
  '/banners',
  verifyAdminToken,
  requirePermission('cms', 'manage'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('imageUrl').notEmpty().withMessage('Image URL is required'),
    body('position').isIn(['hero', 'sidebar', 'footer', 'popup']).withMessage('Invalid position'),
    body('link').optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, false, null, 'Validation failed', 'VALIDATION_ERROR');
      }

      const { title, imageUrl, position, link, altText, isActive } = req.body;

      const banner = new Banner({
        title,
        imageUrl,
        position,
        link,
        altText: altText || title,
        isActive: isActive !== false
      });

      await banner.save();
      sendResponse(res, 201, true, banner, 'Banner created successfully', 'BANNER_CREATED');
    } catch (error) {
      console.error('Create banner error:', error);
      sendResponse(res, 500, false, null, 'Failed to create banner', 'CREATE_ERROR');
    }
  }
);

// Update banner (admin only)
router.put(
  '/banners/:id',
  verifyAdminToken,
  requirePermission('cms', 'manage'),
  async (req, res) => {
    try {
      const { title, imageUrl, position, link, altText, isActive } = req.body;

      const banner = await Banner.findByIdAndUpdate(
        req.params.id,
        { title, imageUrl, position, link, altText, isActive, updatedAt: new Date() },
        { new: true }
      );

      if (!banner) {
        return sendResponse(res, 404, false, null, 'Banner not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, banner, 'Banner updated successfully', 'BANNER_UPDATED');
    } catch (error) {
      console.error('Update banner error:', error);
      sendResponse(res, 500, false, null, 'Failed to update banner', 'UPDATE_ERROR');
    }
  }
);

// Delete banner (admin only)
router.delete(
  '/banners/:id',
  verifyAdminToken,
  requirePermission('cms', 'manage'),
  async (req, res) => {
    try {
      const banner = await Banner.findByIdAndDelete(req.params.id);
      if (!banner) {
        return sendResponse(res, 404, false, null, 'Banner not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, null, 'Banner deleted successfully', 'BANNER_DELETED');
    } catch (error) {
      console.error('Delete banner error:', error);
      sendResponse(res, 500, false, null, 'Failed to delete banner', 'DELETE_ERROR');
    }
  }
);

// ============================================================
// FAQ MANAGEMENT
// ============================================================

// Get all FAQs
router.get(
  '/faqs',
  async (req, res) => {
    try {
      const { page = 1, limit = 20, category } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const filter = {};

      if (category) filter.category = category;

      const faqs = await FAQ.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await FAQ.countDocuments(filter);

      sendResponse(res, 200, true, {
        faqs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total
        }
      }, 'FAQs fetched successfully', 'FAQS_FETCHED');
    } catch (error) {
      console.error('Get FAQs error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch FAQs', 'FETCH_ERROR');
    }
  }
);

// Get single FAQ
router.get(
  '/faqs/:id',
  async (req, res) => {
    try {
      const faq = await FAQ.findById(req.params.id).lean();
      if (!faq) {
        return sendResponse(res, 404, false, null, 'FAQ not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, faq, 'FAQ fetched successfully', 'FAQ_FETCHED');
    } catch (error) {
      console.error('Get FAQ error:', error);
      sendResponse(res, 500, false, null, 'Failed to fetch FAQ', 'FETCH_ERROR');
    }
  }
);

// Create FAQ (admin only)
router.post(
  '/faqs',
  verifyAdminToken,
  requirePermission('cms', 'manage'),
  [
    body('question').notEmpty().withMessage('Question is required'),
    body('answer').notEmpty().withMessage('Answer is required'),
    body('category').optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, false, null, 'Validation failed', 'VALIDATION_ERROR');
      }

      const { question, answer, category, order } = req.body;

      const faq = new FAQ({
        question,
        answer,
        category: category || 'General',
        order: order || 0,
        isActive: true
      });

      await faq.save();
      sendResponse(res, 201, true, faq, 'FAQ created successfully', 'FAQ_CREATED');
    } catch (error) {
      console.error('Create FAQ error:', error);
      sendResponse(res, 500, false, null, 'Failed to create FAQ', 'CREATE_ERROR');
    }
  }
);

// Update FAQ (admin only)
router.put(
  '/faqs/:id',
  verifyAdminToken,
  requirePermission('cms', 'manage'),
  async (req, res) => {
    try {
      const { question, answer, category, order, isActive } = req.body;

      const faq = await FAQ.findByIdAndUpdate(
        req.params.id,
        { question, answer, category, order, isActive, updatedAt: new Date() },
        { new: true }
      );

      if (!faq) {
        return sendResponse(res, 404, false, null, 'FAQ not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, faq, 'FAQ updated successfully', 'FAQ_UPDATED');
    } catch (error) {
      console.error('Update FAQ error:', error);
      sendResponse(res, 500, false, null, 'Failed to update FAQ', 'UPDATE_ERROR');
    }
  }
);

// Delete FAQ (admin only)
router.delete(
  '/faqs/:id',
  verifyAdminToken,
  requirePermission('cms', 'manage'),
  async (req, res) => {
    try {
      const faq = await FAQ.findByIdAndDelete(req.params.id);
      if (!faq) {
        return sendResponse(res, 404, false, null, 'FAQ not found', 'NOT_FOUND');
      }

      sendResponse(res, 200, true, null, 'FAQ deleted successfully', 'FAQ_DELETED');
    } catch (error) {
      console.error('Delete FAQ error:', error);
      sendResponse(res, 500, false, null, 'Failed to delete FAQ', 'DELETE_ERROR');
    }
  }
);

module.exports = router;
