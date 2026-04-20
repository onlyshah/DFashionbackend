/**
 * ============================================================================
 * UNIFIED SERVICE TEMPLATE & QUICK REFERENCE
 * ============================================================================
 * 
 * Copy this template for each new unified service
 * Follow the patterns shown here
 * 
 * File: /services/{serviceName}.js
 * 
 * HOW TO USE THIS TEMPLATE:
 * 1. Copy this entire file
 * 2. Replace {ServiceName} with actual service name (PascalCase)
 * 3. Replace {serviceName} with actual service name (camelCase)
 * 4. Replace {Model} with actual model name from adapter
 * 5. Add specific business logic methods
 * 6. Test thoroughly
 * 7. Update controllers to use new service
 * 
 * ============================================================================
 */

const db = require('./adapters');
const BaseService = require('./postgres/BaseService');

/**
 * {ServiceName} Service
 * 
 * Purpose: {Describe what this service does}
 * 
 * Uses: PostgreSQL via adapter (DB-agnostic)
 * 
 * Architecture: Single unified service (replaces mongo + postgres duplicates)
 * 
 * Response Format:
 * {
 *   success: boolean,
 *   data: any,
 *   message?: string,
 *   error?: string,
 *   statusCode?: number,
 *   pagination?: { page, limit, total, totalPages }
 * }
 */
class {ServiceName}Service extends BaseService {
  /**
   * Initialize service with model and related models
   */
  constructor() {
    // Call parent with primary model
    super(db.{Model}, '{ModelName}');
    
    // Store references to related models
    this.RelatedModel1 = db.RelatedModel1;
    this.RelatedModel2 = db.RelatedModel2;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * EXAMPLE BUSINESS LOGIC METHODS
   * ═══════════════════════════════════════════════════════════════════
   */

  /**
   * Get {entity} by ID (Example: getById inherited from BaseService)
   * Usage: await {serviceName}Service.getById(id)
   * 
   * Already provided by BaseService:
   * - findById(id, options)
   * - findOne(where, options)
   * - findAll(where, options)
   * - paginate(where, options)
   * - create(data, options)
   * - update(id, data, options)
   * - delete(id, options)
   * - bulkCreate(data, options)
   * - count(where, options)
   * - exists(where)
   */

  /**
   * Custom Method Example 1: Get with relationships
   * 
   * @param {string} entityId - ID of entity
   * @param {object} options - Query options
   * @returns {object} Standardized response
   */
  async getWithRelations(entityId, options = {}) {
    try {
      // Always ensure models are ready first
      await this.db.ensureModelsReady();

      // Query with relationships
      const entity = await this.model.findByPk(entityId, {
        include: [
          {
            model: this.RelatedModel1,
            as: 'relationshipName1',
            attributes: ['id', 'name'] // Only specific columns if needed
          },
          {
            model: this.RelatedModel2,
            as: 'relationshipName2'
          }
        ],
        ...options
      });

      // Return standardized response
      if (!entity) {
        return {
          success: false,
          error: '{Entity} not found',
          statusCode: 404,
          data: null
        };
      }

      return {
        success: true,
        data: entity,
        message: '{Entity} retrieved successfully'
      };
    } catch (error) {
      // Always log with service name prefix
      console.error('[{ServiceName}Service] getWithRelations error:', error.message);
      return {
        success: false,
        error: error.message,
        statusCode: 500,
        data: null
      };
    }
  }

  /**
   * Custom Method Example 2: Search with filters
   * 
   * @param {object} filters - Search filters
   * @param {object} pagination - Page and limit
   * @returns {object} Paginated response
   */
  async search(filters = {}, pagination = {}) {
    try {
      await this.db.ensureModelsReady();

      const { query, status, category } = filters;
      const { page = 1, limit = 20 } = pagination;

      // Build where clause
      const where = {};

      if (query) {
        // Use Sequelize Op for search
        where[this.Op.or] = [
          { name: { [this.Op.iLike]: `%${query}%` } },
          { description: { [this.Op.iLike]: `%${query}%` } }
        ];
      }

      if (status) {
        where.status = status;
      }

      if (category) {
        where.category_id = category;
      }

      // Use inherited paginate method
      const result = await this.paginate(where, { page, limit });

      return result;
    } catch (error) {
      console.error('[{ServiceName}Service] search error:', error.message);
      return {
        success: false,
        error: error.message,
        statusCode: 500,
        data: [],
        pagination: { page: 1, limit: 0, total: 0, totalPages: 0 }
      };
    }
  }

  /**
   * Custom Method Example 3: Idempotent add operation
   * Adding same item twice should increment, not error
   * 
   * @param {string} parentId - Parent entity ID
   * @param {string} itemId - Item to add
   * @param {number} quantity - Quantity to add
   * @returns {object} Standardized response
   */
  async addItem(parentId, itemId, quantity = 1) {
    try {
      await this.db.ensureModelsReady();

      // Validate parent exists
      const parent = await this.model.findByPk(parentId);
      if (!parent) {
        return { success: false, error: 'Parent not found', statusCode: 404 };
      }

      // Validate item exists
      const item = await this.RelatedModel1.findByPk(itemId);
      if (!item) {
        return { success: false, error: 'Item not found', statusCode: 404 };
      }

      // Check if already exists
      let existing = await this.RelatedModel2.findOne({
        where: {
          parent_id: parentId,
          item_id: itemId
        }
      });

      if (existing) {
        // Idempotent: increment instead of blocking
        existing.quantity += quantity;
        await existing.save();

        return {
          success: true,
          data: existing,
          message: 'Item quantity updated',
          itemExists: true // Flag to inform controller
        };
      }

      // Create new entry
      const newItem = await this.RelatedModel2.create({
        parent_id: parentId,
        item_id: itemId,
        quantity
      });

      return {
        success: true,
        data: newItem,
        message: 'Item added successfully',
        itemExists: false
      };
    } catch (error) {
      console.error('[{ServiceName}Service] addItem error:', error.message);
      return {
        success: false,
        error: error.message,
        statusCode: 500
      };
    }
  }

  /**
   * Custom Method Example 4: Bulk operation
   * 
   * @param {string} parentId - Parent entity ID
   * @param {array} itemIds - Array of item IDs
   * @returns {object} Standardized response
   */
  async addMultiple(parentId, itemIds) {
    try {
      await this.db.ensureModelsReady();

      // Validate parent
      const parent = await this.model.findByPk(parentId);
      if (!parent) {
        return { success: false, error: 'Parent not found', statusCode: 404 };
      }

      // Add all items
      const results = [];
      for (const itemId of itemIds) {
        const result = await this.addItem(parentId, itemId);
        results.push(result);
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return {
        success: failed === 0,
        data: results,
        message: `${successful} added, ${failed} failed`,
        summary: { successful, failed }
      };
    } catch (error) {
      console.error('[{ServiceName}Service] addMultiple error:', error.message);
      return {
        success: false,
        error: error.message,
        statusCode: 500
      };
    }
  }

  /**
   * Custom Method Example 5: Idempotent delete
   * Deleting non-existent item should not error
   * 
   * @param {string} parentId - Parent entity ID
   * @param {string} itemId - Item to remove
   * @returns {object} Standardized response
   */
  async removeItem(parentId, itemId) {
    try {
      await this.db.ensureModelsReady();

      const item = await this.RelatedModel2.findOne({
        where: {
          parent_id: parentId,
          item_id: itemId
        }
      });

      if (!item) {
        // Idempotent: return success even if not found
        return {
          success: true,
          message: 'Item not found or already removed',
          statusCode: 404 // Informational only
        };
      }

      await item.destroy();

      return {
        success: true,
        message: 'Item removed successfully'
      };
    } catch (error) {
      console.error('[{ServiceName}Service] removeItem error:', error.message);
      return {
        success: false,
        error: error.message,
        statusCode: 500
      };
    }
  }
}

// Export singleton instance
module.exports = new {ServiceName}Service();

/**
 * ============================================================================
 * HOW TO USE THIS SERVICE IN CONTROLLERS
 * ============================================================================
 * 
 * // In controllers/{something}Controller.js
 * 
 * const {serviceName}Service = require('../services/{serviceName}Service');
 * 
 * // Example 1: Simple get
 * exports.get{Entity} = async (req, res) => {
 *   const result = await {serviceName}Service.getWithRelations(req.params.id);
 *   
 *   if (!result.success) {
 *     return res.status(result.statusCode || 500).json(result);
 *   }
 *   
 *   res.json(result);
 * };
 * 
 * // Example 2: Add item (idempotent)
 * exports.add{Item} = async (req, res) => {
 *   const { parentId, itemId, quantity } = req.body;
 *   const result = await {serviceName}Service.addItem(parentId, itemId, quantity);
 *   
 *   if (!result.success) {
 *     return res.status(result.statusCode || 500).json(result);
 *   }
 *   
 *   // Handle idempotent response
 *   const statusCode = result.itemExists ? 200 : 201;
 *   res.status(statusCode).json(result);
 * };
 * 
 * // Example 3: Search
 * exports.search = async (req, res) => {
 *   const { query, status } = req.query;
 *   const { page = 1, limit = 20 } = req.query;
 *   
 *   const result = await {serviceName}Service.search(
 *     { query, status },
 *     { page, limit }
 *   );
 *   
 *   res.json(result);
 * };
 * 
 * ============================================================================
 * TESTING CHECKLIST
 * ============================================================================
 * 
 * [ ] Happy path works (create, read, update, delete)
 * [ ] Idempotent operations work (add twice = increment, not error)
 * [ ] Error handling works (missing fields, non-existent IDs)
 * [ ] Pagination works (correct offset, limit, total)
 * [ ] Relationships load correctly (include, as)
 * [ ] All status codes correct (200, 201, 400, 404, 500)
 * [ ] Logging appears correctly ('[ServiceName]' prefix)
 * [ ] Response format standardized (success, data, message, error)
 * [ ] Controllers handle responses correctly
 * [ ] npm start runs without errors
 * [ ] All tests passing
 * 
 * ============================================================================
 */
