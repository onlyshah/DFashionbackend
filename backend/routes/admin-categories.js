const express = require('express');
const router = express.Router();
const adminCategoriesController = require('../controllers/adminCategoriesController');
const { auth, requireRole } = require('../middleware/auth');

// Category management
router.get('/', auth, requireRole(['super_admin', 'admin']), adminCategoriesController.getAllCategories);
router.post('/', auth, requireRole(['super_admin', 'admin']), adminCategoriesController.createCategory);
router.get('/:categoryId', auth, requireRole(['super_admin', 'admin']), adminCategoriesController.getCategoryById);
router.put('/:categoryId', auth, requireRole(['super_admin', 'admin']), adminCategoriesController.updateCategory);
router.delete('/:categoryId', auth, requireRole(['super_admin', 'admin']), adminCategoriesController.deleteCategory);

// Sub-category management
router.get('/:categoryId/subcategories', auth, requireRole(['super_admin', 'admin']), adminCategoriesController.getSubCategories);
router.post('/:categoryId/subcategories', auth, requireRole(['super_admin', 'admin']), adminCategoriesController.createSubCategory);
router.put('/:categoryId/subcategories/:subCategoryId', auth, requireRole(['super_admin', 'admin']), adminCategoriesController.updateSubCategory);
router.delete('/:categoryId/subcategories/:subCategoryId', auth, requireRole(['super_admin', 'admin']), adminCategoriesController.deleteSubCategory);

// Bulk operations
router.post('/bulk/import', auth, requireRole(['super_admin', 'admin']), adminCategoriesController.bulkImportCategories);
router.post('/bulk/export', auth, requireRole(['super_admin', 'admin']), adminCategoriesController.bulkExportCategories);

module.exports = router;