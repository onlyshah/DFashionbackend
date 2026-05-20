/**
 * Category Controller - Complete MongoDB Implementation (Phase 3)
 * 5 methods for category management
 */

const Category = require('../models/Category');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Get all categories
 */
exports.getAllCategories = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sort = 'displayOrder' } = req.query;
    
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [categories, total] = await Promise.all([
      Category.find({ isActive: true })
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Category.countDocuments({ isActive: true })
    ]);

    return ApiResponse.success(res, categories, 'Categories retrieved', {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get category by ID
 */
exports.getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid category ID', 400, 'INVALID_ID');
    }

    const category = await Category.findById(id).lean();

    if (!category || !category.isActive) {
      throw new ApiError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }

    return ApiResponse.success(res, category, 'Category retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Create category (Admin only)
 */
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, slug, image, displayOrder } = req.body;

    if (!name || !slug) {
      throw new ApiError('Name and slug are required', 400, 'INVALID_INPUT');
    }

    // Check if slug exists
    const existing = await Category.findOne({ slug });
    if (existing) {
      throw new ApiError('Slug already exists', 400, 'SLUG_EXISTS');
    }

    const category = await Category.create({
      name,
      description,
      slug,
      image,
      displayOrder: displayOrder || 0,
      isActive: true
    });

    return ApiResponse.success(res, category, 'Category created', null, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Update category (Admin only)
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid category ID', 400, 'INVALID_ID');
    }

    // If slug is being updated, check uniqueness
    if (updates.slug) {
      const existing = await Category.findOne({ slug: updates.slug, _id: { $ne: id } });
      if (existing) {
        throw new ApiError('Slug already exists', 400, 'SLUG_EXISTS');
      }
    }

    const category = await Category.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();

    if (!category) {
      throw new ApiError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }

    return ApiResponse.success(res, category, 'Category updated');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Delete category (soft delete)
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid category ID', 400, 'INVALID_ID');
    }

    const category = await Category.findByIdAndUpdate(id, { isActive: false }, { new: true });

    if (!category) {
      throw new ApiError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }

    return ApiResponse.success(res, null, 'Category deleted');
  } catch (error) {
    next(error);
  }
};
