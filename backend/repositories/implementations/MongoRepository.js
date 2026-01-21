/**
 * MongoDB Repository Implementation
 * Implements BaseRepository interface using Mongoose
 */

const BaseRepository = require('../BaseRepository');

class MongoRepository extends BaseRepository {
  constructor(mongoModel) {
    if (!mongoModel) {
      throw new Error('MongoRepository received undefined model');
    }
    if (!mongoModel.collection) {
      throw new Error(`MongoRepository received non-Mongoose model. Expected Mongoose model with .collection property, got: ${mongoModel.constructor.name}`);
    }
    super(mongoModel.collection.name);
    this.model = mongoModel;
  }

  async create(data) {
    try {
      const record = new this.model(data);
      const saved = await record.save();
      return this.mapFields(saved.toObject());
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
        sort = { createdAt: -1 }
      } = options;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [data, total] = await Promise.all([
        this.model.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        this.model.countDocuments(filter)
      ]);

      const mappedData = data.map(record => this.mapFields(record));

      return {
        success: true,
        data: mappedData,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total: total
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch ${this.entityName}: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const record = await this.model.findById(id).lean();
      return record ? this.mapFields(record) : null;
    } catch (error) {
      throw new Error(`Failed to find ${this.entityName} by ID: ${error.message}`);
    }
  }

  async findByFilter(filter) {
    try {
      const records = await this.model.find(filter).lean();
      return records.map(record => this.mapFields(record));
    } catch (error) {
      throw new Error(`Failed to find ${this.entityName} by filter: ${error.message}`);
    }
  }

  async update(id, data) {
    try {
      const updated = await this.model.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true }
      ).lean();
      return updated ? this.mapFields(updated) : null;
    } catch (error) {
      throw new Error(`Failed to update ${this.entityName}: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const result = await this.model.findByIdAndDelete(id);
      return result !== null;
    } catch (error) {
      throw new Error(`Failed to delete ${this.entityName}: ${error.message}`);
    }
  }

  async count(filter = {}) {
    try {
      return await this.model.countDocuments(filter);
    } catch (error) {
      throw new Error(`Failed to count ${this.entityName}: ${error.message}`);
    }
  }

  async updateMany(filter, data) {
    try {
      const result = await this.model.updateMany(filter, { $set: data });
      return result.modifiedCount;
    } catch (error) {
      throw new Error(`Failed to update multiple ${this.entityName}: ${error.message}`);
    }
  }

  async deleteMany(filter) {
    try {
      const result = await this.model.deleteMany(filter);
      return result.deletedCount;
    } catch (error) {
      throw new Error(`Failed to delete multiple ${this.entityName}: ${error.message}`);
    }
  }

  async executeQuery(aggregationPipeline = []) {
    try {
      const results = await this.model.aggregate(aggregationPipeline);
      return results;
    } catch (error) {
      throw new Error(`Aggregation pipeline failed: ${error.message}`);
    }
  }

  mapFields(record) {
    if (!record) return null;
    
    const mapped = { ...record };
    
    // Convert MongoDB _id to id if needed
    if (mapped._id && !mapped.id) {
      mapped.id = mapped._id.toString();
    }
    
    return mapped;
  }
}

module.exports = MongoRepository;
