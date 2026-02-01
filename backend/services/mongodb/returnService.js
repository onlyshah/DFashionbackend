/**
 * Return Service - MongoDB Implementation
 * Handles return-related database operations
 */

const Return = require('../../models/Return');

class ReturnServiceMongoDB {
  static async getAll(filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        Return.find(filters).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Return.countDocuments(filters)
      ]);
      return { success: true, data, total };
    } catch (error) {
      console.error('MongoDB: Error fetching returns:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  static async getById(id) {
    try {
      const returnRecord = await Return.findById(id);
      return { success: !!returnRecord, data: returnRecord };
    } catch (error) {
      console.error('MongoDB: Error fetching return:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async create(data) {
    try {
      const returnRecord = await Return.create(data);
      return { success: true, data: returnRecord };
    } catch (error) {
      console.error('MongoDB: Error creating return:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async update(id, data) {
    try {
      const returnRecord = await Return.findByIdAndUpdate(id, data, { new: true });
      return { success: !!returnRecord, data: returnRecord };
    } catch (error) {
      console.error('MongoDB: Error updating return:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async delete(id) {
    try {
      const result = await Return.findByIdAndDelete(id);
      return { success: !!result };
    } catch (error) {
      console.error('MongoDB: Error deleting return:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ReturnServiceMongoDB;
