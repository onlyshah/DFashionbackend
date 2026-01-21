/**
 * Base Repository Interface
 * Defines CRUD contract that all database implementations must follow
 * Ensures consistent method signatures across PostgreSQL, MySQL, and MongoDB
 */

class BaseRepository {
  constructor(entityName) {
    this.entityName = entityName;
    if (new.target === BaseRepository) {
      throw new TypeError("Cannot instantiate abstract class BaseRepository directly");
    }
  }

  /**
   * Create a single record
   * @param {Object} data - Record data
   * @returns {Promise<Object>} Created record with ID
   */
  async create(data) {
    throw new Error(`create() not implemented in ${this.constructor.name}`);
  }

  /**
   * Find all records with optional filters and pagination
   * @param {Object} options - { filter, page, limit, sort }
   * @returns {Promise<Object>} { data, total, page, pages }
   */
  async findAll(options = {}) {
    throw new Error(`findAll() not implemented in ${this.constructor.name}`);
  }

  /**
   * Find single record by ID
   * @param {string|number} id - Record ID
   * @returns {Promise<Object|null>} Record or null
   */
  async findById(id) {
    throw new Error(`findById() not implemented in ${this.constructor.name}`);
  }

  /**
   * Find records matching filter
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Array>} Matching records
   */
  async findByFilter(filter) {
    throw new Error(`findByFilter() not implemented in ${this.constructor.name}`);
  }

  /**
   * Update single record by ID
   * @param {string|number} id - Record ID
   * @param {Object} data - Fields to update
   * @returns {Promise<Object>} Updated record
   */
  async update(id, data) {
    throw new Error(`update() not implemented in ${this.constructor.name}`);
  }

  /**
   * Delete single record by ID
   * @param {string|number} id - Record ID
   * @returns {Promise<boolean>} Success indicator
   */
  async delete(id) {
    throw new Error(`delete() not implemented in ${this.constructor.name}`);
  }

  /**
   * Count records matching filter
   * @param {Object} filter - Filter criteria
   * @returns {Promise<number>} Total count
   */
  async count(filter = {}) {
    throw new Error(`count() not implemented in ${this.constructor.name}`);
  }

  /**
   * Update multiple records matching filter
   * @param {Object} filter - Filter criteria
   * @param {Object} data - Fields to update
   * @returns {Promise<number>} Count of updated records
   */
  async updateMany(filter, data) {
    throw new Error(`updateMany() not implemented in ${this.constructor.name}`);
  }

  /**
   * Delete multiple records matching filter
   * @param {Object} filter - Filter criteria
   * @returns {Promise<number>} Count of deleted records
   */
  async deleteMany(filter) {
    throw new Error(`deleteMany() not implemented in ${this.constructor.name}`);
  }

  /**
   * Execute custom query (for complex operations)
   * @param {string} query - Query string
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} Query results
   */
  async executeQuery(query, params = []) {
    throw new Error(`executeQuery() not implemented in ${this.constructor.name}`);
  }

  /**
   * Format response consistently across databases
   * @param {Object|Array} data - Raw database result
   * @param {Object} options - Formatting options
   * @returns {Object|Array} Formatted data
   */
  formatResponse(data, options = {}) {
    return data;
  }

  /**
   * Map database field names to entity field names
   * Useful for differences between DB schemas
   * @param {Object} record - Raw database record
   * @returns {Object} Mapped record
   */
  mapFields(record) {
    return record;
  }
}

module.exports = BaseRepository;
