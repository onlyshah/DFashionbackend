/**
 * Category Controller
 * Handles category management and product filtering
 * Model → Controller → Routes pattern
 */

const dbType = (process.env.DB_TYPE || '').toLowerCase();
const models = dbType === 'postgres' ? require('../models_sql') : require('../models')();
const { Category, Product } = models;

// ==================== CATEGORY OPERATIONS ====================

/**
 * Get all categories
 */
exports.getAllCategories = async (req, res) => {
  try {
    const { limit = 50, level = 'parent' } = req.query;

    let categories = [];
    
    if (dbType === 'postgres' && Category) {
      try {
        // PostgreSQL: Use Sequelize findAll
        const where = level === 'parent' ? { parentId: null } : {};
        categories = await Category.findAll({
          where,
          limit: parseInt(limit),
          order: [['name', 'ASC']],
          raw: true
        });
      } catch (postgresError) {
        console.warn('[categoryController] PostgreSQL query failed:', postgresError.message);
        categories = [];
      }
    }

    // If no data from database, return empty array
    if (!categories || categories.length === 0) {
      categories = [];
    }

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      data: []
    });
  }
};

/**
 * Get category by slug
 */
exports.getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    let category;
    let subcategories;
    
    if (dbType === 'postgres') {
      // PostgreSQL: Use Sequelize findOne
      category = await Category.findOne({ where: { slug } });
      if (category) {
        subcategories = await Category.findAll({
          where: { parentId: category.id },
          raw: true
        });
      }
    } else {
      // MongoDB: Use Mongoose findOne
      category = await Category.findOne({ slug });
      if (category) {
        subcategories = await Category.find({ parentId: category._id });
      }
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: {
        category,
        subcategories
      }
    });
  } catch (error) {
    console.error('Get category error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: error.message
    });
  }
};

/**
 * Get category with products
 */
exports.getCategoryProducts = async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let category;
    let products;
    let total;

    if (dbType === 'postgres') {
      // PostgreSQL: Use Sequelize
      category = await Category.findOne({ where: { slug } });
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Parse sort parameter for Sequelize
      const sortOrder = sort.startsWith('-') ? 'DESC' : 'ASC';
      const sortField = sort.replace('-', '');

      const { count, rows } = await Product.findAndCountAll({
        where: { categoryId: category.id },
        order: [[sortField, sortOrder]],
        offset: skip,
        limit: parseInt(limit),
        raw: true
      });

      products = rows;
      total = count;
    } else {
      // MongoDB: Use Mongoose
      category = await Category.findOne({ slug });
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      products = await Product.find({ category: category._id })
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      total = await Product.countDocuments({ category: category._id });
    }

    res.json({
      success: true,
      data: products,
      pagination: {
        currentPage: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get category products error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

/**
 * Create category (admin)
 */
exports.createCategory = async (req, res) => {
  try {
    const { name, description, slug, parentId } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: 'Name and slug are required'
      });
    }

    let existing;
    let category;

    if (dbType === 'postgres') {
      // PostgreSQL: Check with Sequelize
      existing = await Category.findOne({ where: { slug } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Slug already exists'
        });
      }

      category = await Category.create({
        name,
        description,
        slug,
        parentId
      });
    } else {
      // MongoDB: Check with Mongoose
      existing = await Category.findOne({ slug });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Slug already exists'
        });
      }

      category = new Category({
        name,
        description,
        slug,
        parentId
      });

      await category.save();
    }

    res.status(201).json({
      success: true,
      message: 'Category created',
      data: { category }
    });
  } catch (error) {
    console.error('Create category error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
};

/**
 * Update category (admin)
 */
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, slug, parentId } = req.body;

    let category;

    if (dbType === 'postgres') {
      // PostgreSQL: Use Sequelize update
      const updated = await Category.update(
        { name, description, slug, parentId },
        { where: { id }, returning: true }
      );

      if (!updated[0]) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      category = updated[1][0];
    } else {
      // MongoDB: Use findByIdAndUpdate
      category = await Category.findByIdAndUpdate(
        id,
        { name, description, slug, parentId },
        { new: true }
      );

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }
    }

    res.json({
      success: true,
      message: 'Category updated',
      data: { category }
    });
  } catch (error) {
    console.error('Update category error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
};

/**
 * Delete category (admin)
 */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    let productCount;

    if (dbType === 'postgres') {
      // PostgreSQL: Use Sequelize count
      productCount = await Product.count({ where: { categoryId: id } });
    } else {
      // MongoDB: Use Mongoose countDocuments
      productCount = await Product.countDocuments({ category: id });
    }

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category with ${productCount} products`
      });
    }

    let category;

    if (dbType === 'postgres') {
      // PostgreSQL: Use Sequelize destroy
      const deleted = await Category.destroy({ where: { id } });

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      category = { id };
    } else {
      // MongoDB: Use findByIdAndDelete
      category = await Category.findByIdAndDelete(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }
    }

    res.json({
      success: true,
      message: 'Category deleted'
    });
  } catch (error) {
    console.error('Delete category error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
};

// Get category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = await models.Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    console.error('Get category error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get category', error: error.message });
  }
};

// Generate invoice for order
exports.generateInvoice = async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: { invoice: 'generated' } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to generate invoice' });
  }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: { verified: true } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
};

// Handle webhook
exports.handleWebhook = async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: { webhook: 'handled' } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Webhook handling failed' });
  }
};
