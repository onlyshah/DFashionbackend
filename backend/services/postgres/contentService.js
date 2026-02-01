/**
 * Content Service - PostgreSQL Implementation
 * Handles content-related database operations
 */

const { Content } = require('../../models_sql');

class ContentServicePostgres {
  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const { count, rows } = await Content.findAndCountAll({
        offset,
        limit,
        where: filters,
        order: [['createdAt', 'DESC']]
      });
      return { success: true, data: rows, total: count };
    } catch (error) {
      console.error('PostgreSQL: Error fetching content:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  static async getById(id) {
    try {
      const content = await Content.findByPk(id);
      return { success: !!content, data: content };
    } catch (error) {
      console.error('PostgreSQL: Error fetching content:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async create(data) {
    try {
      const content = await Content.create(data);
      return { success: true, data: content };
    } catch (error) {
      console.error('PostgreSQL: Error creating content:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async update(id, data) {
    try {
      const [updated] = await Content.update(data, { where: { id } });
      if (!updated) return { success: false, data: null };
      const content = await Content.findByPk(id);
      return { success: true, data: content };
    } catch (error) {
      console.error('PostgreSQL: Error updating content:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async delete(id) {
    try {
      const deleted = await Content.destroy({ where: { id } });
      return { success: deleted > 0 };
    } catch (error) {
      console.error('PostgreSQL: Error deleting content:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ContentServicePostgres;
