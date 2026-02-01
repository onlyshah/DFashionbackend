const express = require('express');
const router = express.Router();
const cmsController = require('../controllers/cmsController');
const { auth } = require('../middleware/auth');
const { verifyAdminToken, requirePermission } = require('../middleware/adminAuth');

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

module.exports = router;