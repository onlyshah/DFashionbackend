/**
 * Content Management Routes - Phase 8
 * Routes: /api/v1/content
 */

const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentManagementControllerPhase8');
const { verifyToken, verifyRole } = require('../middleware/auth');

/**
 * Public Routes
 */

// GET - Get pages
router.get('/pages', contentController.getPages);

// GET - Get page by slug
router.get('/pages/:slug', contentController.getPageBySlug);

// GET - Get blogs
router.get('/blogs', contentController.getBlogs);

// GET - Get blog by slug
router.get('/blogs/:slug', contentController.getBlogBySlug);

// GET - Get blog comments
router.get('/blogs/:blogId/comments', contentController.getBlogComments);

/**
 * Protected Routes (User)
 */

router.post('/blogs/:blogId/comments', verifyToken, contentController.addBlogComment);

/**
 * Protected Routes (Admin)
 */

const adminAuth = [verifyToken, verifyRole(['admin', 'super_admin'])];

// POST - Create page
router.post('/pages', adminAuth, contentController.createPage);

// PATCH - Update page
router.patch('/pages/:pageId', adminAuth, contentController.updatePage);

// DELETE - Delete page
router.delete('/pages/:pageId', adminAuth, contentController.deletePage);

// PATCH - Publish page
router.patch('/pages/:pageId/publish', adminAuth, contentController.publishPage);

// PATCH - Unpublish page
router.patch('/pages/:pageId/unpublish', adminAuth, contentController.unpublishPage);

// POST - Create blog
router.post('/blogs', adminAuth, contentController.createBlog);

// PATCH - Update blog
router.patch('/blogs/:blogId', adminAuth, contentController.updateBlog);

// DELETE - Delete blog
router.delete('/blogs/:blogId', adminAuth, contentController.deleteBlog);

module.exports = router;
