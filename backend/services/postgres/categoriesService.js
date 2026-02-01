/**
 * Categories Service - PostgreSQL Implementation
 * Handles category-related database operations
 */

const { Category } = require('../../models_sql');

class CategoriesServicePostgres {
  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const { count, rows } = await Category.findAndCountAll({
        offset,
        limit,
        where: filters,
        order: [['createdAt', 'DESC']]
      });
      return { success: true, data: rows, total: count };
    } catch (error) {
      console.error('PostgreSQL: Error fetching categories:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  static async getById(id) {
    try {
      const category = await Category.findByPk(id);
      return { success: !!category, data: category };
    } catch (error) {
      console.error('PostgreSQL: Error fetching category:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async create(data) {
    try {
      const category = await Category.create(data);
      return { success: true, data: category };
    } catch (error) {
      console.error('PostgreSQL: Error creating category:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async update(id, data) {
    try {
      const [updated] = await Category.update(data, { where: { id } });
      if (!updated) return { success: false, data: null };
      const category = await Category.findByPk(id);
      return { success: true, data: category };
    } catch (error) {
      console.error('PostgreSQL: Error updating category:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async delete(id) {
    try {
      const deleted = await Category.destroy({ where: { id } });
      return { success: deleted > 0 };
    } catch (error) {
      console.error('PostgreSQL: Error deleting category:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = CategoriesServicePostgres;
