const express = require('express');
const { validationResult, body, query } = require('express-validator');
const { auth, optionalAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Initialize models (both Sequelize and Mongoose)
function getModels() {
  try {
    const sqlModels = require('../models_sql');
    const mongoModels = require('../models');
    return { sqlModels, mongoModels };
  } catch (err) {
    console.error('Model initialization error:', err.message);
    return { sqlModels: null, mongoModels: null };
  }
}

// =====================================================
// ADMIN ENDPOINTS - Categories Management
// =====================================================

/**
 * GET /api/admin/categories
 * Get all categories with sub-categories (admin view)
 * Returns nested structure: Category -> SubCategories
 */
router.get('/', auth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { sqlModels } = getModels();
    
    if (!sqlModels) {
      return res.status(500).json({
        success: false,
        message: 'Database models not available'
      });
    }

    // Get raw Sequelize models with proper association support
    const Category = sqlModels._raw?.Category || sqlModels.Category;
    const SubCategory = sqlModels._raw?.SubCategory || sqlModels.SubCategory;

    if (!Category || !SubCategory) {
      return res.status(500).json({
        success: false,
        message: 'Category models not configured'
      });
    }

    // Get categories with their sub-categories using association
    const categories = await Category.findAll({
      attributes: ['id', 'name', 'slug', 'description', 'image', 'isActive', 'sortOrder', 'createdAt'],
      include: [{
        model: SubCategory,
        as: 'SubCategories',
        attributes: ['id', 'name', 'slug', 'description', 'isActive', 'sortOrder'],
        required: false
      }],
      order: [['sortOrder', 'ASC'], ['name', 'ASC']]
    });

    res.json({
      success: true,
      data: categories || [],
      total: categories.length
    });

  } catch (error) {
    console.error('Get admin categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/categories/:categoryId/sub-categories
 * Get sub-categories for a specific category
 */
router.get('/:categoryId/sub-categories', 
  auth, 
  requireRole(['super_admin', 'admin']),
  async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { sqlModels } = getModels();

      if (!sqlModels) {
        return res.status(500).json({
          success: false,
          message: 'Database models not available'
        });
      }

      const SubCategory = sqlModels._raw.SubCategory;
      if (!SubCategory) {
        return res.status(500).json({
          success: false,
          message: 'SubCategory model not configured'
        });
      }

      const subCategories = await SubCategory.findAll({
        where: { categoryId },
        attributes: ['id', 'name', 'slug', 'description', 'image', 'isActive', 'sortOrder'],
        order: [['sortOrder', 'ASC']]
      });

      res.json({
        success: true,
        data: subCategories || [],
        categoryId,
        total: subCategories.length
      });

    } catch (error) {
      console.error('Get sub-categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching sub-categories',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/admin/categories
 * Create a new category
 */
router.post('/',
  auth,
  requireRole(['super_admin', 'admin']),
  [
    body('name').notEmpty().withMessage('Category name is required'),
    body('slug').notEmpty().withMessage('Slug is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, slug, description, image, isActive, sortOrder } = req.body;
      const { sqlModels } = getModels();

      if (!sqlModels) {
        return res.status(500).json({
          success: false,
          message: 'Database models not available'
        });
      }

      const Category = sqlModels._raw.Category;
      if (!Category) {
        return res.status(500).json({
          success: false,
          message: 'Category model not configured'
        });
      }

      // Check if slug already exists
      const existing = await Category.findOne({ where: { slug } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Slug already exists'
        });
      }

      const category = await Category.create({
        name,
        slug,
        description: description || null,
        image: image || null,
        isActive: isActive !== false,
        sortOrder: sortOrder || 0
      });

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });

    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating category',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/admin/categories/:categoryId/sub-categories
 * Create a new sub-category
 */
router.post('/:categoryId/sub-categories',
  auth,
  requireRole(['super_admin', 'admin']),
  [
    body('name').notEmpty().withMessage('Sub-category name is required'),
    body('slug').notEmpty().withMessage('Slug is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { categoryId } = req.params;
      const { name, slug, description, image, isActive, sortOrder } = req.body;
      const { sqlModels } = getModels();

      if (!sqlModels) {
        return res.status(500).json({
          success: false,
          message: 'Database models not available'
        });
      }

      const Category = sqlModels._raw.Category;
      const SubCategory = sqlModels._raw.SubCategory;

      if (!Category || !SubCategory) {
        return res.status(500).json({
          success: false,
          message: 'Models not configured'
        });
      }

      // Verify category exists
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Check if slug already exists for this category
      const existing = await SubCategory.findOne({
        where: { categoryId, slug }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Slug already exists for this category'
        });
      }

      const subCategory = await SubCategory.create({
        categoryId,
        name,
        slug,
        description: description || null,
        image: image || null,
        isActive: isActive !== false,
        sortOrder: sortOrder || 0
      });

      res.status(201).json({
        success: true,
        message: 'Sub-category created successfully',
        data: subCategory
      });

    } catch (error) {
      console.error('Create sub-category error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating sub-category',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/admin/categories/:categoryId
 * Update a category
 */
router.put('/:categoryId',
  auth,
  requireRole(['super_admin', 'admin']),
  async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { name, slug, description, image, isActive, sortOrder } = req.body;
      const { sqlModels } = getModels();

      if (!sqlModels) {
        return res.status(500).json({
          success: false,
          message: 'Database models not available'
        });
      }

      const Category = sqlModels._raw.Category;
      if (!Category) {
        return res.status(500).json({
          success: false,
          message: 'Category model not configured'
        });
      }

      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Update fields
      if (name) category.name = name;
      if (slug) category.slug = slug;
      if (description !== undefined) category.description = description;
      if (image !== undefined) category.image = image;
      if (isActive !== undefined) category.isActive = isActive;
      if (sortOrder !== undefined) category.sortOrder = sortOrder;

      await category.save();

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: category
      });

    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating category',
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/admin/categories/:categoryId
 * Delete a category and its sub-categories
 */
/**
 * DELETE /api/admin/categories/:categoryId/sub-categories/:subCategoryId
 * Delete a specific sub-category
 */
router.delete('/:categoryId/sub-categories/:subCategoryId',
  auth,
  requireRole(['super_admin', 'admin']),
  async (req, res) => {
    try {
      const { categoryId, subCategoryId } = req.params;
      const { sqlModels } = getModels();

      if (!sqlModels) {
        return res.status(500).json({
          success: false,
          message: 'Database models not available'
        });
      }

      const Category = sqlModels._raw.Category;
      const SubCategory = sqlModels._raw.SubCategory;

      if (!Category || !SubCategory) {
        return res.status(500).json({
          success: false,
          message: 'Models not configured'
        });
      }

      // Verify category exists
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Find and delete sub-category
      const subCategory = await SubCategory.findOne({
        where: { id: subCategoryId, category_id: categoryId }
      });

      if (!subCategory) {
        return res.status(404).json({
          success: false,
          message: 'Sub-category not found'
        });
      }

      await subCategory.destroy();

      res.json({
        success: true,
        message: 'Sub-category deleted successfully'
      });

    } catch (error) {
      console.error('Delete sub-category error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting sub-category',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/admin/categories/:categoryId/sub-categories/:subCategoryId
 * Update a specific sub-category
 */
router.put('/:categoryId/sub-categories/:subCategoryId',
  auth,
  requireRole(['super_admin', 'admin']),
  [
    body('name').optional().notEmpty().withMessage('Sub-category name cannot be empty'),
    body('slug').optional().notEmpty().withMessage('Slug cannot be empty')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { categoryId, subCategoryId } = req.params;
      const { name, slug, description, image, isActive, sortOrder } = req.body;
      const { sqlModels } = getModels();

      if (!sqlModels) {
        return res.status(500).json({
          success: false,
          message: 'Database models not available'
        });
      }

      const Category = sqlModels._raw.Category;
      const SubCategory = sqlModels._raw.SubCategory;

      if (!Category || !SubCategory) {
        return res.status(500).json({
          success: false,
          message: 'Models not configured'
        });
      }

      // Verify category exists
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Find sub-category
      const subCategory = await SubCategory.findOne({
        where: { id: subCategoryId, category_id: categoryId }
      });

      if (!subCategory) {
        return res.status(404).json({
          success: false,
          message: 'Sub-category not found'
        });
      }

      // Check slug uniqueness if it's being changed
      if (slug && slug !== subCategory.slug) {
        const existing = await SubCategory.findOne({
          where: { categoryId, slug, id: { [require('sequelize').Op.ne]: subCategoryId } }
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Slug already exists for another sub-category in this category'
          });
        }
      }

      // Update sub-category
      await subCategory.update({
        name: name || subCategory.name,
        slug: slug || subCategory.slug,
        description: description || subCategory.description,
        image: image !== undefined ? image : subCategory.image,
        is_active: isActive !== undefined ? isActive : subCategory.is_active,
        sort_order: sortOrder || subCategory.sort_order
      });

      res.json({
        success: true,
        message: 'Sub-category updated successfully',
        subCategory
      });

    } catch (error) {
      console.error('Update sub-category error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating sub-category',
        error: error.message
      });
    }
  }
);

router.delete('/:categoryId',
  auth,
  requireRole(['super_admin', 'admin']),
  async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { sqlModels } = getModels();

      if (!sqlModels) {
        return res.status(500).json({
          success: false,
          message: 'Database models not available'
        });
      }

      const Category = sqlModels._raw.Category;
      if (!Category) {
        return res.status(500).json({
          success: false,
          message: 'Category model not configured'
        });
      }

      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      await category.destroy();

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });

    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting category',
        error: error.message
      });
    }
  }
);

module.exports = router;
