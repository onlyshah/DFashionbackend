/**
 * Category Routes - Phase 3
 * 5 endpoints for category management
 */

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryControllerPhase3');
const { verifyToken, verifyRole } = require('../middleware/auth');

// Public endpoints
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

// Protected endpoints (Admin only)
router.post('/', verifyToken, verifyRole(['admin']), categoryController.createCategory);
router.put('/:id', verifyToken, verifyRole(['admin']), categoryController.updateCategory);
router.delete('/:id', verifyToken, verifyRole(['admin']), categoryController.deleteCategory);

module.exports = router;
