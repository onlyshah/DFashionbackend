/**
 * Compliance Service - PostgreSQL Implementation
 * Handles compliance-related database operations
 */

const { Compliance } = require('../../models_sql');

class ComplianceServicePostgres {
  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const { count, rows } = await Compliance.findAndCountAll({
        offset,
        limit,
        where: filters,
        order: [['createdAt', 'DESC']]
      });
      return { success: true, data: rows, total: count };
    } catch (error) {
      console.error('PostgreSQL: Error fetching compliance records:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  static async getById(id) {
    try {
      const compliance = await Compliance.findByPk(id);
      return { success: !!compliance, data: compliance };
    } catch (error) {
      console.error('PostgreSQL: Error fetching compliance record:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async create(data) {
    try {
      const compliance = await Compliance.create(data);
      return { success: true, data: compliance };
    } catch (error) {
      console.error('PostgreSQL: Error creating compliance record:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async update(id, data) {
    try {
      const [updated] = await Compliance.update(data, { where: { id } });
      if (!updated) return { success: false, data: null };
      const compliance = await Compliance.findByPk(id);
      return { success: true, data: compliance };
    } catch (error) {
      console.error('PostgreSQL: Error updating compliance record:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async delete(id) {
    try {
      const deleted = await Compliance.destroy({ where: { id } });
      return { success: deleted > 0 };
    } catch (error) {
      console.error('PostgreSQL: Error deleting compliance record:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ComplianceServicePostgres;
