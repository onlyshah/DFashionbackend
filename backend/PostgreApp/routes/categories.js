const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { auth, optionalAuth, requireRole } = require('../middleware/auth');

// Debug endpoint - check raw database
router.get('/debug/check-db', async (req, res) => {
  try {
    const models = require('../models_sql');
    const Category = models.Category;
    
    console.log('🔍 [DEBUG] Category model:', Category ? 'EXISTS' : 'NOT FOUND');
    
    if (!Category) {
      return res.json({ error: 'Category model not found' });
    }
    
    const rawResult = await Category.findAll({ limit: 100, raw: true });
    console.log('🔍 [DEBUG] Raw query result count:', rawResult.length);
    console.log('🔍 [DEBUG] Raw data:', JSON.stringify(rawResult.slice(0, 3), null, 2));
    
    res.json({
      modelExists: !!Category,
      count: rawResult.length,
      data: rawResult,
      modelMethods: Object.keys(Category || {}).slice(0, 10)
    });
  } catch (error) {
    console.error('❌ [DEBUG] Error:', error.message);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

router.get('/', categoryController.getAllCategories);
router.get('/:categoryId', categoryController.getCategoryById);
router.post('/', auth, requireRole(['admin', 'super_admin']), categoryController.createCategory);
router.put('/:categoryId', auth, requireRole(['admin', 'super_admin']), categoryController.updateCategory);
router.delete('/:categoryId', auth, requireRole(['admin', 'super_admin']), categoryController.deleteCategory);

module.exports = router;