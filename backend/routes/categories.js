const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { auth, optionalAuth, requireRole } = require('../middleware/auth');

router.get('/', categoryController.getAllCategories);
router.get('/:categoryId', categoryController.getCategoryById);
router.post('/', auth, requireRole(['admin', 'super_admin']), categoryController.createCategory);
router.put('/:categoryId', auth, requireRole(['admin', 'super_admin']), categoryController.updateCategory);
router.delete('/:categoryId', auth, requireRole(['admin', 'super_admin']), categoryController.deleteCategory);

module.exports = router;