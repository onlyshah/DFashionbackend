const mongoose = require('mongoose');
const validator = require('validator');

class DatabaseSecurity {
  
  /**
   * Sanitize MongoDB query to prevent NoSQL injection
   */
  static sanitizeQuery(query) {
    if (typeof query !== 'object' || query === null) {
      return query;
    }

    const sanitized = {};
    
    for (const [key, value] of Object.entries(query)) {
      // Remove dangerous operators
      if (key.startsWith('$') && !this.isAllowedOperator(key)) {
        console.warn(`Blocked dangerous MongoDB operator: ${key}`);
        continue;
      }

      // Sanitize nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeQuery(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'object' ? this.sanitizeQuery(item) : this.sanitizeValue(item)
        );
      } else {
        sanitized[key] = this.sanitizeValue(value);
      }
    }

    return sanitized;
  }

  /**
   * Check if MongoDB operator is allowed
   */
  static isAllowedOperator(operator) {
    const allowedOperators = [
      '$eq', '$ne', '$gt', '$gte', '$lt', '$lte',
      '$in', '$nin', '$exists', '$type', '$regex',
      '$and', '$or', '$not', '$nor',
      '$elemMatch', '$size', '$all',
      '$text', '$search'
    ];
    
    return allowedOperators.includes(operator);
  }

  /**
   * Sanitize individual values
   */
  static sanitizeValue(value) {
    if (typeof value === 'string') {
      // Remove null bytes and control characters
      return value.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
    }
    
    return value;
  }

  /**
   * Validate ObjectId
   */
  static validateObjectId(id) {
    if (!id) {
      throw new Error('ID is required');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid ID format');
    }

    return new mongoose.Types.ObjectId(id);
  }

  /**
   * Create secure aggregation pipeline
   */
  static createSecureAggregation(pipeline) {
    const securePipeline = [];
    
    for (const stage of pipeline) {
      if (typeof stage !== 'object' || stage === null) {
        continue;
      }

      const stageKeys = Object.keys(stage);
      const stageKey = stageKeys[0];

      // Block dangerous aggregation stages
      if (this.isDangerousAggregationStage(stageKey)) {
        console.warn(`Blocked dangerous aggregation stage: ${stageKey}`);
        continue;
      }

      // Sanitize stage content
      const sanitizedStage = {};
      sanitizedStage[stageKey] = this.sanitizeQuery(stage[stageKey]);
      securePipeline.push(sanitizedStage);
    }

    return securePipeline;
  }

  /**
   * Check if aggregation stage is dangerous
   */
  static isDangerousAggregationStage(stage) {
    const dangerousStages = [
      '$out', '$merge', '$planCacheStats',
      '$collStats', '$indexStats', '$currentOp'
    ];
    
    return dangerousStages.includes(stage);
  }

  /**
   * Secure find query with pagination and limits
   */
  static secureFind(Model, query = {}, options = {}) {
    // Sanitize query
    const sanitizedQuery = this.sanitizeQuery(query);
    
    // Apply default limits
    const limit = Math.min(options.limit || 20, 100); // Max 100 items
    const skip = Math.max(options.skip || 0, 0);
    const sort = options.sort || { createdAt: -1 };

    // Build secure query
    let mongoQuery = Model.find(sanitizedQuery);

    // Apply pagination
    mongoQuery = mongoQuery.limit(limit).skip(skip);

    // Apply sorting (sanitize sort object)
    if (typeof sort === 'object') {
      const sanitizedSort = this.sanitizeQuery(sort);
      mongoQuery = mongoQuery.sort(sanitizedSort);
    }

    // Apply field selection if provided
    if (options.select) {
      mongoQuery = mongoQuery.select(options.select);
    }

    // Apply population if provided
    if (options.populate) {
      if (Array.isArray(options.populate)) {
        options.populate.forEach(pop => mongoQuery = mongoQuery.populate(pop));
      } else {
        mongoQuery = mongoQuery.populate(options.populate);
      }
    }

    return mongoQuery;
  }

  /**
   * Secure update operation
   */
  static secureUpdate(Model, filter, update, options = {}) {
    // Sanitize filter and update
    const sanitizedFilter = this.sanitizeQuery(filter);
    const sanitizedUpdate = this.sanitizeUpdateObject(update);

    // Prevent updating sensitive fields
    const protectedFields = ['_id', '__v', 'createdAt'];
    protectedFields.forEach(field => {
      if (sanitizedUpdate[field] !== undefined) {
        delete sanitizedUpdate[field];
        console.warn(`Removed protected field from update: ${field}`);
      }
    });

    // Apply security options
    const secureOptions = {
      ...options,
      runValidators: true,
      new: options.new !== false // Default to returning new document
    };

    return Model.findOneAndUpdate(sanitizedFilter, sanitizedUpdate, secureOptions);
  }

  /**
   * Sanitize update object
   */
  static sanitizeUpdateObject(update) {
    if (typeof update !== 'object' || update === null) {
      return update;
    }

    const sanitized = {};
    
    for (const [key, value] of Object.entries(update)) {
      // Allow specific update operators
      if (key.startsWith('$')) {
        if (this.isAllowedUpdateOperator(key)) {
          sanitized[key] = this.sanitizeQuery(value);
        } else {
          console.warn(`Blocked dangerous update operator: ${key}`);
        }
      } else {
        sanitized[key] = this.sanitizeValue(value);
      }
    }

    return sanitized;
  }

  /**
   * Check if update operator is allowed
   */
  static isAllowedUpdateOperator(operator) {
    const allowedOperators = [
      '$set', '$unset', '$inc', '$mul',
      '$push', '$pull', '$addToSet',
      '$currentDate', '$min', '$max'
    ];
    
    return allowedOperators.includes(operator);
  }

  /**
   * Secure delete operation
   */
  static secureDelete(Model, filter, options = {}) {
    const sanitizedFilter = this.sanitizeQuery(filter);
    
    // Soft delete by default
    if (options.softDelete !== false) {
      return this.secureUpdate(Model, sanitizedFilter, {
        $set: { 
          isDeleted: true, 
          deletedAt: new Date() 
        }
      });
    }
    
    return Model.findOneAndDelete(sanitizedFilter);
  }

  /**
   * Create database connection with security options
   */
  static createSecureConnection(uri, options = {}) {
    const secureOptions = {
      ...options,
      // Security options
      authSource: 'admin',
      ssl: process.env.NODE_ENV === 'production',
      sslValidate: process.env.NODE_ENV === 'production',
      
      // Connection pool settings
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      
      // Monitoring
      monitorCommands: true,
      
      // Buffer settings
      bufferMaxEntries: 0,
      bufferCommands: false
    };

    return mongoose.createConnection(uri, secureOptions);
  }

  /**
   * Validate and sanitize search query
   */
  static sanitizeSearchQuery(searchQuery) {
    if (!searchQuery || typeof searchQuery !== 'string') {
      return '';
    }

    // Remove dangerous patterns
    let sanitized = searchQuery
      .replace(/[\$\{\}]/g, '') // Remove MongoDB operators
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();

    // Limit length
    sanitized = sanitized.substring(0, 100);

    // Escape special regex characters for safe regex search
    sanitized = sanitized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    return sanitized;
  }

  /**
   * Create secure text search query
   */
  static createTextSearchQuery(searchTerm, fields = []) {
    const sanitizedTerm = this.sanitizeSearchQuery(searchTerm);
    
    if (!sanitizedTerm) {
      return {};
    }

    if (fields.length === 0) {
      // Use MongoDB text search if no specific fields
      return { $text: { $search: sanitizedTerm } };
    }

    // Create regex search for specific fields
    const regexQuery = new RegExp(sanitizedTerm, 'i');
    const orConditions = fields.map(field => ({
      [field]: regexQuery
    }));

    return { $or: orConditions };
  }

  /**
   * Monitor database operations for security events
   */
  static setupSecurityMonitoring() {
    // Monitor slow queries
    mongoose.connection.on('commandStarted', (event) => {
      if (event.commandName === 'find' || event.commandName === 'aggregate') {
        const startTime = Date.now();
        
        mongoose.connection.on('commandSucceeded', (successEvent) => {
          if (successEvent.requestId === event.requestId) {
            const duration = Date.now() - startTime;
            if (duration > 5000) { // Log queries taking more than 5 seconds
              console.warn(`Slow query detected: ${event.commandName} took ${duration}ms`);
            }
          }
        });
      }
    });

    // Monitor failed operations
    mongoose.connection.on('commandFailed', (event) => {
      console.error(`Database operation failed: ${event.commandName}`, event.failure);
    });

    console.log('✅ Database security monitoring enabled');
  }

  /**
   * Validate schema for security
   */
  static validateSchema(schema) {
    const securityIssues = [];

    // Check for missing validation
    schema.eachPath((pathname, schematype) => {
      if (pathname === '_id' || pathname === '__v') return;

      if (schematype instanceof mongoose.Schema.Types.String) {
        if (!schematype.options.maxlength) {
          securityIssues.push(`String field '${pathname}' missing maxlength validation`);
        }
      }

      if (schematype instanceof mongoose.Schema.Types.Number) {
        if (!schematype.options.min && !schematype.options.max) {
          securityIssues.push(`Number field '${pathname}' missing min/max validation`);
        }
      }
    });

    return securityIssues;
  }
}

module.exports = DatabaseSecurity;
