const express = require('express');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { auth, optionalAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Try PostgreSQL first
    try {
      const models = require('../models_sql');
      const CategoryModel = models._raw.Category;
      
      if (CategoryModel) {
        const categories = await CategoryModel.findAll({
          where: { isActive: true || null },
          order: [['name', 'ASC']],
          raw: true
        });

        return res.json({
          success: true,
          data: categories || []
        });
      }
    } catch (pgErr) {
      console.log('PostgreSQL Category not available, trying MongoDB...');
    }

    // Fallback to MongoDB
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 });

    // Add product count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({ 
          category: category._id,
          isActive: true 
        });
        return {
          ...category.toObject(),
          productCount
        };
      })
    );

    res.json({
      success: true,
      data: categoriesWithCount
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/categories/:slug
// @desc    Get category by slug
// @access  Public
router.get('/:slug', async (req, res) => {
  try {
    const category = await Category.findOne({ 
      slug: req.params.slug,
      isActive: true 
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get product count
    const productCount = await Product.countDocuments({ 
      category: category.slug,
      isActive: true 
    });

    res.json({
      success: true,
      data: {
        ...category.toObject(),
        productCount
      }
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/categories/:slug/products
// @desc    Get products by category
// @access  Public
router.get('/:slug/products', async (req, res) => {
  try {
    const { page = 1, limit = 12, sort = 'createdAt', order = 'desc' } = req.query;
    const skip = (page - 1) * limit;

    // Check if category exists
    const category = await Category.findOne({ 
      slug: req.params.slug,
      isActive: true 
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Build sort object
    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;

    // Get products
    const products = await Product.find({ 
      category: req.params.slug,
      isActive: true 
    })
    .populate('vendor', 'username fullName')
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit));

    // Get total count
    const total = await Product.countDocuments({ 
      category: req.params.slug,
      isActive: true 
    });

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      category: {
        name: category.name,
        slug: category.slug,
        description: category.description
      }
    });
  } catch (error) {
    console.error('Get category products error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Middleware to check category creation permission
const checkCategoryPermission = async (req, res, next) => {
  try {
    // Super admin always has permission
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Check if user's role has category creation permission
    const Role = require('../models/Role');
    const Module = require('../models/Module');

    const userRole = await Role.findOne({ name: req.user.role })
      .populate('modulePermissions.module');

    if (!userRole) {
      return res.status(403).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Find category module
    const categoryModule = await Module.findOne({ name: 'categories' });
    if (!categoryModule) {
      return res.status(403).json({
        success: false,
        message: 'Category module not found'
      });
    }

    // Check if role has create permission for categories
    const hasPermission = userRole.hasModulePermission(categoryModule._id, 'create');

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to create categories.'
      });
    }

    next();
  } catch (error) {
    console.error('Category permission check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @route   POST /api/categories
// @desc    Create new category (Super Admin or Permitted Roles)
// @access  Private/Super Admin or Permitted Roles
router.post('/', auth, checkCategoryPermission, async (req, res) => {
  try {

    const {
      name,
      slug,
      description,
      image,
      icon,
      subcategories,
      seo
    } = req.body;

    // Check if category already exists
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this slug already exists'
      });
    }

    const category = new Category({
      name,
      slug,
      description,
      image,
      icon,
      subcategories,
      seo,
      isActive: true,
      isFeatured: false,
      sortOrder: await Category.countDocuments() + 1
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/categories/:id
// @desc    Update category (Admin only)
// @access  Private/Admin
router.put('/:id', auth, requireRole(['admin','super_admin']), async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete category (Admin only)
// @access  Private/Admin
router.delete('/:id', auth, requireRole(['admin','super_admin']), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has products
    const productCount = await Product.countDocuments({ category: category.slug });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with existing products'
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;
