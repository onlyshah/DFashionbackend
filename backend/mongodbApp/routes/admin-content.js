/**
 * Admin Content Routes (Blogs & Articles)
 * Base path: /api/admin/content
 */

const express = require('express');
const router = express.Router();
const adminContentController = require('../controllers/adminContentController');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuth');

// Public routes - no auth required for viewing blogs
router.get('/blogs', adminContentController.getAllBlogs);
router.get('/blogs/:id', adminContentController.getBlogById);

// Admin only - require auth and cms permission
router.post('/blogs', verifyAdminToken, requirePermission('cms', 'manage'), adminContentController.createBlog);
router.put('/blogs/:id', verifyAdminToken, requirePermission('cms', 'manage'), adminContentController.updateBlog);
router.delete('/blogs/:id', verifyAdminToken, requirePermission('cms', 'manage'), adminContentController.deleteBlog);

module.exports = router;
