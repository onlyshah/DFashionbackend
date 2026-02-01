/**
 * Categories Service - MongoDB Implementation
 * Handles category-related database operations
 */

const Category = require('../../models/Category');

class CategoriesServiceMongoDB {
  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        Category.find(filters).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Category.countDocuments(filters)
      ]);
      return { success: true, data, total };
    } catch (error) {
      console.error('MongoDB: Error fetching categories:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  static async getById(id) {
    try {
      const category = await Category.findById(id);
      return { success: !!category, data: category };
    } catch (error) {
      console.error('MongoDB: Error fetching category:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async create(data) {
    try {
      const category = await Category.create(data);
      return { success: true, data: category };
    } catch (error) {
      console.error('MongoDB: Error creating category:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async update(id, data) {
    try {
      const category = await Category.findByIdAndUpdate(id, data, { new: true });
      return { success: !!category, data: category };
    } catch (error) {
      console.error('MongoDB: Error updating category:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async delete(id) {
    try {
      const result = await Category.findByIdAndDelete(id);
      return { success: !!result };
    } catch (error) {
      console.error('MongoDB: Error deleting category:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = CategoriesServiceMongoDB;
