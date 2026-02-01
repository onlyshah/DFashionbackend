/**
 * Story Service - PostgreSQL Implementation
 * Handles story-related database operations
 */

const { Story } = require('../../models_sql');

class StoryServicePostgres {
  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const { count, rows } = await Story.findAndCountAll({
        offset,
        limit,
        where: filters,
        order: [['createdAt', 'DESC']]
      });
      return { success: true, data: rows, total: count };
    } catch (error) {
      console.error('PostgreSQL: Error fetching stories:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  static async getById(id) {
    try {
      const story = await Story.findByPk(id);
      return { success: !!story, data: story };
    } catch (error) {
      console.error('PostgreSQL: Error fetching story:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async create(data) {
    try {
      const story = await Story.create(data);
      return { success: true, data: story };
    } catch (error) {
      console.error('PostgreSQL: Error creating story:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async update(id, data) {
    try {
      const [updated] = await Story.update(data, { where: { id } });
      if (!updated) return { success: false, data: null };
      const story = await Story.findByPk(id);
      return { success: true, data: story };
    } catch (error) {
      console.error('PostgreSQL: Error updating story:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async delete(id) {
    try {
      const deleted = await Story.destroy({ where: { id } });
      return { success: deleted > 0 };
    } catch (error) {
      console.error('PostgreSQL: Error deleting story:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = StoryServicePostgres;
