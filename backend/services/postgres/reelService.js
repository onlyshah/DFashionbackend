/**
 * Reel Service - PostgreSQL Implementation
 * Handles reel-related database operations
 */

const { Reel } = require('../../models_sql');

class ReelServicePostgres {
  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const { count, rows } = await Reel.findAndCountAll({
        offset,
        limit,
        where: filters,
        order: [['createdAt', 'DESC']]
      });
      return { success: true, data: rows, total: count };
    } catch (error) {
      console.error('PostgreSQL: Error fetching reels:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  static async getById(id) {
    try {
      const reel = await Reel.findByPk(id);
      return { success: !!reel, data: reel };
    } catch (error) {
      console.error('PostgreSQL: Error fetching reel:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async create(data) {
    try {
      const reel = await Reel.create(data);
      return { success: true, data: reel };
    } catch (error) {
      console.error('PostgreSQL: Error creating reel:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async update(id, data) {
    try {
      const [updated] = await Reel.update(data, { where: { id } });
      if (!updated) return { success: false, data: null };
      const reel = await Reel.findByPk(id);
      return { success: true, data: reel };
    } catch (error) {
      console.error('PostgreSQL: Error updating reel:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async delete(id) {
    try {
      const deleted = await Reel.destroy({ where: { id } });
      return { success: deleted > 0 };
    } catch (error) {
      console.error('PostgreSQL: Error deleting reel:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ReelServicePostgres;
