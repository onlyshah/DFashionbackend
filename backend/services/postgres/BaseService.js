/**
 * ============================================================================
 * BASE SERVICE CLASS - PostgreSQL/Sequelize
 * ============================================================================
 * Purpose: Provides common CRUD and utility methods for all services
 * Usage: Extend this class to inherit pagination, filtering, soft deletes
 */

const { Op } = require('sequelize');

class BaseService {
  constructor(model, modelName = 'Unknown') {
    this.model = model;
    this.modelName = modelName;
  }

  /**
   * Paginate query results
   */
  async paginate(where = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      sort = { createdAt: 'DESC' },
      include = [],
      attributes = null
    } = options;

    const offset = (page - 1) * limit;

    const { count, rows } = await this.model.findAndCountAll({
      where,
      include,
      attributes,
      order: Object.entries(sort).map(([key, val]) => [key, val]),
      limit,
      offset,
      distinct: true,
      subQuery: false
    });

    const totalPages = Math.ceil(count / limit);

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Find with filters and search
   */
  async findWithFilters(where = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      sort = { createdAt: 'DESC' },
      include = [],
      attributes = null,
      search = null,
      searchFields = []
    } = options;

    // Add search conditions
    if (search && searchFields.length > 0) {
      where[Op.or] = searchFields.map(field => ({
        [field]: { [Op.iLike]: `%${search}%` }
      }));
    }

    return this.paginate(where, {
      page,
      limit,
      sort,
      include,
      attributes
    });
  }

  /**
   * Create single record
   */
  async create(data) {
    try {
      const record = await this.model.create(data);
      return record;
    } catch (error) {
      throw new Error(`Failed to create ${this.modelName}: ${error.message}`);
    }
  }

  /**
   * Create multiple records
   */
  async bulkCreate(data) {
    try {
      const records = await this.model.bulkCreate(data);
      return records;
    } catch (error) {
      throw new Error(`Failed to bulk create ${this.modelName}: ${error.message}`);
    }
  }

  /**
   * Find by ID with relations
   */
  async findById(id, options = {}) {
    const { include = [], attributes = null } = options;

    const record = await this.model.findByPk(id, {
      include,
      attributes
    });

    if (!record) {
      throw new Error(`${this.modelName} with ID ${id} not found`);
    }

    return record;
  }

  /**
   * Find one record
   */
  async findOne(where = {}, options = {}) {
    const { include = [], attributes = null } = options;

    const record = await this.model.findOne({
      where,
      include,
      attributes
    });

    return record;
  }

  /**
   * Update record
   */
  async update(id, data) {
    try {
      const record = await this.findById(id);
      await record.update(data);
      return record;
    } catch (error) {
      throw new Error(`Failed to update ${this.modelName}: ${error.message}`);
    }
  }

  /**
   * Update with custom where clause
   */
  async updateByWhere(where, data) {
    try {
      const [count, records] = await this.model.update(data, {
        where,
        returning: true
      });
      return { count, records };
    } catch (error) {
      throw new Error(`Failed to update ${this.modelName}: ${error.message}`);
    }
  }

  /**
   * Soft delete (if model supports it)
   */
  async softDelete(id) {
    try {
      const record = await this.findById(id);
      if (record.destroy && this.model.options.paranoid) {
        await record.destroy();
      } else {
        await record.update({ deleted_at: new Date() });
      }
      return { success: true, message: `${this.modelName} deleted` };
    } catch (error) {
      throw new Error(`Failed to delete ${this.modelName}: ${error.message}`);
    }
  }

  /**
   * Hard delete
   */
  async hardDelete(id) {
    try {
      const record = await this.findById(id);
      await record.destroy({ force: true });
      return { success: true, message: `${this.modelName} permanently deleted` };
    } catch (error) {
      throw new Error(`Failed to hard delete ${this.modelName}: ${error.message}`);
    }
  }

  /**
   * Check existence
   */
  async exists(where) {
    const count = await this.model.count({ where });
    return count > 0;
  }

  /**
   * Count records
   */
  async count(where = {}) {
    return await this.model.count({ where });
  }

  /**
   * Handle transaction
   */
  async withTransaction(callback, sequelize = null) {
    // Get sequelize instance
    const seq = sequelize || this.model.sequelize;
    if (!seq) throw new Error('Sequelize instance not available');

    const transaction = await seq.transaction();
    try {
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get all records (with optional limit)
   */
  async getAll(options = {}) {
    const {
      where = {},
      include = [],
      attributes = null,
      limit = 1000,
      sort = { createdAt: 'DESC' }
    } = options;

    return await this.model.findAll({
      where,
      include,
      attributes,
      limit,
      order: Object.entries(sort).map(([key, val]) => [key, val])
    });
  }

  /**
   * Raw query execution
   */
  async rawQuery(sql, replacements = {}) {
    const sequelize = this.model.sequelize;
    if (!sequelize) throw new Error('Sequelize instance not available');

    return await sequelize.query(sql, {
      replacements,
      type: require('sequelize').QueryTypes.SELECT
    });
  }

  /**
   * Restore soft-deleted record
   */
  async restore(id) {
    try {
      const record = await this.model.findByPk(id, { paranoid: false });
      if (!record) {
        throw new Error(`${this.modelName} not found`);
      }
      if (record.restore && this.model.options.paranoid) {
        await record.restore();
      } else {
        await record.update({ deleted_at: null });
      }
      return record;
    } catch (error) {
      throw new Error(`Failed to restore ${this.modelName}: ${error.message}`);
    }
  }
}

module.exports = BaseService;
