/**
 * Relational Database Repository (PostgreSQL & MySQL)
 * Shared implementation for both PostgreSQL and MySQL using Sequelize ORM
 * Handles both raw Sequelize models and wrapped models
 */

const BaseRepository = require('../BaseRepository');

class RelationalRepository extends BaseRepository {
  constructor(model, tableName) {
    super(tableName);
    
    // Handle wrapped Sequelize models (from models_sql)
    if (model._sequelize) {
      this.model = model._sequelize;
      this.isWrapped = true;
      console.log(`[RelationalRepository] Detected wrapped Sequelize model for ${tableName}`);
    } else {
      this.model = model;
      this.isWrapped = false;
    }
    
    this.tableName = tableName;
    
    // Verify this is actually a Sequelize model
    if (!this.model || !this.model.findAndCountAll) {
      throw new Error(
        `RelationalRepository received non-Sequelize model: ${tableName}. ` +
        `Model must be a valid Sequelize model with findAndCountAll method.`
      );
    }
    
    console.log(`[RelationalRepository] ✅ Initialized for ${tableName}`);
  }

  async create(data) {
    try {
      const record = await this.model.create(data);
      return this.mapFields(record.get({ plain: true }));
    } catch (error) {
      throw new Error(`Failed to create ${this.entityName}: ${error.message}`);
    }
  }

  async findAll(options = {}) {
    try {
      const {
        filter = {},
        page = 1,
        limit = 20,
        sort = { createdAt: 'DESC' }
      } = options;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows } = await this.model.findAndCountAll({
        where: filter,
        limit: parseInt(limit),
        offset: offset,
        order: Object.entries(sort).map(([key, value]) => [key, value]),
        raw: true
      });

      const mappedRows = rows.map(row => this.mapFields(row));

      return {
        success: true,
        data: mappedRows,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(count / parseInt(limit)),
          total: count
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch ${this.entityName}: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const record = await this.model.findByPk(id, { raw: true });
      return record ? this.mapFields(record) : null;
    } catch (error) {
      throw new Error(`Failed to find ${this.entityName} by ID: ${error.message}`);
    }
  }

  async findByFilter(filter) {
    try {
      const records = await this.model.findAll({
        where: filter,
        raw: true
      });
      return records.map(record => this.mapFields(record));
    } catch (error) {
      throw new Error(`Failed to find ${this.entityName} by filter: ${error.message}`);
    }
  }

  async update(id, data) {
    try {
      await this.model.update(data, { where: { id } });
      return await this.findById(id);
    } catch (error) {
      throw new Error(`Failed to update ${this.entityName}: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const result = await this.model.destroy({ where: { id } });
      return result > 0;
    } catch (error) {
      throw new Error(`Failed to delete ${this.entityName}: ${error.message}`);
    }
  }

  async count(filter = {}) {
    try {
      return await this.model.count({ where: filter });
    } catch (error) {
      throw new Error(`Failed to count ${this.entityName}: ${error.message}`);
    }
  }

  async updateMany(filter, data) {
    try {
      const [count] = await this.model.update(data, { where: filter });
      return count;
    } catch (error) {
      throw new Error(`Failed to update multiple ${this.entityName}: ${error.message}`);
    }
  }

  async deleteMany(filter) {
    try {
      return await this.model.destroy({ where: filter });
    } catch (error) {
      throw new Error(`Failed to delete multiple ${this.entityName}: ${error.message}`);
    }
  }

  async executeQuery(query, params = []) {
    try {
      const sequelize = this.model.sequelize;
      const results = await sequelize.query(query, {
        replacements: params,
        type: sequelize.QueryTypes.SELECT
      });
      return results;
    } catch (error) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  mapFields(record) {
    if (!record) return null;
    
    // Convert database field names to entity field names if needed
    const mapped = { ...record };
    
    // Example: if DB uses snake_case and entity uses camelCase
    if (mapped.created_at) mapped.createdAt = mapped.created_at;
    if (mapped.updated_at) mapped.updatedAt = mapped.updated_at;
    if (mapped.user_id) mapped.userId = mapped.user_id;
    
    return mapped;
  }
}

module.exports = RelationalRepository;
