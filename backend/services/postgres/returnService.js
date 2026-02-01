/**
 * Return Service - PostgreSQL Implementation
 * Handles return-related database operations
 */

const { Return } = require('../../models_sql');

class ReturnServicePostgres {
  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const { count, rows } = await Return.findAndCountAll({
        offset,
        limit,
        where: filters,
        order: [['createdAt', 'DESC']]
      });
      return { success: true, data: rows, total: count };
    } catch (error) {
      console.error('PostgreSQL: Error fetching returns:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  static async getById(id) {
    try {
      const returnRecord = await Return.findByPk(id);
      return { success: !!returnRecord, data: returnRecord };
    } catch (error) {
      console.error('PostgreSQL: Error fetching return:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async create(data) {
    try {
      const returnRecord = await Return.create(data);
      return { success: true, data: returnRecord };
    } catch (error) {
      console.error('PostgreSQL: Error creating return:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async update(id, data) {
    try {
      const [updated] = await Return.update(data, { where: { id } });
      if (!updated) return { success: false, data: null };
      const returnRecord = await Return.findByPk(id);
      return { success: true, data: returnRecord };
    } catch (error) {
      console.error('PostgreSQL: Error updating return:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async delete(id) {
    try {
      const deleted = await Return.destroy({ where: { id } });
      return { success: deleted > 0 };
    } catch (error) {
      console.error('PostgreSQL: Error deleting return:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ReturnServicePostgres;
